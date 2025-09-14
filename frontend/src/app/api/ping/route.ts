export async function GET() {
  const base = process.env.NEXT_PUBLIC_API_BASE!;
  const r = await fetch(`${base}/`, { cache: "no-store" });
  const json = await r.json();
  return new Response(JSON.stringify({ ok: true, backend: json }), {
    headers: { "Content-Type": "application/json" },
  });
}
