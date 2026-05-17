export function formatRelativeDate(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const now = new Date();

  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round(
    (startOf(now) - startOf(date)) / (1000 * 60 * 60 * 24),
  );

  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  const numeric = `${mm}/${dd}/${yy}`;

  if (dayDiff === 0) return `Today · ${numeric}`;
  if (dayDiff === 1) return `Yesterday · ${numeric}`;
  if (dayDiff > 1 && dayDiff < 7) return `${dayDiff} days ago · ${numeric}`;
  return numeric;
}

export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function recordingCountLabel(n: number): string {
  if (n === 0) return "No recordings yet";
  if (n === 1) return "1 recording total";
  return `${n} recordings total`;
}
