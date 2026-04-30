// src/lib/recordingsClient.ts
//
// Wrapper around the Express /api/recordings endpoints. All calls attach
// the JWT from localStorage.accessToken. Throws on non-2xx so callers can
// wrap with try/catch + toast.

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000';

export interface RecordingMeta {
  id: string;
  name: string;
  sentence: string;
  sizeBytes: number;
  durationMs: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
}

function getAuthToken(): string | null {
  return localStorage.getItem('accessToken');
}

function authHeaders(): Record<string, string> {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Throws an Error with a useful message if the response is not OK. */
async function ensureOk(res: Response): Promise<any> {
  if (res.ok) return res.json();
  let message = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json();
    if (body && typeof body.message === 'string') message = body.message;
  } catch {
    // not JSON; keep status text
  }
  throw new Error(message);
}

export interface UploadOptions {
  blob: Blob;
  name: string;
  sentence?: string;
  durationMs?: number;
}

export async function uploadRecording(
  opts: UploadOptions,
): Promise<RecordingMeta> {
  // Workaround for a Chromium quirk: blobs from MediaRecorder sometimes have
  // an empty `.type`, which causes the browser to encode the multipart part
  // as `Content-Type: text/plain`. The server's multer fileFilter then
  // rejects it as a non-video MIME.
  //
  // Explicitly wrapping the blob in a new Blob with type='video/webm' forces
  // the multipart envelope to carry the right Content-Type.
  const videoBlob =
    opts.blob.type && opts.blob.type.includes('video/')
      ? opts.blob
      : new Blob([opts.blob], { type: 'video/webm' });

  const form = new FormData();
  // Filename here is just for the multipart envelope; the server names the
  // actual file on disk after the new document _id.
  form.append('video', videoBlob, 'recording.webm');
  form.append('name', opts.name);
  if (opts.sentence) form.append('sentence', opts.sentence);
  if (opts.durationMs != null) form.append('durationMs', String(opts.durationMs));

  const res = await fetch(`${API_BASE}/api/recordings`, {
    method: 'POST',
    headers: { ...authHeaders() },     // DON'T set Content-Type; browser sets the multipart boundary
    body: form,
  });
  const json = await ensureOk(res);
  return json.recording as RecordingMeta;
}

export async function listRecordings(): Promise<RecordingMeta[]> {
  const res = await fetch(`${API_BASE}/api/recordings`, {
    method: 'GET',
    headers: { ...authHeaders() },
  });
  const json = await ensureOk(res);
  return json.recordings as RecordingMeta[];
}

export async function renameRecording(
  id: string,
  name: string,
): Promise<RecordingMeta> {
  const res = await fetch(`${API_BASE}/api/recordings/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const json = await ensureOk(res);
  return json.recording as RecordingMeta;
}

export async function deleteRecording(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/recordings/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  await ensureOk(res);
}

export function recordingVideoUrl(id: string): string {
  return `${API_BASE}/api/recordings/${id}/video`;
}

/**
 * Fetch the recording video as a blob URL suitable for <video src>. Uses
 * the auth token. Caller is responsible for URL.revokeObjectURL when done.
 */
export async function fetchRecordingBlobUrl(id: string): Promise<string> {
  const res = await fetch(recordingVideoUrl(id), {
    method: 'GET',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Failed to fetch video: ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}