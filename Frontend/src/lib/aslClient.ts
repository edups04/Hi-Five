export interface Prediction {
  label: string;
  confidence: number;
  hand_detected: boolean;
  hand_count: number;
}

export type SignMode = "asl" | "fsl" | "both";

const API_URL =
  (import.meta.env.VITE_ASL_API_URL as string | undefined) ??
  "http://localhost:3001";

export async function predictFrame(
  imageDataUrl: string,
  signal?: AbortSignal,
  mode: SignMode = "asl",
): Promise<Prediction | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

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
      body: JSON.stringify({ image: imageDataUrl, mode }),
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

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}