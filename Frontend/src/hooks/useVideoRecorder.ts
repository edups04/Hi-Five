/**
 * useVideoRecorder.ts
 *
 * Records the webcam video with the live ASL subtitle burned into each frame.
 * When stopped, hands the blob back via an onRecorded callback — the caller
 * decides whether to download it, show a preview modal, or upload it.
 *
 * Usage:
 *   const recorder = useVideoRecorder();
 *   recorder.start(stream, () => sentenceRef.current, (blob) => {
 *     setPendingBlob(blob);  // open modal, download, upload — your call
 *   });
 *
 *   // later:
 *   recorder.stop();
 */

import { useCallback, useRef } from "react";

export interface UseVideoRecorderResult {
  start: (
    stream: MediaStream,
    getSentence: () => string,
    onRecorded: (blob: Blob) => void,
  ) => void;
  stop: () => void;
}

const PREFERRED_MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const t of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

/** Download a blob as a file with the given filename. Exported as a helper
 *  so the modal can trigger a download with the user's chosen name. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Sanitize a user-typed name so it's safe as a filename on Windows/macOS. */
export function sanitizeFilename(name: string): string {
  return (
    name
      .trim()
      .replace(/[\\/:*?"<>|]/g, "")        // illegal on Windows
      .replace(/\s+/g, " ")                // collapse internal whitespace
      .slice(0, 80) || "recording"
  );
}

export function useVideoRecorder(): UseVideoRecorderResult {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startedRef = useRef(false);
  const onRecordedRef = useRef<((blob: Blob) => void) | null>(null);
  const mimeTypeRef = useRef<string | undefined>(undefined);

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    recorderRef.current = null;
    canvasRef.current = null;
    if (videoElRef.current) {
      videoElRef.current.srcObject = null;
      if (videoElRef.current.parentNode) {
        videoElRef.current.parentNode.removeChild(videoElRef.current);
      }
      videoElRef.current = null;
    }
    startedRef.current = false;
    onRecordedRef.current = null;
    mimeTypeRef.current = undefined;
  }, []);

  const start = useCallback(
    (
      stream: MediaStream,
      getSentence: () => string,
      onRecorded: (blob: Blob) => void,
    ) => {
      if (startedRef.current) {
        console.warn("[recorder] already started, ignoring");
        return;
      }
      startedRef.current = true;
      onRecordedRef.current = onRecorded;

      // Offscreen <video> attached to the DOM so loadedmetadata fires
      // reliably on Chromium-based browsers.
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.style.position = "fixed";
      video.style.left = "-99999px";
      video.style.top = "-99999px";
      video.style.width = "1px";
      video.style.height = "1px";
      video.style.opacity = "0";
      video.style.pointerEvents = "none";
      document.body.appendChild(video);
      videoElRef.current = video;

      const canvas = document.createElement("canvas");
      canvasRef.current = canvas;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error("[recorder] 2d context unavailable");
        cleanup();
        return;
      }

      let kicked = false;
      const kickoff = () => {
        if (kicked) return;
        kicked = true;
        clearTimeout(fallbackTimer);

        if (!video.videoWidth || !video.videoHeight) {
          console.error("[recorder] video has no dimensions; aborting");
          cleanup();
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        console.log(`[recorder] starting at ${canvas.width}x${canvas.height}`);

        const mimeType = pickMimeType();
        mimeTypeRef.current = mimeType;
        const canvasStream = canvas.captureStream(30);
        let recorder: MediaRecorder;
        try {
          recorder = mimeType
            ? new MediaRecorder(canvasStream, { mimeType })
            : new MediaRecorder(canvasStream);
        } catch (err) {
          console.error("[recorder] MediaRecorder failed:", err);
          cleanup();
          return;
        }
        recorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const totalBytes = chunksRef.current.reduce((n, b) => n + b.size, 0);
          console.log(
            `[recorder] stopped: ${chunksRef.current.length} chunks, ${totalBytes} bytes`,
          );
          const blob = new Blob(chunksRef.current, {
            type: mimeTypeRef.current ?? "video/webm",
          });
          chunksRef.current = [];

          // Hand the blob to the page. The page decides what to do with it.
          const cb = onRecordedRef.current;
          if (cb && blob.size > 0) {
            cb(blob);
          } else if (blob.size === 0) {
            console.warn("[recorder] blob is empty, skipping callback");
          }

          cleanup();
        };

        recorder.start(1000);
        console.log("[recorder] MediaRecorder.start() called");

        const draw = () => {
          if (!recorderRef.current || recorderRef.current.state === "inactive") {
            rafRef.current = null;
            return;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const sentence = getSentence();
          if (sentence) {
            drawSubtitleToCanvas(ctx, sentence, canvas.width, canvas.height);
          }
          rafRef.current = requestAnimationFrame(draw);
        };
        rafRef.current = requestAnimationFrame(draw);
      };

      const fallbackTimer = window.setTimeout(() => {
        console.warn("[recorder] loadedmetadata timeout, trying anyway");
        kickoff();
      }, 1500);

      video.addEventListener("loadedmetadata", () => {
        console.log(
          `[recorder] loadedmetadata: ${video.videoWidth}x${video.videoHeight}`,
        );
        kickoff();
      });

      video.srcObject = stream;
      video.play().catch((err) => {
        console.warn("[recorder] video.play() rejected:", err);
      });
    },
    [cleanup],
  );

  const stop = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") {
      console.log("[recorder] stop() called, state:", r.state);
      // The recorder's `onstop` will fire after the final dataavailable,
      // call onRecorded, then cleanup. Don't double-cleanup here.
      r.stop();
    } else {
      cleanup();
    }
  }, [cleanup]);

  return { start, stop };
}

// ----- Subtitle rendering inside the canvas --------------------------------
function drawSubtitleToCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
): void {
  const fontSize = Math.max(28, Math.round(width / 28));
  ctx.font = `700 ${fontSize}px "Manrope", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const maxWidth = width - 64;
  let display = text;
  while (display && ctx.measureText(display).width > maxWidth) {
    const spaceIdx = display.indexOf(" ");
    display = spaceIdx >= 0 ? display.slice(spaceIdx + 1) : display.slice(1);
  }

  const x = width / 2;
  const y = height - Math.max(40, Math.round(height * 0.08));

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  for (const [dx, dy] of [
    [-2, -2], [-2, 2], [2, -2], [2, 2], [0, 3],
  ] as Array<[number, number]>) {
    ctx.fillText(display, x + dx, y + dy);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillText(display, x, y);
  ctx.restore();
}