import { useEffect, useRef, useState } from "react";
import { predictFrame, resetDynamicState, type Prediction, type SignMode, type DetectionMode } from "../lib/aslClient";
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
  const pendingRef    = useRef(0);          // count of in-flight requests
  const gapsRef       = useRef<number[]>([]);
  const lastDoneRef   = useRef<number>(0);
  const wordLockRef   = useRef(false);
  const wordLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The TCN is a *sequence* model: it buffers frames server-side and classifies
  // the whole segment. Frames must therefore arrive in capture order. Allowing
  // concurrent requests lets a later frame overtake an earlier one over a jittery
  // connection, which scrambles the buffer — so words mode sends strictly one at
  // a time. Alphabet mode is stateless per frame, so concurrency is fine there.
  const isWords     = detectionMode === "words";
  const MAX_PENDING = isWords ? 1 : 3;

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

    // Clear any frames left in the server-side buffer from a previous session,
    // otherwise the first sign is classified against stale motion history.
    if (isWords) void resetDynamicState();

    gapsRef.current   = [];
    lastDoneRef.current = 0;

    const captureAndPredict = () => {
      if (video.readyState < 2 || video.videoWidth === 0) return;
      if (pendingRef.current >= MAX_PENDING) return;   // don't flood server

      if (canvas.width  !== video.videoWidth)  canvas.width  = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", jpegQuality);

      pendingRef.current += 1;

      predictFrame(dataUrl, undefined, mode, detectionMode)
        .then((prediction) => {
          // Measure the rate we actually achieve: the gap between completed
          // frames, not the latency of one request.
          const now = performance.now();
          if (lastDoneRef.current > 0) {
            const gaps = gapsRef.current;
            gaps.push(now - lastDoneRef.current);
            if (gaps.length > 10) gaps.shift();
            const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
            setLiveFps(avgGap > 0 ? 1000 / avgGap : 0);
          }
          lastDoneRef.current = now;

          if (!prediction) return;
          if ((prediction.hand_count ?? 0) > 1) return;

          // Server is still accumulating frames for the current sign — this is
          // a status ping, not a prediction. Never feed it to the builder.
          if (prediction.collecting) {
            setLastPrediction(prediction);
            return;
          }

          if (prediction.is_word_sign) {
            builder.sentence += prediction.label + " ";
            setLastPrediction(prediction);
            setSentence(builder.sentence);

            // Lock display for 2 seconds so letters don't override the word
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

          // Adaptive FPS — only in alphabet mode. The TCN was trained on
          // gestures sampled at a steady ~12fps; dropping to 5fps stretches a
          // 1.7s sign across 4s and the model has never seen anything like it.
          // In words mode the MAX_PENDING=1 gate already paces us to whatever
          // the server can handle, while keeping frames in order.
          if (!isWords && gapsRef.current.length >= 5) {
            const avgGap = gapsRef.current.reduce((a, b) => a + b, 0) / gapsRef.current.length;
            if (avgGap > 300 && intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = setInterval(captureAndPredict, Math.round(1000 / 5));
            } else if (avgGap < 100 && intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = setInterval(captureAndPredict, Math.round(1000 / 12));
            }
          }
        })
        .catch(() => {})
        .finally(() => { pendingRef.current = Math.max(0, pendingRef.current - 1); });
    };

    const intervalMs = Math.max(1, Math.round(1000 / fps));
    intervalRef.current = setInterval(captureAndPredict, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      pendingRef.current  = 0;
      if (wordLockTimer.current) clearTimeout(wordLockTimer.current);
      wordLockRef.current = false;
    };
  }, [isActive, fps, jpegQuality, mode, detectionMode, videoRef, isWords, MAX_PENDING]);

  return { sentence, lastPrediction, fps: liveFps, clearSentence, backspace, appendSpace };
}