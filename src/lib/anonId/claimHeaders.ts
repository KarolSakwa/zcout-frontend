import { MAX_LEGACY_ANON_IDS } from './constants';
import { isValidAnonId, parseLegacyAnonHeader } from './legacy';
import type { ResolvedAnonId } from './resolve';

export function buildClaimAnonHeaders(
  resolved: ResolvedAnonId,
  extraLegacyIds: string[] = [],
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Zcout-Anon': resolved.canonical,
  };

  const legacyIds = [
    ...resolved.claimAnonIds.filter((id) => id !== resolved.canonical),
    ...extraLegacyIds,
  ]
    .filter((id, index, all) => all.indexOf(id) === index)
    .filter((id) => isValidAnonId(id) && id !== resolved.canonical)
    .slice(0, MAX_LEGACY_ANON_IDS);

  if (legacyIds.length > 0) {
    headers['X-Zcout-Anon-Legacy'] = legacyIds.join(',');
  }

  return headers;
}

export function buildClaimAnonHeadersFromRequest(
  req: Request,
  resolved: ResolvedAnonId,
): Record<string, string> {
  const clientLegacy = parseLegacyAnonHeader(
    req.headers.get('x-zcout-anon-legacy'),
  );

  return buildClaimAnonHeaders(resolved, clientLegacy);
}
