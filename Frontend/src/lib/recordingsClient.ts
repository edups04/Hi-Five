const API_URL =
    (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

function authHeaders(): Record<string, string> {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function json<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
}

export interface RecordingMeta {
    id: string;
    name: string;
    sentence: string;
    sizeBytes: number;
    durationMs: number;
    mimeType: string;
    isPublic: boolean;
    views: number;
    likes: string[];
    description: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export interface FeedRecording extends RecordingMeta {
    userId: string;
    uploader: {
        id: string;
        username: string;
        avatar: string | null;
    };
}

export interface CommentItem {
    id: string;
    text: string;
    likes: string[];
    createdAt: string;
    user: {
        id: string;
        username: string;
        avatar: string | null;
    };
}

export async function uploadRecording(
    blob: Blob,
    name: string,
    sentence: string,
    durationMs: number,
    onProgress?: (percent: number) => void,
): Promise<RecordingMeta> {
    const form = new FormData();
    form.append('video', blob, 'recording.webm');
    form.append('name', name);
    form.append('sentence', sentence);
    form.append('durationMs', String(Math.round(durationMs)));

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/api/recordings`);

        const token = localStorage.getItem('accessToken');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    if (onProgress) onProgress(100);
                    resolve(data.recording);
                } catch {
                    reject(new Error('Invalid response from server'));
                }
            } else {
                reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText}`));
            }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        xhr.send(form);
    });
}

export async function listRecordings(): Promise<RecordingMeta[]> {
    const res = await fetch(`${API_URL}/api/recordings`, {
        headers: authHeaders(),
    });
    const data = await json<{ success: boolean; recordings: RecordingMeta[] }>(res);
    return data.recordings;
}

export async function renameRecording(id: string, name: string): Promise<RecordingMeta> {
    const res = await fetch(`${API_URL}/api/recordings/${id}`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    const data = await json<{ success: boolean; recording: RecordingMeta }>(res);
    return data.recording;
}

export async function deleteRecording(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/recordings/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
    await json<{ success: boolean }>(res);
}

export async function getFeed(page = 1, limit = 12): Promise<{
    recordings: FeedRecording[];
    total: number;
    page: number;
    totalPages: number;
}> {
    const res = await fetch(`${API_URL}/api/recordings/feed?page=${page}&limit=${limit}`, {
        headers: authHeaders(),
    });
    return json(res);
}

export async function getRecording(id: string): Promise<FeedRecording> {
    const res = await fetch(`${API_URL}/api/recordings/${id}`, {
        headers: authHeaders(),
    });
    const data = await json<{ success: boolean; recording: FeedRecording }>(res);
    return data.recording;
}

export async function publishRecording(
    id: string,
    description: string,
    tags: string[],
): Promise<RecordingMeta> {
    const res = await fetch(`${API_URL}/api/recordings/${id}/publish`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, tags }),
    });
    const data = await json<{ success: boolean; recording: RecordingMeta }>(res);
    return data.recording;
}

export async function unpublishRecording(id: string): Promise<RecordingMeta> {
    const res = await fetch(`${API_URL}/api/recordings/${id}/unpublish`, {
        method: 'POST',
        headers: authHeaders(),
    });
    const data = await json<{ success: boolean; recording: RecordingMeta }>(res);
    return data.recording;
}

export async function likeRecording(id: string): Promise<{ likes: number; liked: boolean }> {
    const res = await fetch(`${API_URL}/api/recordings/${id}/like`, {
        method: 'POST',
        headers: authHeaders(),
    });
    return json(res);
}

export async function viewRecording(id: string): Promise<void> {
    await fetch(`${API_URL}/api/recordings/${id}/view`, {
        method: 'POST',
        headers: authHeaders(),
    }).catch(() => {});
}

export async function getComments(recordingId: string): Promise<CommentItem[]> {
    const res = await fetch(`${API_URL}/api/recordings/${recordingId}/comments`, {
        headers: authHeaders(),
    });
    const data = await json<{ success: boolean; comments: CommentItem[] }>(res);
    return data.comments;
}

export async function postComment(recordingId: string, text: string): Promise<CommentItem> {
    const res = await fetch(`${API_URL}/api/recordings/${recordingId}/comments`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    });
    const data = await json<{ success: boolean; comment: CommentItem }>(res);
    return data.comment;
}

export async function likeComment(
    recordingId: string,
    commentId: string,
): Promise<{ likes: number; liked: boolean }> {
    const res = await fetch(
        `${API_URL}/api/recordings/${recordingId}/comments/${commentId}/like`,
        { method: 'POST', headers: authHeaders() },
    );
    return json(res);
}

export function videoUrl(recordingId: string): string {
    const token = localStorage.getItem('accessToken') || '';
    return `${API_URL}/api/recordings/${recordingId}/video?token=${token}`;
}
