import { headers } from "next/headers";

type Player = {
  player_id: string;
  name: string;
};

async function getBaseUrl() {
  const h = await headers(); // <-- tu dodajemy await
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function fetchPlayer(base: string, id: string): Promise<Player> {
  const res = await fetch(`${base}/api/player/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load player ${id}`);
  return res.json();
}

export default async function Duel() {
  const base = await getBaseUrl();
  const [left, right] = await Promise.all([
    fetchPlayer(base, "martinelli"),
    fetchPlayer(base, "mudryk"),
  ]);

  return (
    <section style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Duel</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[left, right].map((p) => (
          <div key={p.player_id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>{p.player_id}</div>
            <div style={{ marginTop: 12, height: 140, background: "#f3f4f6", borderRadius: 8, display: "grid", placeItems: "center" }}>
              avatar / karta (wkrótce)
            </div>
            <button style={{ marginTop: 12, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb" }}>
              Wybierz {p.name}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
