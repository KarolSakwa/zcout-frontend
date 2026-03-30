export function formatOverall(
  value: number | null | undefined,
  mode: 'rounded' | 'exact' = 'rounded'
) {
  if (value == null || !Number.isFinite(value)) return '—';
  return mode === 'exact' ? value.toFixed(2) : String(Math.round(value));
}

export function getRatingColor(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return 'var(--ui-text-primary)';
  }

  const clamped = Math.max(1, Math.min(99, value));

  if (clamped < 65) {
    return 'var(--ui-text-primary)';
  }

  const t = Math.max(0, Math.min(1, (clamped - 65) / 30));
  const accentPct = Math.round(t * 100);

  return `color-mix(in srgb, var(--ui-accent-primary) ${accentPct}%, var(--ui-text-primary))`;
}