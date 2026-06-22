'use client';

const HOMEPAGE_ITEMS_LIMIT = 5;

type NeedsMoreRatingsResponse = {
  items: NeedsMoreRatingsItem[];
};

export type NeedsMoreRatingsItem = {
  id: string;
  playerId: number;
  player: string;
  slug: string | null;
  club: string | null;
  position: string | null;
  confidence: number;
  rating?: number | null;
  overall?: number | null;
  overall_rating?: number | null;
};

// export function getNeedsMoreRatingsDisplayRating(
//   item: NeedsMoreRatingsItem
// ): number | null {
//   const candidates = [item.rating, item.overall, item.overall_rating];

//   for (const candidate of candidates) {
//     if (typeof candidate === 'number' && Number.isFinite(candidate)) {
//       return candidate;
//     }
//   }

//   return null;
// }

async function fetchJson<T>(input: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(input, {
    method: 'GET',
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchNeedsMoreRatings(
  signal?: AbortSignal
): Promise<NeedsMoreRatingsResponse> {
  return fetchJson<NeedsMoreRatingsResponse>(
    `/api/homepage/needs-more-ratings?limit=${HOMEPAGE_ITEMS_LIMIT}`,
    signal
  );
}
