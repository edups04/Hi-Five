import { useEffect, useRef, useState } from "react";
import { predictFrame, type Prediction, type SignMode } from "../lib/aslClient";
import { SentenceBuilder } from "../asl/SentenceBuilder";

export interface UseFrameCaptureOptions {
  fps?: number;
  jpegQuality?: number;
  mode?: SignMode;
  fingerspell?: boolean;
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
const DEFAULT_JPEG_QUALITY = 0.92;

export function useFrameCapture(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isActive: boolean,
  options: UseFrameCaptureOptions = {},
): UseFrameCaptureResult {
  const fps         = options.fps         ?? DEFAULT_FPS;
  const jpegQuality = options.jpegQuality ?? DEFAULT_JPEG_QUALITY;
  const mode        = options.mode        ?? "asl";
  const fingerspell = options.fingerspell ?? false;

  const [sentence,       setSentence]       = useState("");
  const [lastPrediction, setLastPrediction] = useState<Prediction | null>(null);
  const [liveFps,        setLiveFps]        = useState(0);

  const builderRef    = useRef<SentenceBuilder | null>(null);
  const canvasRef     = useRef<HTMLCanvasElement | null>(null);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef    = useRef(0);          // count of in-flight requests
  const MAX_PENDING   = 3;                  // max concurrent requests
  const fpsTimesRef   = useRef<number[]>([]);
  const lastFrameRef  = useRef<number>(0);
  const wordLockRef   = useRef(false);
  const wordLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const captureAndPredict = () => {
      if (video.readyState < 2 || video.videoWidth === 0) return;
      if (pendingRef.current >= MAX_PENDING) return;   // don't flood server

      if (canvas.width  !== video.videoWidth)  canvas.width  = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", jpegQuality);

      const t0 = performance.now();
      pendingRef.current += 1;

      predictFrame(dataUrl, undefined, mode)
        .then((prediction) => {
          if (!prediction) return;
          if ((prediction.hand_count ?? 0) > 1) return;

          if (prediction.is_word_sign && !fingerspell) {
              builder.sentence += prediction.label + " ";
              setLastPrediction(prediction);
              setSentence(builder.sentence);

              // Lock display for 2 seconds so letters don't override the word
              wordLockRef.current = true;
              if (wordLockTimer.current) clearTimeout(wordLockTimer.current);
              wordLockTimer.current = setTimeout(() => {
                  wordLockRef.current = false;
              }, 2000);

          } else if (!wordLockRef.current) {
              builder.update(prediction.label, prediction.confidence);
              setLastPrediction(prediction);
              setSentence((prev) => prev === builder.sentence ? prev : builder.sentence);
          }

          const elapsed = performance.now() - t0;
          const times   = fpsTimesRef.current;
          times.push(elapsed);
          if (times.length > 10) times.shift();
          const avg = times.reduce((a, b) => a + b, 0) / times.length;
          setLiveFps(avg > 0 ? 1000 / avg : 0);
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
  }, [isActive, fps, jpegQuality, mode, fingerspell, videoRef]);

  return { sentence, lastPrediction, fps: liveFps, clearSentence, backspace, appendSpace };
}
