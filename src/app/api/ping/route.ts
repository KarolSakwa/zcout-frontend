export async function GET() {
  const backend = process.env.BACKEND_URL!;
  const r = await fetch(`${backend}/api/ping`, { cache: 'no-store' });
  const text = await r.text();

  return new Response(text, {
    status: r.status,
    headers: { 'Content-Type': r.headers.get('content-type') ?? 'application/json' },
  });
}