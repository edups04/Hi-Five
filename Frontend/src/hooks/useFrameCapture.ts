<<<<<<< HEAD
=======
/**
 * useFrameCapture.ts
 *
 * The bridge between the webcam and the ML pipeline. Given a videoRef
 * (your <video> element) and an "active" flag (your isRecording state),
 * this hook will:
 *
 *   1. Periodically grab a still frame from the video
 *   2. Encode it as JPEG via a hidden canvas
 *   3. POST it to Flask
 *   4. Feed the result into a SentenceBuilder
 *   5. Re-render the parent component with the latest sentence + prediction
 *
 * It handles three subtle things you don't want to think about:
 *   - Waiting for the video to actually have pixels before drawing
 *     (drawing too early gives you a black canvas)
 *   - Not stacking up requests if the network is slow (only one in-flight
 *     prediction at a time — drop frames rather than queue them)
 *   - Cleaning up on unmount or when isActive flips back to false
 */

>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
import { useEffect, useRef, useState } from "react";
import { predictFrame, type Prediction } from "../lib/aslClient";
import { SentenceBuilder } from "../asl/SentenceBuilder";

export interface UseFrameCaptureOptions {
<<<<<<< HEAD
  fps?: number;
=======
  /** Target frames-per-second to send to the server. 5 is a good default. */
  fps?: number;
  /** JPEG quality, 0-1. Lower = smaller payload, but the model doesn't care. */
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
  jpegQuality?: number;
}

export interface UseFrameCaptureResult {
<<<<<<< HEAD
  sentence: string;
  lastPrediction: Prediction | null;
  fps: number;
  clearSentence: () => void;
  backspace: () => void;
  appendSpace: () => void;
=======
  /** The accumulating sentence. Drives your subtitle UI. */
  sentence: string;
  /** Latest per-frame prediction (or null before the first one). */
  lastPrediction: Prediction | null;
  /** Live FPS — useful for a debug indicator. */
  fps: number;
  /** Imperative actions on the underlying SentenceBuilder. */
  clearSentence: () => void;
  backspace: () => void;
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
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

  const [sentence, setSentence] = useState("");
  const [lastPrediction, setLastPrediction] = useState<Prediction | null>(null);
  const [liveFps, setLiveFps] = useState(0);

<<<<<<< HEAD
=======
  // Stable refs for things we don't want to re-create on every render.
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
  const builderRef = useRef<SentenceBuilder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

<<<<<<< HEAD
  if (!builderRef.current) builderRef.current = new SentenceBuilder();
  if (!canvasRef.current) canvasRef.current = document.createElement("canvas");

=======
  // Lazy-init builder + canvas. Only happens once per hook lifetime.
  if (!builderRef.current) builderRef.current = new SentenceBuilder();
  if (!canvasRef.current) canvasRef.current = document.createElement("canvas");

  // Imperative actions exposed back to the caller. These also push the
  // updated sentence into React state so the UI re-renders.
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
  const clearSentence = () => {
    builderRef.current?.clear();
    setSentence("");
  };
  const backspace = () => {
    builderRef.current?.backspace();
    setSentence(builderRef.current?.sentence ?? "");
  };
<<<<<<< HEAD
  const appendSpace = () => {
    builderRef.current?.appendSpace();
    setSentence(builderRef.current?.sentence ?? "");
  };
  
=======

>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
  useEffect(() => {
    if (!isActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const builder = builderRef.current;
    if (!video || !canvas || !builder) return;

<<<<<<< HEAD
    const recentTimes: number[] = [];
    const FPS_WINDOW = 10;

    const captureAndPredict = async () => {
      if (inFlightRef.current) return;

      if (video.readyState < 2 || video.videoWidth === 0) return;

=======
    // Recent-frame timestamps for the live FPS counter.
    const recentTimes: number[] = [];
    const FPS_WINDOW = 10;

    // The capture function. Runs once per tick of setInterval.
    const captureAndPredict = async () => {
      // Drop the frame if a previous request is still pending. This is
      // important — without it, slow predictions stack up and the UI
      // shows results from many seconds ago.
      if (inFlightRef.current) return;

      // Make sure the video actually has pixels yet. readyState >= 2
      // means HAVE_CURRENT_DATA (a frame is available). Below that,
      // ctx.drawImage would draw a black rectangle.
      if (video.readyState < 2 || video.videoWidth === 0) return;

      // Match the canvas to the video's actual resolution.
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", jpegQuality);

<<<<<<< HEAD
=======
      // Cancel any prior in-flight before issuing a new one.
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      inFlightRef.current = true;
      const t0 = performance.now();
      try {
        const prediction = await predictFrame(dataUrl, controller.signal);
        if (!prediction) return; // network/server hiccup — skip this frame

<<<<<<< HEAD
        builder.update(prediction.label, prediction.confidence);

=======
        // Update the sentence builder.
        builder.update(prediction.label, prediction.confidence);

        // Push results back into React state. We always set lastPrediction
        // (so the debug overlay updates), but only setSentence if it
        // actually changed (cheap optimization to avoid extra renders).
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
        setLastPrediction(prediction);
        setSentence((prev) =>
          prev === builder.sentence ? prev : builder.sentence,
        );

<<<<<<< HEAD
=======
        // Live FPS calculation.
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
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
  }, [isActive, fps, jpegQuality, videoRef]);

<<<<<<< HEAD
  return { sentence, lastPrediction, fps: liveFps, clearSentence, backspace, appendSpace };
=======
  return { sentence, lastPrediction, fps: liveFps, clearSentence, backspace };
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
}
