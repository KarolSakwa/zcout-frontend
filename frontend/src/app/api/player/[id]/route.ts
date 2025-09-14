type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const base = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/?$/, "/");
  const r = await fetch(`${base}player/${params.id}`, { cache: "no-store" });
  const data = await r.json();
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
