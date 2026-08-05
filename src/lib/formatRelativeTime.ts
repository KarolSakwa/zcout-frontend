export function formatRelativeTime(iso: string, now = Date.now()): string {
  const date = new Date(iso);
  const timestamp = date.getTime();

  if (!Number.isFinite(timestamp)) {
    return '';
  }

  const diffMs = Math.max(0, now - timestamp);
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) {
    return 'Just now';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return diffMin === 1 ? '1 min ago' : `${diffMin} min ago`;
  }

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return diffHr === 1 ? '1 h ago' : `${diffHr} h ago`;
  }

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) {
    return 'Yesterday';
  }

  if (diffDay < 7) {
    return `${diffDay} days ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
