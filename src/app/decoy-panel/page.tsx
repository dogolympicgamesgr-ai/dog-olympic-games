'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'

export default function DecoyPanelPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()

  const [checking, setChecking] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const res = await fetch('/auth/session')
      const data = await res.json()
      if (!data.user) { router.push('/'); return }
      if (!data.roles?.includes('decoy')) { router.push('/dashboard'); return }
      setSession(data)
      setChecking(false)
      await loadAssignments(data.user.id)
    }
    init()
  }, [])

  async function loadAssignments(userId: string) {
    setLoading(true)
    const { data } = await supabase
      .from('event_assignments')
      .select(`
        id, role, status, category_id,
        events!event_assignments_event_id_fkey(
          id, title_el, title_en, location, event_date, status, created_by
        ),
        event_categories(id, title_el, title_en)
      `)
      .eq('user_id', userId)
      .eq('role', 'decoy')
      .order('created_at', { ascending: false })
    setAssignments(data || [])
    setLoading(false)
  }

  async function respond(assignmentId: string, newStatus: 'accepted' | 'declined', eventCreatedBy: string | null, eventTitle: string) {
    setResponding(assignmentId)

    await supabase
      .from('event_assignments')
      .update({ status: newStatus })
      .eq('id', assignmentId)

    // Notify organizer
    if (eventCreatedBy) {
      const responderName = session?.profile?.full_name || 'A decoy'
      const statusEn = newStatus === 'accepted' ? 'accepted' : 'declined'
      const statusEl = newStatus === 'accepted' ? 'αποδέχθηκε' : 'αρνήθηκε'
      await supabase.from('notifications').insert({
        user_id: eventCreatedBy,
        type: 'assignment_response',
        title_el: `Decoy ${statusEl} την πρόσκληση`,
        title_en: `Decoy ${statusEn} the invitation`,
        message_el: `${responderName} ${statusEl} την πρόσκληση ως decoy για τον αγώνα "${eventTitle}".`,
        message_en: `${responderName} ${statusEn} the invitation as decoy for event "${eventTitle}".`,
        metadata: { role: 'decoy' },
      })
    }

    await loadAssignments(session.user.id)
    setResponding(null)
  }

  const formatDate = (iso: string) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString(t('el-GR', 'en-GB'), {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  if (checking) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )

  const pending = assignments.filter(a => a.status === 'pending')
  const upcoming = assignments.filter(a => a.status === 'accepted' && a.events?.status === 'approved')
  const past = assignments.filter(a => a.status === 'accepted' && (a.events?.status === 'completed' || a.events?.status === 'results_approved'))

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    marginBottom: '0.75rem',
  }

  const sectionLabel = (text: string) => (
    <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: 'var(--accent)', letterSpacing: '0.05em', margin: '0 0 0.75rem' }}>
      {text}
    </p>
  )

  const emptyState = (msg: string) => (
    <div style={{ ...cardStyle, textAlign: 'center', padding: '2rem' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>{msg}</p>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1.5rem' }}>

        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.2rem', color: 'var(--accent)', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>
          🎯 {t('Πίνακας Decoy', 'Decoy Panel')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2.5rem' }}>
          {t('Η διαχείριση των αγώνων σου ως decoy', 'Manage your events as a decoy')}
        </p>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>{t('Φόρτωση...', 'Loading...')}</p>
        ) : (
          <>
            {/* ── Pending invitations ── */}
            <div style={{ marginBottom: '2rem' }}>
              {sectionLabel(`🔔 ${t('Εκκρεμείς Προσκλήσεις', 'Pending Invitations')} ${pending.length > 0 ? `(${pending.length})` : ''}`)}
              {pending.length === 0
                ? emptyState(t('Δεν υπάρχουν εκκρεμείς προσκλήσεις', 'No pending invitations'))
                : pending.map(a => {
                    const ev = a.events
                    return (
                      <div key={a.id} style={{ ...cardStyle, border: '1px solid var(--accent)44' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: '0 0 0.2rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                              {t(ev?.title_el, ev?.title_en || ev?.title_el)}
                            </p>
                            {ev?.event_date && (
                              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                📅 {formatDate(ev.event_date)}
                              </p>
                            )}
                            {ev?.location && (
                              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                📍 {ev.location}
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
                            <button
                              onClick={() => respond(a.id, 'accepted', ev?.created_by, ev?.title_el || '')}
                              disabled={responding === a.id}
                              style={{ background: '#7ef7a033', border: '1px solid #7ef7a0', borderRadius: '8px', padding: '0.4rem 0.9rem', color: '#7ef7a0', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}
                            >
                              {t('Αποδοχή', 'Accept')}
                            </button>
                            <button
                              onClick={() => respond(a.id, 'declined', ev?.created_by, ev?.title_el || '')}
                              disabled={responding === a.id}
                              style={{ background: '#f77e7e33', border: '1px solid #f77e7e', borderRadius: '8px', padding: '0.4rem 0.9rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'Outfit, sans-serif' }}
                            >
                              {t('Άρνηση', 'Decline')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
              }
            </div>

            {/* ── Upcoming ── */}
            <div style={{ marginBottom: '2rem' }}>
              {sectionLabel(`📅 ${t('Επερχόμενοι Αγώνες', 'Upcoming Events')}`)}
              {upcoming.length === 0
                ? emptyState(t('Δεν υπάρχουν αποδεκτές αναθέσεις για επερχόμενους αγώνες', 'No accepted assignments for upcoming events'))
                : upcoming.map(a => {
                    const ev = a.events
                    return (
                      <div key={a.id} style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: '0 0 0.2rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                              {t(ev?.title_el, ev?.title_en || ev?.title_el)}
                            </p>
                            {ev?.event_date && (
                              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                📅 {formatDate(ev.event_date)}
                              </p>
                            )}
                            {ev?.location && (
                              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                📍 {ev.location}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => router.push(`/events/${ev?.id}`)}
                            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.9rem', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'Outfit, sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}
                          >
                            {t('Προβολή →', 'View →')}
                          </button>
                        </div>
                      </div>
                    )
                  })
              }
            </div>

            {/* ── Past ── */}
            <div>
              {sectionLabel(`🏁 ${t('Παρελθόν', 'Past Events')}`)}
              {past.length === 0
                ? emptyState(t('Δεν υπάρχουν παλαιότερες αναθέσεις', 'No past assignments'))
                : past.map(a => {
                    const ev = a.events
                    return (
                      <div key={a.id} style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: '0 0 0.2rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                              {t(ev?.title_el, ev?.title_en || ev?.title_el)}
                            </p>
                            {ev?.event_date && (
                              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                📅 {formatDate(ev.event_date)}
                              </p>
                            )}
                            {ev?.location && (
                              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                📍 {ev.location}
                              </p>
                            )}
                            <span style={{ display: 'inline-block', marginTop: '0.35rem', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '99px', color: '#7eb8f7', background: '#7eb8f711', border: '1px solid #7eb8f733' }}>
                              ✅ {t('Ολοκληρώθηκε', 'Completed')}
                            </span>
                          </div>
                          <button
                            onClick={() => router.push(`/events/${ev?.id}`)}
                            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.9rem', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'Outfit, sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}
                          >
                            {t('Προβολή →', 'View →')}
                          </button>
                        </div>
                      </div>
                    )
                  })
              }
            </div>
          </>
        )}
      </div>
    </main>
  )
}
