/* eslint-disable @typescript-eslint/no-explicit-any */

export type VoteIn = {
  attribute: string;
  playerA_id: string;
  playerB_id: string;
  winner_id: string;
  ratingA: number;
  ratingB: number;
  posA: string;
  posB: string;
  duel_id?: string;
  user_id?: string;
  meta?: Record<string, any>;
};

export type VotePreviewResponse = {
  ok: boolean;
  ts: string;
  pair: string;
  attribute: string;
  written: number;
  preview: {
    pA: number;
    n: number;
    ratingA: number;
    ratingB: number;
    newA: number;
    newB: number;
    deltaA: number;
    deltaB: number;
    impactA: number;
    impactB: number;
  };
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
if (!API_BASE) {
  throw new Error("NEXT_PUBLIC_API_BASE is not defined");
}

export async function postVote(payload: VoteIn): Promise<VotePreviewResponse> {
  const res = await fetch(`${API_BASE}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST /api/vote failed: ${res.status} ${res.statusText} ${text}`);
  }

  return res.json();
}
