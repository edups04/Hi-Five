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

// Aborting a slow request does NOT stop the server from processing that frame —
// it only throws away the answer. In words mode the frame has already entered
// the TCN buffer, so a short timeout just blinds the client to a sign it already
// paid for. Give the server room on a shared-CPU host.
const TIMEOUT_MS: Record<DetectionMode, number> = {
  alphabet: 2500,
  words:    8000,
};

export async function predictFrame(
  imageDataUrl: string,
  signal?: AbortSignal,
  mode: SignMode = "asl",
  detectionMode: DetectionMode = "alphabet",
): Promise<Prediction | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS[detectionMode]);

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