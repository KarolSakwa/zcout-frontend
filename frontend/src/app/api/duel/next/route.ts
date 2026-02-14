/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

const ATTR_MAP: Record<string, string> = {
  DRI: "dribbling",
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const attrRaw = url.searchParams.get("attr") ?? "DRI";
  const attrKey = ATTR_MAP[attrRaw.toUpperCase()] ?? attrRaw.toLowerCase();

  try {
    const res = await fetch(
      `${API_BASE}/api/duels/next?attribute=${encodeURIComponent(attrKey)}`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Backend error: ${res.status} ${txt.slice(0, 200)}` },
        { status: 500 }
      );
    }

    const data = await res.json();

    const players = Array.isArray(data.players) ? data.players : [];
    if (players.length < 2) {
      return NextResponse.json(
        { error: "Not enough players (need >= 2)" },
        { status: 500 }
      );
    }

    const mapPlayer = (p: any) => {
      const nation = (p.country ?? "").toLowerCase();
      return {
        player_id: p.id,
        name: p.name,
        number: p.number ?? null,
        avatar_url: `/players/${p.id}.png`,
        flag_url: nation ? `/flags/${nation}.png` : undefined,
        club: {
          name: p.club?.name ?? null,
          color_primary: p.club?.color_primary ?? "#1f2937",
          color_accent: p.club?.color_secondary ?? "#111827",
        },
        league: { code: null, name: null },
        nation_code: p.country ?? null,
        position: { code: p.position ?? "ST", name: p.position ?? "ST" },
      };
    };

    return NextResponse.json({
      attr: attrRaw,
      duel_id: data.duel_id ?? null,
      players: players.map(mapPlayer),
      source: "laravel",
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Proxy error" }, { status: 500 });
  }
}
