'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'

type EventFilter = 'pending' | 'approved' | 'completed' | 'cancelled'

export default function OrganizerPanelPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()

  const [checking, setChecking] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<EventFilter>('pending')
  const [cancelling, setCancelling] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const res = await fetch('/auth/session')
      const { user, roles } = await res.json()
      if (!user) { router.push('/'); return }
      if (!roles?.includes('organizer')) { router.push('/dashboard'); return }
      setUserId(user.id)
      setChecking(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (userId) loadEvents()
  }, [userId, filter])

  async function loadEvents() {
    setLoading(true)
    const { data } = await supabase
      .from('events')
      .select('id, title_el, title_en, event_date, location, status')
      .eq('created_by', userId)
      .eq('status', filter)
      .order('event_date', { ascending: false })
    setEvents(data || [])
    setLoading(false)
  }

  async function cancelEvent(id: string, titleEl: string) {
    if (!confirm(t(`Να ακυρωθεί ο αγώνας "${titleEl}";`, `Cancel event "${titleEl}"?`))) return
    setCancelling(id)
    await supabase.from('events').update({ status: 'cancelled' }).eq('id', id)
    setCancelling(null)
    loadEvents()
  }

  if (checking) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )

  const statusColor = (s: string) =>
    s === 'approved' ? '#7ef7a0' :
    s === 'completed' ? '#7eb8f7' :
    s === 'cancelled' ? '#f77e7e' :
    'var(--accent)'

  const tabStyle = (tab: EventFilter) => ({
    background: filter === tab ? 'var(--accent)' : 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '0.4rem 1rem',
    color: filter === tab ? 'var(--bg)' : 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    fontWeight: filter === tab ? 700 : 400,
    textTransform: 'capitalize' as const,
  })

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1.5rem' }}>

        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.2rem', color: 'var(--accent)', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>
          📋 {t('Πίνακας Διοργανωτή', 'Organizer Panel')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          {t('Διαχείριση των αγώνων σου', 'Manage your events')}
        </p>

        {/* Create new event shortcut */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--accent)',
          borderRadius: '12px', padding: '1rem 1.25rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '1.5rem',
        }}>
          <div>
            <p style={{ color: 'var(--text-primary)', fontWeight: 600, margin: 0 }}>
              {t('Δημιουργία Νέου Αγώνα', 'Create New Event')}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
              {t('Υποβολή για έγκριση από διαχειριστή', 'Submitted for admin approval')}
            </p>
          </div>
          <button
            onClick={() => router.push('/events/create')}
            style={{
              background: 'var(--accent)', border: 'none', borderRadius: '8px',
              padding: '0.6rem 1.25rem', color: 'var(--bg)',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
              fontSize: '0.85rem', flexShrink: 0,
            }}
          >
            + {t('Νέος Αγώνας', 'New Event')}
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {(['pending', 'approved', 'completed', 'cancelled'] as EventFilter[]).map(s => (
            <button key={s} onClick={() => setFilter(s)} style={tabStyle(s)}>{t(
              s === 'pending' ? 'Σε Αναμονή' :
              s === 'approved' ? 'Εγκεκριμένοι' :
              s === 'completed' ? 'Ολοκληρωμένοι' : 'Ακυρωμένοι',
              s === 'pending' ? 'Pending' :
              s === 'approved' ? 'Approved' :
              s === 'completed' ? 'Completed' : 'Cancelled'
            )}</button>
          ))}
        </div>

        {/* Events list */}
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>{t('Φόρτωση...', 'Loading...')}</p>
        ) : events.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '2.5rem', textAlign: 'center',
          }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {t('Δεν υπάρχουν αγώνες σε αυτή την κατηγορία', 'No events in this category')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {events.map(event => (
              <div key={event.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '1rem 1.25rem',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
              }}>
                <div
                  onClick={() => router.push(`/events/${event.id}`)}
                  style={{ flex: 1, cursor: 'pointer' }}
                >
                  <p style={{ color: 'var(--text-primary)', fontWeight: 600, margin: 0 }}>
                    {event.title_el}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginLeft: '0.35rem' }}>→</span>
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>
                    {event.location || '—'} · {event.event_date ? new Date(event.event_date).toLocaleDateString('el-GR') : '—'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <span style={{
                    background: 'var(--bg)', borderRadius: '6px',
                    padding: '0.3rem 0.65rem', fontSize: '0.75rem',
                    color: statusColor(event.status),
                  }}>{event.status}</span>
                  {event.status === 'pending' && (
                    <button
                      onClick={() => cancelEvent(event.id, event.title_el)}
                      disabled={cancelling === event.id}
                      style={{
                        background: 'transparent', border: '1px solid #f77e7e',
                        borderRadius: '6px', padding: '0.3rem 0.75rem',
                        color: '#f77e7e', cursor: 'pointer', fontSize: '0.78rem',
                        fontFamily: 'Outfit, sans-serif',
                        opacity: cancelling === event.id ? 0.6 : 1,
                      }}
                    >
                      {cancelling === event.id ? '...' : t('Ακύρωση', 'Cancel')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
