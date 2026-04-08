'use client'
import { useState } from 'react'
import { useLang } from '@/context/LanguageContext'
import EditProfile from '@/components/dashboard/EditProfile'
import MyDogs from '@/components/dashboard/MyDogs'
import MyTeam from '@/components/dashboard/MyTeam'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type DrawerView = 'menu' | 'edit-profile' | 'my-dogs' | 'my-team'

export default function DashboardDrawer({ open, onClose, onRefresh, profile, dogs, team }: {
  open: boolean, onClose: () => void, onRefresh: () => void,
  profile: any, dogs: any[], team: any
}) {
  const { t } = useLang()
  const [view, setView] = useState<DrawerView>('menu')
  const router = useRouter()
  const supabase = createClient()

  function handleClose() {
    setView('menu')
    onClose()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const menuItems = [
    { id: 'edit-profile', icon: '👤', el: 'Επεξεργασία Προφίλ', en: 'Edit Profile' },
    { id: 'my-dogs', icon: '🐕', el: 'Οι Σκύλοι μου', en: 'My Dogs' },
    { id: 'my-team', icon: '👥', el: 'Η Ομάδα μου', en: 'My Team' },
  ]

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 500, backdropFilter: 'blur(4px)',
      }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: '300px', maxWidth: '85vw',
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        zIndex: 600, display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.2rem', color: 'var(--accent)', letterSpacing: '0.05em' }}>
            {view === 'menu' ? t('ΜΕΝΟΥ', 'MENU') :
             view === 'edit-profile' ? t('ΕΠΕΞΕΡΓΑΣΙΑ', 'EDIT PROFILE') :
             view === 'my-dogs' ? t('ΟΙ ΣΚΥΛΟΙ ΜΟΥ', 'MY DOGS') :
             t('Η ΟΜΑΔΑ ΜΟΥ', 'MY TEAM')}
          </span>
          <button onClick={view === 'menu' ? handleClose : () => setView('menu')} style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            fontSize: '1.2rem', cursor: 'pointer',
          }}>
            {view === 'menu' ? '✕' : '←'}
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '1rem' }}>
          {view === 'menu' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {menuItems.map(item => (
                <button key={item.id} onClick={() => setView(item.id as DrawerView)} style={{
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '1rem 1.25rem',
                  color: 'var(--text-primary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  fontSize: '0.95rem', fontWeight: 500,
                  transition: 'border-color 0.2s',
                  fontFamily: 'Outfit, sans-serif',
                  textAlign: 'left',
                }}>
                  <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                  {t(item.el, item.en)}
                </button>
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
          )}

          {view === 'edit-profile' && (
            <EditProfile profile={profile} onSave={() => { onRefresh(); setView('menu') }} />
          )}

          {view === 'my-dogs' && (
            <MyDogs dogs={dogs} profile={profile} onSave={() => { onRefresh(); }} />
          )}

          {view === 'my-team' && (
            <MyTeam team={team} profile={profile} onSave={() => { onRefresh(); setView('menu') }} />
          )}
        </div>
      </div>
    </>
  )
}
