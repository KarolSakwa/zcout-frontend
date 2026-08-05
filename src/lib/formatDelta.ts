export function formatSignedDelta(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  if (value === 0) {
    return '0.00';
  }

  const sign = value > 0 ? '+' : '−';
  return `${sign}${Math.abs(value).toFixed(2)}`;
}

export function formatOverallValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  return value.toFixed(2);
}
