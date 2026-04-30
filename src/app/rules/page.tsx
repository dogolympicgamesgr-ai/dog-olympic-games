export default function RulesPage() {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>📋</div>
      <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(2rem, 6vw, 3.5rem)', letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        Rules / Κανονισμοί
      </h1>
      <p style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
        Coming Soon / Σύντομα
      </p>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '480px', lineHeight: 1.7 }}>
        The official competition and participation rules for Canathlon.
      </p>
    </div>
  )
}