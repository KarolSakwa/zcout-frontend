export const MIN_QUERY_LENGTH = 3;
export const DEBOUNCE_MS = 150;

export type SearchPlayer = {
  id: number;
  name: string;
  slug: string | null;
  position: string | null;
  club: string | null;
  overall: number | null;
};

export type SearchClub = {
  id: number;
  name: string;
  slug: string;
};

export type SearchResponse = {
  query: string;
  players: SearchPlayer[];
  clubs: SearchClub[];
};

export async function fetchGlobalSearch(
  trimmedQuery: string,
  signal: AbortSignal,
): Promise<SearchResponse> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Search failed: ${res.status} ${text.slice(0, 120)}`);
  }

  const data = (await res.json()) as SearchResponse;

  return {
    query: data.query,
    players: Array.isArray(data.players) ? data.players : [],
    clubs: Array.isArray(data.clubs) ? data.clubs : [],
  };
}
