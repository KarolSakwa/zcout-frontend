export function formatTrend7d(trend: number | null | undefined): string {
  if (trend === null || trend === undefined) {
    return '—';
  }

  if (trend > 0) {
    return `+${trend.toFixed(2)}`;
  }

  return trend.toFixed(2);
}

export function getTrend7dColor(trend: number | null | undefined): string {
  if (trend === null || trend === undefined || trend === 0) {
    return 'rgba(170,184,205,0.74)';
  }

  if (trend > 0) {
    return 'var(--ui-accent-primary)';
  }

  return 'var(--ui-accent-faller)';
}
