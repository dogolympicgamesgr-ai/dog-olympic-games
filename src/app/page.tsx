import Link from 'next/link'

const sections = [
  { href: '/events', icon: '🏆', el: 'Αγώνες', desc_el: 'Επίσημοι αγώνες & αποτελέσματα' },
  { href: '/judges', icon: '⚖️', el: 'Κριτές', desc_el: 'Γνωρίστε τους κριτές μας' },
  { href: '/teams', icon: '🐕', el: 'Ομάδες', desc_el: 'Ομάδες & συμμετοχές' },
  { href: '/seminars', icon: '📚', el: 'Σεμινάρια', desc_el: 'Εκπαίδευση & σεμινάρια' },
  { href: '/ranking', icon: '📊', el: 'Κατάταξη', desc_el: 'Παγκόσμια κατάταξη' },
]

export default function Home() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{`
        .section-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.75rem 1.5rem;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          transition: border-color 0.2s, background 0.2s, transform 0.2s;
        }
        .section-card:hover {
          border-color: var(--accent);
          background: var(--bg-card-hover);
          transform: translateY(-2px);
        }
        .hero-btn-primary {
          background: var(--accent);
          color: var(--bg);
          padding: 0.85rem 2rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 700;
          font-size: 1rem;
          letter-spacing: 0.03em;
          transition: background 0.2s;
        }
        .hero-btn-primary:hover { background: var(--accent-hover); }
        .hero-btn-secondary {
          background: transparent;
          color: var(--text-primary);
          padding: 0.85rem 2rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 1rem;
          border: 1px solid var(--border);
          transition: border-color 0.2s, color 0.2s;
        }
        .hero-btn-secondary:hover { border-color: var(--accent); color: var(--accent); }
      `}</style>

      {/* Hero */}
      <section style={{
        minHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem 1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(232,185,79,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', lineHeight: 1 }}>🐾</div>

          <h1 style={{
            fontSize: 'clamp(3rem, 10vw, 7rem)',
            lineHeight: 0.95,
            color: 'var(--text-primary)',
            marginBottom: '0.5rem',
          }}>
            DOG OLYMPIC
          </h1>
          <h1 style={{
            fontSize: 'clamp(3rem, 10vw, 7rem)',
            lineHeight: 0.95,
            color: 'var(--accent)',
            marginBottom: '1.5rem',
          }}>
            GAMES
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
            color: 'var(--text-secondary)',
            maxWidth: '520px',
            margin: '0 auto 2rem',
            lineHeight: 1.6,
            fontWeight: 300,
          }}>
            Το επίσημο άθλημα για σκύλους και τους ιδιοκτήτες τους.
            Αγώνες, ομάδες, κατάταξη — όλα σε ένα μέρος.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/events" className="hero-btn-primary">Δες τους Αγώνες</Link>
            <Link href="/ranking" className="hero-btn-secondary">Κατάταξη</Link>
          </div>
        </div>
      </section>

      {/* Sections Grid */}
      <section style={{
        padding: '4rem 1.5rem',
        maxWidth: '1100px',
        margin: '0 auto',
      }}>
        <h2 style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          textAlign: 'center',
          marginBottom: '3rem',
          color: 'var(--text-primary)',
        }}>
          ΕΞΕΡΕΥΝΗΣΕ
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}>
          {sections.map(section => (
            <Link key={section.href} href={section.href} className="section-card">
              <span style={{ fontSize: '2rem' }}>{section.icon}</span>
              <h3 style={{
                fontSize: '1.4rem',
                color: 'var(--text-primary)',
                fontFamily: 'Bebas Neue, sans-serif',
                letterSpacing: '0.04em',
              }}>
                {section.el}
              </h3>
              <p style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}>
                {section.desc_el}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: '0.85rem',
      }}>
        © 2026 Dog Olympic Games. All rights reserved.
      </footer>
    </div>
  )
}
