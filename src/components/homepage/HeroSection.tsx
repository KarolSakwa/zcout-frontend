import GlobalSearch from '@/components/GlobalSearch';

export default function HeroSection() {
  return (
    <section
      style={{
        padding: '48px',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: '44px',
          lineHeight: 1.05,
          fontWeight: 800,
          maxWidth: '700px',
        }}
      >
        The crowd&apos;s view
        <br />
        <span style={{ color: 'var(--ui-accent-primary)' }}>
          of footballers.
        </span>
      </h1>

      <p
        style={{
          marginTop: '20px',
          maxWidth: '520px',
          color: 'var(--ui-text-muted)',
          fontSize: '16px',
          lineHeight: 1.6,
        }}
      >
        Zcout is a community-driven scouting database.
        <br />
        Real opinions. Live ratings. Always evolving.
      </p>

      <div
        style={{
          marginTop: '32px',
          maxWidth: '600px',
        }}
      >
        <GlobalSearch />
      </div>
    </section>
  );
}