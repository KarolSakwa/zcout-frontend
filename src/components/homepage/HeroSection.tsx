import GlobalSearch from '@/components/GlobalSearch';

export default function HeroSection() {
  return (
    <section>
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
        Community-built football intelligence.
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