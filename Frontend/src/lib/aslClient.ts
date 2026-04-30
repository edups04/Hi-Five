/**
 * aslClient.ts
 *
 * Thin wrapper around the Flask ML server. The rest of the app should
 * never call fetch() directly for predictions — go through here so we
 * have one place to add timeouts, error handling, and (later) auth.
 *
 * Reads the base URL from VITE_ASL_API_URL if set, otherwise falls back
 * to http://localhost:3001 for local dev. Add this to your .env.local:
 *
 *     VITE_ASL_API_URL=http://localhost:3001
 *
 * (Vite exposes env vars prefixed with VITE_ to the browser.)
 */

export interface Prediction {
  label: string;          // "A" .. "Z" | "space" | "del" | "nothing"
  confidence: number;     // 0.0 - 1.0
  hand_detected: boolean;
}

const API_URL =
  (import.meta.env.VITE_ASL_API_URL as string | undefined) ??
  "http://localhost:3001";

/**
 * Predict the ASL letter shown in a single frame.
 *
 * @param imageDataUrl  data URL from canvas.toDataURL("image/jpeg", ...)
 * @param signal        Optional AbortSignal to cancel in-flight requests
 *                      (useful when the user stops recording mid-flight).
 * @returns             Prediction, or null on transient network/server error.
 *
 * Why null instead of throwing: the calling loop runs many times per second
 * and shouldn't crash on a single hiccup. The hook handles null by skipping
 * that frame.
 */
export async function predictFrame(
  imageDataUrl: string,
  signal?: AbortSignal,
): Promise<Prediction | null> {
  // Keep our own ~2s timeout in case the server hangs. Browsers don't
  // time out fetch() automatically.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  // Forward the caller's abort signal too.
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
      body: JSON.stringify({ image: imageDataUrl }),
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
      // Expected when stopping recording or hitting the timeout — not noise.
      return null;
    }
    console.warn("[aslClient] /predict failed:", err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Health check. Useful for the UI to show "server offline" if Flask isn't running.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
