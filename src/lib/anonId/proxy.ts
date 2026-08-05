import type { ResolvedAnonId } from './resolve';
import { resolveServerAnonId } from './server';

export function resolveAnonForBff(
  req: Request,
  options?: { allowCreate?: boolean },
): ResolvedAnonId {
  return resolveServerAnonId(req, options);
}

export function buildUpstreamAnonHeaders(
  resolved: ResolvedAnonId,
): Record<string, string> {
  if (!resolved.canonical) {
    return {};
  }

  return {
    'X-Zcout-Anon': resolved.canonical,
  };
}
