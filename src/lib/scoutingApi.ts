import type {
  MyScoutingResponse,
  ScoutingProgressResponse,
} from '@/lib/scoutingTypes';
import { isScoutingProgress } from '@/lib/scoutingTypes';
import { isMyScoutingResponse } from '@/lib/myScoutingGuards';
import { ensureBrowserAnonId } from '@/lib/anonId/browser';

function buildScoutingHeaders(anonId: string | null): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (anonId) {
    headers['X-Zcout-Anon'] = anonId;
  }

  return headers;
}

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  if (!text) return `Request failed: ${res.status}`;

  try {
    const payload = JSON.parse(text) as { message?: string };
    if (payload.message) return payload.message;
  } catch {
    // fall through
  }

  return `Request failed: ${res.status} ${text.slice(0, 160)}`;
}

export async function fetchScoutingProgress(
  anonId: string | null = ensureBrowserAnonId(),
  signal?: AbortSignal,
): Promise<ScoutingProgressResponse> {
  const res = await fetch('/api/scouting/progress', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: buildScoutingHeaders(anonId),
    signal,
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  const data = (await res.json()) as ScoutingProgressResponse;

  if (!isScoutingProgress(data.scouting_progress)) {
    throw new Error('Invalid scouting progress response.');
  }

  return data;
}

export async function fetchMyScouting(
  anonId: string | null = ensureBrowserAnonId(),
  signal?: AbortSignal,
): Promise<MyScoutingResponse> {
  const res = await fetch('/api/my-scouting', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: buildScoutingHeaders(anonId),
    signal,
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  const data = (await res.json()) as MyScoutingResponse;

  if (!isMyScoutingResponse(data)) {
    throw new Error('Invalid my scouting response.');
  }

  return data;
}
