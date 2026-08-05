export type AnonIdSources = {
  cookieAnon?: string | null;
  cookieAnonId?: string | null;
  localStorageAnonId?: string | null;
};

export type ResolvedAnonId = {
  /** Canonical voter lock key (raw UUID string). */
  canonical: string;
  /** True when no prior identifier existed in any source. */
  created: boolean;
  /** Distinct IDs to send to claim-anon (canonical first). */
  claimAnonIds: string[];
};

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Picks the canonical anonymous id using product priority:
 * zcout_anon → zcout_anon_id → localStorage zcout_anon_id → new id.
 */
export function resolveCanonicalAnonIdFromSources(
  sources: AnonIdSources,
  createId: () => string,
): ResolvedAnonId {
  const cookieAnon = trimOrNull(sources.cookieAnon);
  const cookieAnonId = trimOrNull(sources.cookieAnonId);
  const localStorageAnonId = trimOrNull(sources.localStorageAnonId);

  const existing = cookieAnon ?? cookieAnonId ?? localStorageAnonId;
  const canonical = existing ?? createId();
  const created = existing === null;

  const distinct = new Set<string>();
  for (const id of [cookieAnon, cookieAnonId, localStorageAnonId]) {
    if (id) {
      distinct.add(id);
    }
  }

  const claimAnonIds = [
    canonical,
    ...[...distinct].filter((id) => id !== canonical),
  ];

  return { canonical, created, claimAnonIds };
}
