import { useEffect, useRef, useState } from "react";
import {
  predictFrame,
  predictFrames,
  resetDynamicState,
  type Prediction,
  type SignMode,
  type DetectionMode,
} from "../lib/aslClient";
import { SentenceBuilder } from "../asl/SentenceBuilder";

export interface UseFrameCaptureOptions {
  fps?: number;
  jpegQuality?: number;
  mode?: SignMode;
  detectionMode?: DetectionMode;
}

export interface UseFrameCaptureResult {
  sentence: string;
  lastPrediction: Prediction | null;
  fps: number;
  clearSentence: () => void;
  backspace: () => void;
  appendSpace: () => void;
}

const DEFAULT_FPS = 12;
const DEFAULT_JPEG_QUALITY = 0.78;

/** Concurrent requests allowed in alphabet mode (each frame is independent). */
const ALPHABET_MAX_PENDING = 3;

/**
 * Most frames the words-mode buffer may hold (~2 seconds at 12fps).
 *
 * Reaching this cap means the server cannot process frames as fast as the
 * camera produces them, which is a CPU problem on the server rather than a
 * latency problem — batching cannot fix it, so the oldest frames are dropped
 * and a warning is logged.
 */
const MAX_BUFFERED_FRAMES = 24;

export function useFrameCapture(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isActive: boolean,
  options: UseFrameCaptureOptions = {},
): UseFrameCaptureResult {
  const fps           = options.fps           ?? DEFAULT_FPS;
  const jpegQuality   = options.jpegQuality   ?? DEFAULT_JPEG_QUALITY;
  const mode          = options.mode          ?? "asl";
  const detectionMode = options.detectionMode ?? "alphabet";

  const [sentence,       setSentence]       = useState("");
  const [lastPrediction, setLastPrediction] = useState<Prediction | null>(null);
  const [liveFps,        setLiveFps]        = useState(0);

  const builderRef    = useRef<SentenceBuilder | null>(null);
  const canvasRef     = useRef<HTMLCanvasElement | null>(null);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef    = useRef(0);                 // in-flight requests
  const bufferRef     = useRef<string[]>([]);      // words mode: frames awaiting send
  const rateRef       = useRef<{ t: number; n: number }[]>([]);
  const wordLockRef   = useRef(false);
  const wordLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isWords = detectionMode === "words";

  if (!builderRef.current) builderRef.current = new SentenceBuilder();
  if (!canvasRef.current)  canvasRef.current  = document.createElement("canvas");

  const clearSentence = () => { builderRef.current?.clear(); setSentence(""); };
  const backspace     = () => { builderRef.current?.backspace(); setSentence(builderRef.current?.sentence ?? ""); };
  const appendSpace   = () => { builderRef.current?.appendSpace(); setSentence(builderRef.current?.sentence ?? ""); };

  useEffect(() => {
    if (!isActive) return;

    const video   = videoRef.current;
    const canvas  = canvasRef.current;
    const builder = builderRef.current;
    if (!video || !canvas || !builder) return;

    // Clear frames left in the server-side buffer from a previous session,
    // otherwise the first sign is classified against stale motion history.
    if (isWords) void resetDynamicState();

    bufferRef.current = [];
    rateRef.current   = [];

    /** Record how many frames actually reached the server, and how fast. */
    const recordDelivered = (n: number) => {
      const samples = rateRef.current;
      samples.push({ t: performance.now(), n });
      if (samples.length > 12) samples.shift();
      if (samples.length >= 2) {
        const span = samples[samples.length - 1].t - samples[0].t;
        const total = samples.slice(1).reduce((a, s) => a + s.n, 0);
        setLiveFps(span > 0 ? (total * 1000) / span : 0);
      }
    };

    const grabFrame = (): string | null => {
      if (video.readyState < 2 || video.videoWidth === 0) return null;

      if (canvas.width  !== video.videoWidth)  canvas.width  = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", jpegQuality);
    };

    const applyPrediction = (prediction: Prediction | null) => {
      if (!prediction) return;
      if ((prediction.hand_count ?? 0) > 1) return;

      // Server is still accumulating frames for the current sign — a status
      // ping, not a prediction. Never feed it to the builder.
      if (prediction.collecting) {
        setLastPrediction(prediction);
        return;
      }

      if (prediction.is_word_sign) {
        builder.sentence += prediction.label + " ";
        setLastPrediction(prediction);
        setSentence(builder.sentence);

        // Lock display briefly so letters don't override the word
        wordLockRef.current = true;
        if (wordLockTimer.current) clearTimeout(wordLockTimer.current);
        wordLockTimer.current = setTimeout(() => {
          wordLockRef.current = false;
        }, 2000);

      } else if (!isWords && !wordLockRef.current) {
        // Letters only ever enter the sentence in alphabet mode.
        builder.update(prediction.label, prediction.confidence);
        setLastPrediction(prediction);
        setSentence((prev) => prev === builder.sentence ? prev : builder.sentence);
      }
    };

    // ── Words mode ────────────────────────────────────────────────────────────
    // Capture runs at a fixed rate into a buffer; whenever the connection is
    // free, everything buffered ships as one batch. The server therefore sees
    // every frame at capture spacing no matter how slow the round trip is.
    // Sending one frame per request instead would pin the frame rate to
    // 1 / round-trip-time and force the signer to move unnaturally slowly.
    const drainBuffer = () => {
      if (pendingRef.current > 0) return;
      if (bufferRef.current.length === 0) return;

      const batch = bufferRef.current;
      bufferRef.current = [];
      pendingRef.current = 1;

      predictFrames(batch, mode, detectionMode)
        .then((prediction) => {
          recordDelivered(batch.length);
          applyPrediction(prediction);
        })
        .catch(() => {})
        .finally(() => {
          pendingRef.current = 0;
          // Frames kept arriving while that request was out; send them now
          // rather than waiting for the next capture tick.
          drainBuffer();
        });
    };

    const tickWords = () => {
      const frame = grabFrame();
      if (frame) {
        bufferRef.current.push(frame);
        if (bufferRef.current.length > MAX_BUFFERED_FRAMES) {
          const dropped = bufferRef.current.length - MAX_BUFFERED_FRAMES;
          bufferRef.current.splice(0, dropped);
          console.warn(
            `[useFrameCapture] buffer full, dropped ${dropped} frame(s) — ` +
            `the server cannot keep up with ${fps}fps capture`,
          );
        }
      }
      drainBuffer();
    };

    // ── Alphabet mode ─────────────────────────────────────────────────────────
    // Each frame is classified independently, so concurrency is harmless and
    // ordering does not matter.
    const tickAlphabet = () => {
      if (pendingRef.current >= ALPHABET_MAX_PENDING) return;

      const frame = grabFrame();
      if (!frame) return;

      pendingRef.current += 1;

      predictFrame(frame, undefined, mode, detectionMode)
        .then((prediction) => {
          recordDelivered(1);
          applyPrediction(prediction);
        })
        .catch(() => {})
        .finally(() => { pendingRef.current = Math.max(0, pendingRef.current - 1); });
    };

    const intervalMs = Math.max(1, Math.round(1000 / fps));
    intervalRef.current = setInterval(isWords ? tickWords : tickAlphabet, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      pendingRef.current  = 0;
      bufferRef.current   = [];
      if (wordLockTimer.current) clearTimeout(wordLockTimer.current);
      wordLockRef.current = false;
    };
  }, [isActive, fps, jpegQuality, mode, detectionMode, videoRef, isWords]);

  return { sentence, lastPrediction, fps: liveFps, clearSentence, backspace, appendSpace };
}