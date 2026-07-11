'use client';

import { useEffect, useState } from 'react';
import FeaturedAttributeRankingWidget, {
  type FeaturedRankingAttribute,
  type FeaturedRankingPlayer,
  type FeaturedRankingResponse,
} from '@/components/homepage/FeaturedAttributeRankingWidget';
import { useHomepageSectionLoading } from '@/components/homepage/HomepageLoadingContext';

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

export async function fetchFeaturedRanking(
  signal?: AbortSignal,
): Promise<FeaturedRankingResponse> {
  return fetchJson<FeaturedRankingResponse>('/api/homepage/featured-ranking', signal);
}

export default function FeaturedAttributeRankingSection() {
  const [attribute, setAttribute] = useState<FeaturedRankingAttribute | null>(null);
  const [players, setPlayers] = useState<FeaturedRankingPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useHomepageSectionLoading('featuredRanking', isLoading);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setHasError(false);

    fetchFeaturedRanking(controller.signal)
      .then((data) => {
        setAttribute(data.attribute ?? null);
        setPlayers(Array.isArray(data.players) ? data.players : []);
      })
      .catch(() => {
        setAttribute(null);
        setPlayers([]);
        setHasError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <FeaturedAttributeRankingWidget
      attribute={attribute}
      players={players}
      isLoading={isLoading}
      hasError={hasError}
      embedded
    />
  );
}
