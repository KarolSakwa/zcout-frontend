export function formatOverall(
  value: number | null | undefined,
  mode: 'rounded' | 'exact' = 'rounded'
) {
  if (value == null || !Number.isFinite(value)) return '—';
  return mode === 'exact' ? value.toFixed(2) : String(Math.round(value));
}