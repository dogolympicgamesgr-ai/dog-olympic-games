'use client'
import { useLang } from '@/context/LanguageContext'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardDrawer({ open, onClose }: {
  open: boolean, onClose: () => void
}) {
  const { t } = useLang()
  const supabase = createClient()
  const router = useRouter()

  async function handleLogout() {
    onClose()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const menuItems = [
    { href: '/profile/edit', icon: '✏️', el: 'Επεξεργασία Προφίλ', en: 'Edit Profile' },
    { href: '/profile/dogs', icon: '🐕', el: 'Οι Σκύλοι μου', en: 'My Dogs' },
    { href: '/profile/team', icon: '👥', el: 'Η Ομάδα μου', en: 'My Team' },
  ]

  if (!open) return null

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 500, backdropFilter: 'blur(4px)',
      }} />
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: '300px', maxWidth: '85vw',
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        zIndex: 600, display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        <div style={{
          padding: '1.5rem', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.2rem', color: 'var(--accent)', letterSpacing: '0.05em' }}>
            {t('ΜΕΝΟΥ', 'MENU')}
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            fontSize: '1.2rem', cursor: 'pointer',
          }}>✕</button>
        </div>

        <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {menuItems.map(item => (
            <Link key={item.href} href={item.href} onClick={onClose} style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '1rem 1.25rem',
              color: 'var(--text-primary)', textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              fontSize: '0.95rem', fontWeight: 500,
              fontFamily: 'Outfit, sans-serif',
            }}>
              <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
              {t(item.el, item.en)}
            </Link>
          ))}

          <button onClick={handleLogout} style={{
            marginTop: '1rem',
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '1rem 1.25rem',
            color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            fontSize: '0.95rem', fontFamily: 'Outfit, sans-serif',
          }}>
            <span style={{ fontSize: '1.3rem' }}>🚪</span>
            {t('Αποσύνδεση', 'Logout')}
          </button>
        </div>
      </div>
    </>
  )
}