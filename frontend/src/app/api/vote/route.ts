/* eslint-disable @typescript-eslint/no-explicit-any */

// frontend/src/app/api/vote/route.ts
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.text(); // przekaż surowy JSON dalej
    const upstream = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: "Proxy /api/vote failed", message: e?.message ?? String(e) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
