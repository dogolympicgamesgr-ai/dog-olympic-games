'use client'
import { useLang } from '@/context/LanguageContext'

export default function EditProfilePage() {
  const { t } = useLang()
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 1.5rem' }}>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
          ✏️ {t('Επεξεργασία Προφίλ', 'Edit Profile')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Coming soon</p>
      </div>
    </main>
  )
}