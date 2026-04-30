'use client'
import { useLang } from '@/context/LanguageContext'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function BannedPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🚫</div>

      <h1 style={{
        fontFamily: 'Bebas Neue, sans-serif',
        fontSize: 'clamp(2rem, 6vw, 3rem)',
        letterSpacing: '0.05em',
        color: 'var(--text-primary)',
        margin: '0 0 0.5rem',
      }}>
        {t('Ο λογαριασμός σας έχει ανασταλεί', 'Your account has been suspended')}
      </h1>

      <p style={{
        color: 'var(--text-secondary)',
        fontSize: '0.95rem',
        maxWidth: '440px',
        lineHeight: 1.7,
        marginBottom: '2rem',
      }}>
        {t(
          'Ο λογαριασμός σας έχει απενεργοποιηθεί από τη διαχείριση. Για περισσότερες πληροφορίες επικοινωνήστε μαζί μας.',
          'Your account has been deactivated by the administration. For more information please contact us.'
        )}
      </p>

      <a
        href="mailto:info@canathlon.com"
        style={{
          display: 'inline-block',
          background: 'var(--accent)',
          color: 'var(--bg)',
          borderRadius: '10px',
          padding: '0.75rem 2rem',
          fontWeight: 700,
          fontFamily: 'Outfit, sans-serif',
          fontSize: '0.95rem',
          textDecoration: 'none',
          marginBottom: '1rem',
        }}
      >
        {t('Επικοινωνία', 'Contact Us')}
      </a>

      <button
        onClick={handleSignOut}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          cursor: 'pointer',
          fontFamily: 'Outfit, sans-serif',
          textDecoration: 'underline',
        }}
      >
        {t('Αποσύνδεση', 'Sign out')}
      </button>
    </div>
  )
}
