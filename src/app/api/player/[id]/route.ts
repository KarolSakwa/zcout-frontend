import pool from "@/lib/db";
import { NextResponse } from "next/server";

// ważne w dev – bez cache
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { rows } = await pool.query(
      `
      SELECT
        p.player_id,
        p.name,
        p.avatar_url,
        c.name        AS club_name,
        c.color_primary,
        c.color_accent,
        l.code        AS league_code,
        l.name        AS league_name,
        n.code        AS nation_code,
        n.flag_url    AS nation_flag_file,
        pos.code      AS position_code,
        pos.name      AS position_name
      FROM players p
      JOIN clubs     c   ON p.club_id       = c.id
      JOIN leagues   l   ON c.league_id     = l.id
      JOIN nations   n   ON p.nation_code   = n.code
      JOIN positions pos ON p.position_code = pos.code
      WHERE p.player_id = $1
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const r = rows[0];

    const avatar_url =
      r.avatar_url && r.avatar_url.startsWith("/")
        ? r.avatar_url
        : `/players/${r.player_id}.png`;

    const flag_url = `/flags/${r.nation_flag_file ?? `${r.nation_code?.toLowerCase?.() ?? "unknown"}.png`}`;

    return NextResponse.json({
      player_id: r.player_id,
      name: r.name,
      avatar_url,
      flag_url,
      club: {
        name: r.club_name,
        color_primary: r.color_primary,
        color_accent: r.color_accent,
      },
      league: {
        code: r.league_code,
        name: r.league_name,
      },
      nation_code: r.nation_code,
      position: {
        code: r.position_code,
        name: r.position_name,
      },
    });
  } catch (err) {
    // Fallback bez rewolucji: jeśli DB nie działa, zwróć minimalne dane z /public
    console.error("GET /api/player/[id] error:", err);

    // proste seed’y dla trybu bez DB
    const seeds: Record<
      string,
      {
        name: string;
        avatar_url: string;
        flag_url: string;
        club_name: string;
        color_primary: string;
        position_code: string;
      }
    > = {
      martinelli: {
        name: "Gabriel Martinelli",
        avatar_url: "/players/martinelli.png",
        flag_url: "/flags/brazil.png",
        club_name: "Arsenal",
        color_primary: "#C0002B",
        position_code: "LW",
      },
      mudryk: {
        name: "Mykhailo Mudryk",
        avatar_url: "/players/mudryk.png",
        flag_url: "/flags/ukraine.png",
        club_name: "Chelsea",
        color_primary: "#034694",
        position_code: "LW",
      },
    };

    const s = seeds[id];
    if (!s) {
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    return NextResponse.json({
      player_id: id,
      name: s.name,
      avatar_url: s.avatar_url,
      flag_url: s.flag_url,
      club: {
        name: s.club_name,
        color_primary: s.color_primary,
        color_accent: s.color_primary,
      },
      league: {
        code: "EPL",
        name: "Premier League",
      },
      nation_code: id === "martinelli" ? "BRA" : "UKR",
      position: {
        code: s.position_code,
        name: s.position_code,
      },
    });
  }
}
