'use client'
import { useLang } from '@/context/LanguageContext'

export default function TeamPage() {
  const { t } = useLang()
  return (
    <main style={{
      minHeight: '100vh', background: 'var(--bg)',
      paddingTop: 'calc(var(--nav-height) + 2rem)',
      paddingBottom: '3rem',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</p>
        <h1 style={{
          fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem',
          color: 'var(--text-primary)', letterSpacing: '0.05em', marginBottom: '0.5rem',
        }}>
          {t('Σελίδα Ομάδας', 'Team Page')}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Coming soon</p>
      </div>
    </main>
  )
}