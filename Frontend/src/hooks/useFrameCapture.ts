import { useEffect, useRef, useState } from "react";
import { predictFrame, type Prediction, type SignMode } from "../lib/aslClient";
import { SentenceBuilder } from "../asl/SentenceBuilder";

export interface UseFrameCaptureOptions {
  fps?: number;
  jpegQuality?: number;
  mode?: SignMode;
}

export interface UseFrameCaptureResult {
  sentence: string;
  lastPrediction: Prediction | null;
  fps: number;
  clearSentence: () => void;
  backspace: () => void;
  appendSpace: () => void;
}

const DEFAULT_FPS = 5;
const DEFAULT_JPEG_QUALITY = 0.7;

export function useFrameCapture(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isActive: boolean,
  options: UseFrameCaptureOptions = {},
): UseFrameCaptureResult {
  const fps = options.fps ?? DEFAULT_FPS;
  const jpegQuality = options.jpegQuality ?? DEFAULT_JPEG_QUALITY;
  const mode = options.mode ?? "asl";

  const [sentence, setSentence] = useState("");
  const [lastPrediction, setLastPrediction] = useState<Prediction | null>(null);
  const [liveFps, setLiveFps] = useState(0);

  const builderRef = useRef<SentenceBuilder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (!builderRef.current) builderRef.current = new SentenceBuilder();
  if (!canvasRef.current) canvasRef.current = document.createElement("canvas");

  const clearSentence = () => {
    builderRef.current?.clear();
    setSentence("");
  };
  const backspace = () => {
    builderRef.current?.backspace();
    setSentence(builderRef.current?.sentence ?? "");
  };
  const appendSpace = () => {
    builderRef.current?.appendSpace();
    setSentence(builderRef.current?.sentence ?? "");
  };

  useEffect(() => {
    if (!isActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const builder = builderRef.current;
    if (!video || !canvas || !builder) return;

    const recentTimes: number[] = [];
    const FPS_WINDOW = 10;

    const captureAndPredict = async () => {
      if (inFlightRef.current) return;

      if (video.readyState < 2 || video.videoWidth === 0) return;

      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", jpegQuality);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      inFlightRef.current = true;
      const t0 = performance.now();
      try {
        const prediction = await predictFrame(dataUrl, controller.signal, mode);
        if (!prediction) return;

        builder.update(prediction.label, prediction.confidence);

        setLastPrediction(prediction);
        setSentence((prev) =>
          prev === builder.sentence ? prev : builder.sentence,
        );

        recentTimes.push(performance.now() - t0);
        if (recentTimes.length > FPS_WINDOW) recentTimes.shift();
        const avg = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;
        setLiveFps(avg > 0 ? 1000 / avg : 0);
      } finally {
        inFlightRef.current = false;
      }
    };

    const intervalMs = Math.max(1, Math.round(1000 / fps));
    intervalRef.current = setInterval(captureAndPredict, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      abortRef.current?.abort();
      abortRef.current = null;
      inFlightRef.current = false;
    };
  }, [isActive, fps, jpegQuality, mode, videoRef]);

  return { sentence, lastPrediction, fps: liveFps, clearSentence, backspace, appendSpace };
}