export const dynamic = 'force-dynamic';

import Link from 'next/link';
import styles from './page.module.css';

type PlayerProfileAttribute = {
  id: number;
  key: string;
  label: string;
  group: 'technical' | 'mental' | 'physical' | string;
  rating: number;
  confidence: number;
  weight_sum: number;
  votes_count: number;
  last_vote_at: string | null;
};

type PlayerProfileResponse = {
  id: number;
  name: string;
  slug: string;
  number: number | null;
  date_of_birth: string | null;
  position: string | null;
  club: {
    id: number;
    name: string;
    slug: string;
    color_primary: string | null;
    color_secondary: string | null;
    color_tertiary: string | null;
  } | null;
  country: { id: number; name: string; iso2: string | null } | null;
  overall_confidence: number;
  attributes: PlayerProfileAttribute[];
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function pctFromConfidence(c: number) {
  return clamp(Math.round(Number(c) || 0), 0, 100);
}

function groupLabel(g: string) {
  const k = String(g || '').toLowerCase();
  if (k === 'technical') return 'TECHNICAL';
  if (k === 'mental') return 'MENTAL';
  if (k === 'physical') return 'PHYSICAL';
  return k.toUpperCase();
}

function normalizeRating(r: number) {
  const v = Number(r);
  if (!Number.isFinite(v)) return 0;
  return clamp(v, 0, 99);
}

function calcAge(dobIso: string | null) {
  if (!dobIso) return null;
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age < 0 ? null : age;
}

function avgOverall(attrs: PlayerProfileAttribute[]) {
  const nums = attrs.map((a) => normalizeRating(a.rating));
  if (!nums.length) return 0;
  const sum = nums.reduce((acc, n) => acc + n, 0);
  return Math.round(sum / nums.length);
}

function pickAttr(attrs: PlayerProfileAttribute[], key: string) {
  return attrs.find((a) => a.key === key)?.rating ?? null;
}

function radarModel(attrs: PlayerProfileAttribute[]) {
  const axes = [
    { key: 'pace', label: 'PAC' },
    { key: 'acceleration', label: 'ACC' },
    { key: 'stamina', label: 'STA' },
    { key: 'strength', label: 'STR' },
    { key: 'dribbling', label: 'DRI' },
    { key: 'passing', label: 'PAS' },
    { key: 'vision', label: 'VIS' },
    { key: 'tackling', label: 'TCK' },
  ];
  const values = axes.map((a) => normalizeRating(pickAttr(attrs, a.key) ?? 0));
  return { axes, values };
}

function Radar({
  values,
  labels,
  size = 250,
  primary = 'rgba(215, 177, 90, 0.95)',
}: {
  values: number[];
  labels: string[];
  size?: number;
  primary?: string;
}) {
  const n = values.length;
  const pad = 30;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - pad;

  const ang = (i: number) => -Math.PI / 2 + (i * (2 * Math.PI)) / n;

  const pt = (radius: number, i: number) => {
    const a = ang(i);
    return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
  };

  const polyPoints = values
    .map((v, i) => {
      const rr = r * (normalizeRating(v) / 99);
      const p = pt(rr, i);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(' ');

  const rings = [0.25, 0.5, 0.75, 1].map((k) => {
    const pts = Array.from({ length: n }, (_, i) => {
      const p = pt(r * k, i);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    }).join(' ');
    return pts;
  });

  const labelPoints = labels.map((t, i) => {
    const p = pt(r + 8, i);
    const anchor =
      Math.abs(Math.cos(ang(i))) < 0.22 ? 'middle' : Math.cos(ang(i)) > 0 ? 'start' : 'end';
    return { t, x: p.x, y: p.y, anchor };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Radar">
      <defs>
        <filter id="zcoutGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 0.65 0"
            result="glow"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx={cx} cy={cy} r={r + 10} fill="rgba(10,10,12,0.55)" stroke="rgba(255,255,255,0.10)" />

      {rings.map((pts, idx) => (
        <polygon key={idx} points={pts} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      ))}

      {Array.from({ length: n }, (_, i) => {
        const p = pt(r, i);
        return (
          <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
        );
      })}

      <polygon points={polyPoints} fill={`${primary}22`} stroke={primary} strokeWidth={2} filter="url(#zcoutGlow)" />

      {labelPoints.map((l, i) => (
        <text
          key={i}
          x={l.x}
          y={l.y}
          textAnchor={l.anchor as React.SVGAttributes<SVGTextElement>['textAnchor']}
          dominantBaseline="middle"
          fontSize="10"
          fontWeight="950"
          fill="rgba(255,255,255,0.78)"
          style={{ letterSpacing: 1 }}
        >
          {l.t}
        </text>
      ))}
    </svg>
  );
}

  export default async function PlayerPage({
    params,
  }: {
    params: Promise<{ id: string }>;
  }) {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';
  const { id } = await params;

  const res = await fetch(`${API_BASE}/api/players/${encodeURIComponent(id)}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    return (
      <main style={{ padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 44, letterSpacing: 10, color: '#d7b15a', fontWeight: 900 }}>PLAYER</div>
          <Link
            href="/database"
            style={{
              color: 'rgba(255,255,255,0.85)',
              textDecoration: 'none',
              fontWeight: 900,
              letterSpacing: 2,
              fontSize: 12,
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(10,10,12,0.45)',
            }}
          >
            BACK
          </Link>
        </div>
        <div style={{ opacity: 0.7 }}>Failed to load: {res.status}</div>
      </main>
    );
  }

  const data = (await res.json()) as PlayerProfileResponse;

  const primary = data.club?.color_primary ?? '#d7b15a';
  const secondary = data.club?.color_secondary ?? 'rgba(255,255,255,0.12)';

  const age = calcAge(data.date_of_birth);
  const iso = data.country?.iso2 ? String(data.country.iso2).toUpperCase() : null;
  const flagSrc = iso ? `https://flagsapi.com/${iso}/shiny/64.png` : null;

  const overall = avgOverall(data.attributes);
  const overallConf = pctFromConfidence(data.overall_confidence);

  const grouped = data.attributes.reduce<Record<string, PlayerProfileAttribute[]>>((acc, a) => {
    const g = String(a.group || 'other');
    if (!acc[g]) acc[g] = [];
    acc[g].push(a);
    return acc;
  }, {});

  const groupOrder = ['technical', 'mental', 'physical'];
  const groups = [
    ...groupOrder.filter((g) => grouped[g]?.length),
    ...Object.keys(grouped).filter((g) => !groupOrder.includes(g)),
  ];

  const radar = radarModel(data.attributes);
  const radarPrimary = primary && primary.startsWith('#') ? primary : 'rgba(215, 177, 90, 0.95)';

  return (
    <main style={{ padding: '22px 22px 44px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 44, letterSpacing: 10, color: '#d7b15a', fontWeight: 900 }}>PLAYER</div>
          <Link
            href="/database"
            style={{
              color: 'rgba(255,255,255,0.85)',
              textDecoration: 'none',
              fontWeight: 900,
              letterSpacing: 2,
              fontSize: 12,
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(10,10,12,0.45)',
            }}
          >
            BACK
          </Link>
        </div>

        <div
          style={{
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.10)',
            background: `linear-gradient(135deg, ${primary}22 0%, rgba(10,10,12,0.72) 52%, ${secondary}14 100%)`,
            boxShadow: '0 18px 70px rgba(0,0,0,0.45)',
            padding: 18,
            marginBottom: 16,
          }}
        >
          <div className={styles.topGrid}>
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                    <div
                      style={{
                        padding: '8px 10px',
                        borderRadius: 12,
                        border: `1px solid ${primary}66`,
                        background: `${primary}14`,
                        fontWeight: 950,
                        letterSpacing: 2,
                        color: 'rgba(255,255,255,0.92)',
                        lineHeight: 1,
                      }}
                    >
                      {String(data.position ?? '—').toUpperCase()}
                    </div>

                    {data.number != null ? (
                      <div
                        style={{
                          padding: '8px 10px',
                          borderRadius: 999,
                          border: '1px solid rgba(255,255,255,0.16)',
                          background: 'rgba(10,10,12,0.55)',
                          fontWeight: 950,
                          letterSpacing: 1,
                          color: 'rgba(255,255,255,0.92)',
                          lineHeight: 1,
                        }}
                      >
                        #{data.number}
                      </div>
                    ) : null}

                    {age != null ? (
                      <div
                        style={{
                          padding: '8px 10px',
                          borderRadius: 999,
                          border: '1px solid rgba(255,255,255,0.10)',
                          background: 'rgba(255,255,255,0.04)',
                          fontWeight: 950,
                          letterSpacing: 1,
                          color: 'rgba(255,255,255,0.82)',
                          lineHeight: 1,
                        }}
                      >
                        {age}
                      </div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      fontSize: 30,
                      fontWeight: 950,
                      letterSpacing: 1,
                      color: 'rgba(255,255,255,0.96)',
                      lineHeight: 1.1,
                      maxWidth: 760,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={data.name}
                  >
                    {data.name}
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                    {data.club?.slug ? (
                      <Link
                        href={`/database/clubs/${data.club.slug}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '9px 12px',
                          borderRadius: 999,
                          border: `1px solid ${primary}66`,
                          background: 'rgba(10,10,12,0.45)',
                          fontWeight: 950,
                          letterSpacing: 1,
                          color: 'rgba(255,255,255,0.92)',
                          fontSize: 12,
                          textDecoration: 'none',
                          maxWidth: '100%',
                        }}
                        title={data.club.name}
                      >
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {data.club.name}
                        </span>
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 10, justifyItems: 'end' }}>
                  <div
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: 22,
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: 'rgba(10,10,12,0.55)',
                      display: 'grid',
                      placeItems: 'center',
                      boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
                    }}
                    aria-label="Overall"
                  >
                    <div style={{ fontSize: 42, fontWeight: 950, color: 'rgba(255,255,255,0.92)', lineHeight: 1 }}>
                      {overall}
                    </div>
                  </div>

                  <div
                    style={{
                      width: 92,
                      height: 62,
                      borderRadius: 16,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(10,10,12,0.45)',
                      display: 'grid',
                      placeItems: 'center',
                      overflow: 'hidden',
                    }}
                    aria-label="Flag"
                    title={data.country?.name ?? 'Country'}
                  >
                    {flagSrc ? (
                      <img src={flagSrc} alt={iso ?? 'flag'} width={44} height={33} style={{ display: 'block' }} />
                    ) : (
                      <div style={{ opacity: 0.55, fontWeight: 900, letterSpacing: 2, fontSize: 12 }}>—</div>
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) 58px',
                  gap: 10,
                  alignItems: 'center',
                  marginTop: 14,
                }}
              >
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${overallConf}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: 'rgba(215, 177, 90, 0.95)',
                      boxShadow: '0 0 0 1px rgba(215,177,90,0.25) inset',
                    }}
                  />
                </div>

                <div
                  style={{
                    textAlign: 'right',
                    fontWeight: 950,
                    letterSpacing: 1,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'rgba(255,255,255,0.88)',
                  }}
                >
                  {overallConf}%
                </div>
              </div>
            </div>

            <div
              style={{
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(10,10,12,0.55)',
                padding: 14,
                display: 'grid',
                justifyItems: 'center',
              }}
            >
              <Radar values={radar.values} labels={radar.axes.map((a) => a.label)} primary={radarPrimary} size={250} />
            </div>
          </div>
        </div>

        <div className={styles.groupsGrid}>
          {groups.map((g) => {
            const list = grouped[g] ?? [];
            return (
              <section
                key={g}
                style={{
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(10,10,12,0.52)',
                  boxShadow: '0 14px 60px rgba(0,0,0,0.40)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div style={{ fontWeight: 950, letterSpacing: 4, color: 'rgba(255,255,255,0.92)', fontSize: 14 }}>
                    {groupLabel(g)}
                  </div>
                  <div style={{ opacity: 0.55, letterSpacing: 2, fontSize: 11, fontWeight: 900 }}>R · C</div>
                </div>

                <div style={{ padding: 12, display: 'grid', gap: 10 }}>
                  {list.map((a) => {
                    const conf = pctFromConfidence(a.confidence);
                    const rating = Number(a.rating) || 0;

                    return (
                      <div
                        key={a.key}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 14,
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: 'rgba(255,255,255,0.04)',
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '26px minmax(0, 1fr) 84px',
                            gap: 10,
                            alignItems: 'center',
                          }}
                        >
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 7,
                              border: '1px solid rgba(255,255,255,0.12)',
                              background: 'rgba(10,10,12,0.45)',
                              display: 'grid',
                              placeItems: 'center',
                              color: 'rgba(255,255,255,0.65)',
                              fontWeight: 950,
                              fontSize: 12,
                            }}
                            aria-hidden
                          >
                            •
                          </div>

                          <div
                            style={{
                              fontWeight: 950,
                              letterSpacing: 1,
                              color: 'rgba(255,255,255,0.92)',
                              lineHeight: 1.15,
                              wordBreak: 'break-word',
                            }}
                            title={a.label}
                          >
                            {String(a.label).toUpperCase()}
                          </div>

                          <div
                            style={{
                              textAlign: 'right',
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 950,
                              color: 'rgba(255,255,255,0.92)',
                            }}
                          >
                            {rating.toFixed(2)}
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) 58px',
                            gap: 10,
                            alignItems: 'center',
                            marginTop: 10,
                            paddingLeft: 36,
                          }}
                        >
                          <div
                            style={{
                              height: 10,
                              borderRadius: 999,
                              background: 'rgba(0,0,0,0.35)',
                              border: '1px solid rgba(255,255,255,0.10)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${conf}%`,
                                height: '100%',
                                borderRadius: 999,
                                background: 'rgba(215, 177, 90, 0.95)',
                                boxShadow: '0 0 0 1px rgba(215,177,90,0.25) inset',
                              }}
                            />
                          </div>

                          <div
                            style={{
                              textAlign: 'right',
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 950,
                              color: 'rgba(255,255,255,0.85)',
                            }}
                          >
                            {conf}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
