import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main
        style={{
        minHeight: 'calc(100vh - 57px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px',
        }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          border: '1px solid rgba(120,160,255,0.14)',
          borderRadius: 24,
          background: 'rgba(8,14,24,0.42)',
          backdropFilter: 'blur(10px)',
          padding: '48px 40px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div
          style={{
            fontSize: 72,
            lineHeight: 1,
            fontWeight: 900,
            letterSpacing: '-0.06em',
            color: 'var(--ui-text-primary)',
          }}
        >
          404
        </div>

        <div
          style={{
            width: 64,
            height: 2,
            background: 'var(--ui-accent-primary)',
            margin: '0 auto',
          }}
        />

        <h1
          style={{
            margin: 0,
            fontSize: 30,
            lineHeight: 1.2,
            fontWeight: 800,
            letterSpacing: '-0.04em',
            textTransform: 'uppercase',
          }}
        >
          Looks like this route never made it into the first team.
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: 16,
            lineHeight: 1.8,
            color: 'rgba(255,255,255,0.72)',
          }}
        >
          The page may have been removed, renamed or never existed in the current database.
        </p>

        <div
          style={{
            marginTop: 8,
          }}
        >
          <Link
            href="/duels"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 24px',
              borderRadius: 12,
              border: '1px solid rgba(120,160,255,0.22)',
              background: 'rgba(12,18,30,0.82)',
              color: 'var(--ui-text-primary)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Return to duels
          </Link>
        </div>
      </div>
    </main>
  );
}