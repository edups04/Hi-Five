export interface Prediction {
  label: string;
  confidence: number;
  hand_detected: boolean;
  hand_count: number;
  is_word_sign?: boolean;
  /** True while the server is still accumulating frames for the current sign. */
  collecting?: boolean;
}

export type SignMode = "asl" | "fsl" | "both";
export type DetectionMode = "alphabet" | "words";

const API_URL =
  (import.meta.env.VITE_ASL_API_URL as string | undefined) ??
  "http://localhost:3001";

// Aborting a slow request does NOT stop the server from processing those frames —
// it only throws away the answer. In words mode the frames have already entered
// the TCN buffer, so a short timeout just blinds the client to a sign it already
// paid for. A batch carries several frames, so give it proportionally longer.
const SINGLE_TIMEOUT_MS = 2500;
const BATCH_BASE_MS     = 4000;
const BATCH_PER_FRAME_MS = 1500;
const BATCH_MAX_MS      = 20000;

export async function predictFrame(
  imageDataUrl: string,
  signal?: AbortSignal,
  mode: SignMode = "asl",
  detectionMode: DetectionMode = "alphabet",
): Promise<Prediction | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SINGLE_TIMEOUT_MS);

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    const res = await fetch(`${API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageDataUrl, mode, detection_mode: detectionMode }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[aslClient] /predict ${res.status}: ${body}`);
      return null;
    }

    return (await res.json()) as Prediction;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return null;
    }
    console.warn("[aslClient] /predict failed:", err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Send several consecutive frames in one request.
 *
 * The TCN classifies a whole movement, so it needs frames at a steady rate.
 * Sending one frame per request pins the frame rate to 1 / round-trip-time,
 * which on a slow connection starves the segmenter and forces the signer to
 * move unnaturally slowly. Batching decouples the two: the client captures at a
 * fixed rate into a buffer and ships whatever accumulated while the previous
 * request was in flight.
 */
export async function predictFrames(
  imageDataUrls: string[],
  mode: SignMode = "asl",
  detectionMode: DetectionMode = "words",
  signal?: AbortSignal,
): Promise<Prediction | null> {
  if (imageDataUrls.length === 0) return null;

  const controller = new AbortController();
  const timeoutMs = Math.min(
    BATCH_MAX_MS,
    BATCH_BASE_MS + imageDataUrls.length * BATCH_PER_FRAME_MS,
  );
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    const res = await fetch(`${API_URL}/predict_batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: imageDataUrls, mode, detection_mode: detectionMode }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[aslClient] /predict_batch ${res.status}: ${body}`);
      return null;
    }

    return (await res.json()) as Prediction;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      console.warn(`[aslClient] /predict_batch timed out after ${timeoutMs}ms`);
      return null;
    }
    console.warn("[aslClient] /predict_batch failed:", err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Clear the server-side TCN frame buffer.
 * Call this when a camera session starts so the first sign isn't classified
 * against frames left over from the previous session.
 */
export async function resetDynamicState(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/reset`, { method: "POST" });
    return res.ok;
  } catch (err) {
    console.warn("[aslClient] /reset failed:", err);
    return false;
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}