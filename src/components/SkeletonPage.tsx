import Link from 'next/link'

interface SkeletonPageProps {
  icon: string
  title: string
  subtitle: string
  comingSoon?: string
}

export default function SkeletonPage({ icon, title, subtitle, comingSoon = 'Σύντομα διαθέσιμο' }: SkeletonPageProps) {
  return (
    <div style={{
      minHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      textAlign: 'center',
    }}>
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(232,185,79,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{icon}</div>
        <h1 style={{
          fontSize: 'clamp(3rem, 8vw, 5rem)',
          color: 'var(--accent)',
          marginBottom: '1rem',
        }}>
          {title}
        </h1>
        <p style={{
          fontSize: '1.1rem',
          color: 'var(--text-secondary)',
          maxWidth: '400px',
          lineHeight: 1.6,
          marginBottom: '0.5rem',
        }}>
          {subtitle}
        </p>
        <p style={{
          fontSize: '0.9rem',
          color: 'var(--border)',
          marginBottom: '2.5rem',
        }}>
          {comingSoon}
        </p>

        <Link href="/" style={{
          color: 'var(--accent)',
          textDecoration: 'none',
          fontSize: '0.9rem',
          fontWeight: 600,
          letterSpacing: '0.03em',
          borderBottom: '1px solid var(--accent)',
          paddingBottom: '2px',
        }}>
          ← Επιστροφή στην αρχή
        </Link>
      </div>
    </div>
  )
}
