export type TelemetryEventType =
  | 'duel_loaded'
  | 'vote_submitted'
  | 'skip_clicked'
  | 'profile_opened'
  | 'ranking_opened'
  | 'scout_report_opened'
  | 'scout_report_submitted'
  | 'search_used';

export type TelemetryPayload = Record<string, unknown>;

export function logEvent(eventType: TelemetryEventType, payload: TelemetryPayload = {}): void {
  if (typeof window === 'undefined') return;

  const body = JSON.stringify({
    event_type: eventType,
    payload,
    created_at: new Date().toISOString(),
  });

  void fetch('/api/log-event', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => {});
}