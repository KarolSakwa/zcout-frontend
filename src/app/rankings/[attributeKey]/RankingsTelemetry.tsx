'use client';

import { useEffect } from 'react';
import { logEvent } from '@/lib/telemetry';

type Props = {
  attributeKey: string;
  position: string;
  sort: string;
  dir: string;
  page: number;
  search: string;
};

export default function RankingsTelemetry({
  attributeKey,
  position,
  sort,
  dir,
  page,
  search,
}: Props) {
  useEffect(() => {
    logEvent('ranking_opened', {
      attribute_key: attributeKey,
      position,
      sort,
      dir,
      page,
      search: search || null,
    });
  }, [attributeKey, position, sort, dir, page, search]);

  return null;
}