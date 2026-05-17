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

async function ensureOk(res: Response): Promise<any> {
  if (res.ok) return res.json();
  let message = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json();
    if (body && typeof body.message === 'string') message = body.message;
  } catch {
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
  const videoBlob =
    opts.blob.type && opts.blob.type.includes('video/')
      ? opts.blob
      : new Blob([opts.blob], { type: 'video/webm' });

  const form = new FormData();
  form.append('video', videoBlob, 'recording.webm');
  form.append('name', opts.name);
  if (opts.sentence) form.append('sentence', opts.sentence);
  if (opts.durationMs != null) form.append('durationMs', String(opts.durationMs));

  const res = await fetch(`${API_BASE}/api/recordings`, {
    method: 'POST',
    headers: { ...authHeaders() },     
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

export async function fetchRecordingBlobUrl(id: string): Promise<string> {
  const res = await fetch(recordingVideoUrl(id), {
    method: 'GET',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Failed to fetch video: ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}