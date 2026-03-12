export const dynamic = "force-dynamic";

const ORIGIN = process.env.APP_ORIGIN || "http://localhost:3000";

function readCookieFromReq(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const parts = cookie.split(";").map((s) => s.trim());
  const hit = parts.find((p) => p.startsWith(`${name}=`));
  if (!hit) return null;
  return decodeURIComponent(hit.substring(name.length + 1));
}

export async function POST(req: Request) {
  try {
    const anonId = readCookieFromReq(req, "zcout_anon_id");
    const cookieHeader = req.headers.get("cookie");
    const xsrfCookie = readCookieFromReq(req, "XSRF-TOKEN");

    const headers: Record<string, string> = {
      Accept: "application/json",
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
      "X-Requested-With": "XMLHttpRequest",
    };
    if (anonId) headers["X-Zcout-Anon"] = anonId;
    if (cookieHeader) headers["Cookie"] = cookieHeader;
    if (xsrfCookie) headers["X-XSRF-TOKEN"] = xsrfCookie;

    const upstream = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/auth/claim-anon`, {
      method: "POST",
      headers,
      cache: "no-store",
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: "Proxy /api/auth/claim-anon failed", message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}