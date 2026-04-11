'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'

const TYPE_ICONS: Record<string, string> = {
  team_accepted:    '👥',
  team_removed:     '👥',
  no_show_warning:  '⚠️',
  penalty:          '🚫',
  result_published: '🏆',
  level_up:         '⬆️',
  role_assigned:    '🎖️',
  banned:           '🔴',
}

export default function NotificationsPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const res = await fetch('/auth/session')
      const { user } = await res.json()
      if (!user) { router.push('/'); return }
      await loadNotifications(user.id)
    }
    init()
  }, [])

  async function loadNotifications(userId: string) {
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setNotifications(data || [])
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
    setLoading(false)
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      paddingTop: 'calc(var(--nav-height) + 2rem)',
      paddingBottom: '3rem',
    }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 1.5rem' }}>
        <h1 style={{
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: '2rem', letterSpacing: '0.05em',
          color: 'var(--text-primary)', marginBottom: '1.5rem',
        }}>
          🔔 {t('Ειδοποιήσεις', 'Notifications')}
        </h1>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>{t('Φόρτωση...', 'Loading...')}</p>
        ) : notifications.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '3rem',
            textAlign: 'center', color: 'var(--text-secondary)',
          }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔕</p>
            <p>{t('Δεν υπάρχουν ειδοποιήσεις', 'No notifications yet')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {notifications.map(n => (
              <div key={n.id} style={{
                background: 'var(--bg-card)',
                border: `1px solid ${n.read ? 'var(--border)' : 'var(--accent)'}`,
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                display: 'flex', gap: '1rem', alignItems: 'flex-start',
                opacity: n.read ? 0.8 : 1,
              }}>
                <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>
                  {TYPE_ICONS[n.type] || '🔔'}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{
                    color: 'var(--text-primary)', fontWeight: 600,
                    fontSize: '0.95rem', marginBottom: '0.25rem',
                  }}>
                    {t(n.title_el, n.title_en)}
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {t(n.message_el, n.message_en)}
                  </p>
                </div>
                <span style={{
                  color: 'var(--text-secondary)', fontSize: '0.75rem',
                  flexShrink: 0, paddingTop: '0.1rem',
                }}>
                  {timeAgo(n.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}