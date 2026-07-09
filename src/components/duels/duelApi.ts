import { normalizePair } from "./duelUtils";
import type { PairResponse } from "./duelTypes";

export async function fetchDuelPair(signal: AbortSignal): Promise<PairResponse> {
  const res = await fetch("/api/duels/next", {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Pair fetch failed: ${res.status} ${txt.slice(0, 160)}`);
  }

  const raw = (await res.json()) as unknown;
  return normalizePair(raw);
}
