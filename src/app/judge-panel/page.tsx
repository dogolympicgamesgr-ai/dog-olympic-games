'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'

export default function JudgePanelPage() {
  const { t } = useLang()
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function init() {
      const res = await fetch('/auth/session')
      const { user, roles } = await res.json()
      if (!user) { router.push('/'); return }
      if (!roles?.includes('judge')) { router.push('/dashboard'); return }
      setChecking(false)
    }
    init()
  }, [])

  if (checking) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1.5rem' }}>

        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.2rem', color: 'var(--accent)', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>
          ⚖️ {t('Πίνακας Κριτή', 'Judge Panel')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2.5rem' }}>
          {t('Η διαχείριση των αγώνων σου ως κριτής', 'Manage your events as a judge')}
        </p>

        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center',
        }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚖️</p>
          <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem', color: 'var(--text-primary)', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>
            {t('Σύντομα Διαθέσιμο', 'Coming Soon')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '380px', margin: '0 auto' }}>
            {t(
              'Εδώ θα μπορείς να βλέπεις τους αγώνες που έχεις οριστεί κριτής, να αποδέχεσαι ή να απορρίπτεις προσκλήσεις και να βαθμολογείς.',
              'Here you will be able to view events where you are assigned as judge, accept or decline invitations, and submit scores.'
            )}
          </p>
        </div>

      </div>
    </main>
  )
}
