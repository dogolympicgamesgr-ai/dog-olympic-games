'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'

export default function AttendancePage() {
  const { t } = useLang()
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [event, setEvent] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [allRegistrations, setAllRegistrations] = useState<any[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'attended' | 'no_show'>>({})
  const [closeLoading, setCloseLoading] = useState(false)
  const [closeMsg, setCloseMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (id) load(id as string)
  }, [id])

  async function load(eventId: string) {
    const [eventRes, sessionRes] = await Promise.all([
      supabase
        .from('events')
        .select(`*, event_categories(id, title_el, title_en, sports(name_el, name_en))`)
        .eq('id', eventId)
        .single(),
      fetch('/auth/session').then(r => r.json())
    ])

    if (!eventRes.data) { router.push('/events'); return }

    const canAccess = sessionRes?.isAdmin || sessionRes?.user?.id === eventRes.data.created_by
    if (!canAccess) { router.push(`/events/${eventId}`); return }

    if (eventRes.data.status !== 'approved') {
      router.push(`/events/${eventId}`)
      return
    }

    setEvent(eventRes.data)
    setCategories(eventRes.data.event_categories || [])
    setSession(sessionRes)

    await loadAllRegistrations(eventId, eventRes.data.event_categories || [])
    setLoading(false)
  }

  async function loadAllRegistrations(eventId: string, cats: any[]) {
    const catIds = cats.map((c: any) => c.id)
    if (catIds.length === 0) return

    const { data } = await supabase
      .from('event_registrations')
      .select(`
        id, category_id, dog_id, owner_id, status, attendance_status,
        dogs!event_registrations_dog_id_fkey(id, name, dog_id),
        profiles!event_registrations_owner_id_fkey(id, full_name, member_id)
      `)
      .in('category_id', catIds)
      .eq('status', 'confirmed')

    setAllRegistrations(data || [])

    const map: Record<string, 'attended' | 'no_show'> = {}
    ;(data || []).forEach((r: any) => {
      if (r.attendance_status === 'attended' || r.attendance_status === 'no_show') {
        map[r.id] = r.attendance_status
      }
    })
    setAttendanceMap(map)
  }

  async function handleCloseEvent() {
    setCloseLoading(true)
    setCloseMsg(null)

    const unmarked = allRegistrations.filter(r => !attendanceMap[r.id])
    if (unmarked.length > 0) {
      setCloseMsg({
        type: 'error',
        text: t(
          `Σήμανε παρουσία/απουσία για όλους τους συμμετέχοντες (${unmarked.length} εκκρεμούν)`,
          `Mark attendance for all participants (${unmarked.length} remaining)`
        )
      })
      setCloseLoading(false)
      return
    }

    // Update all attendance statuses
    await Promise.all(allRegistrations.map(r =>
      supabase.from('event_registrations')
        .update({ attendance_status: attendanceMap[r.id] })
        .eq('id', r.id)
    ))

    // Fire no-show notifications silently
    const noShowRegs = allRegistrations.filter(r => attendanceMap[r.id] === 'no_show')
    if (noShowRegs.length > 0) {
      await Promise.all(noShowRegs.map((r: any) =>
        supabase.from('notifications').insert({
          user_id: r.owner_id,
          type: 'no_show',
          title_el: 'Απουσία από Αγώνα',
          title_en: 'Event No-Show',
          message_el: `Καταγράφηκε απουσία σου από τον αγώνα "${event.title_el}" με τον/την ${r.dogs?.name}. Παρακαλούμε να ακυρώνεις έγκαιρα αν δεν μπορείς να παραστείς.`,
          message_en: `You were marked absent from "${event.title_el}" with ${r.dogs?.name}. Please cancel in advance if you cannot attend.`,
          metadata: { event_id: id, dog_id: r.dog_id },
        })
      ))
    }

    // Mark event completed
    const { error } = await supabase
      .from('events')
      .update({ status: 'completed' })
      .eq('id', id)

    if (error) {
      setCloseMsg({ type: 'error', text: t('Σφάλμα ολοκλήρωσης αγώνα', 'Error completing event') })
    } else {
      setCloseMsg({ type: 'success', text: t('Ο αγώνας ολοκληρώθηκε! Ανακατεύθυνση...', 'Event completed! Redirecting...') })
      setTimeout(() => router.push(`/events/${id}`), 1500)
    }
    setCloseLoading(false)
  }

  const regsByCategory = categories.map(cat => ({
    ...cat,
    regs: allRegistrations.filter(r => r.category_id === cat.id)
  })).filter(cat => cat.regs.length > 0)

  const attendedCount = Object.values(attendanceMap).filter(v => v === 'attended').length
  const noShowCount = Object.values(attendanceMap).filter(v => v === 'no_show').length
  const unmarkedCount = allRegistrations.length - Object.keys(attendanceMap).length

  if (loading) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '1.25rem',
    marginBottom: '1rem',
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 1.5rem' }}>

        <button onClick={() => router.push(`/events/${id}`)} style={{
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          cursor: 'pointer', fontSize: '1.2rem', marginBottom: '1.5rem', padding: 0
        }}>←</button>

        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem', letterSpacing: '0.05em', color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
          📋 {t('Παρουσίες', 'Attendance')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {event?.title_el}
        </p>

        {/* Live counter */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, background: '#7ef7a011', border: '1px solid #7ef7a033', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
            <p style={{ margin: 0, fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.8rem', color: '#7ef7a0' }}>{attendedCount}</p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t('Παρόντες', 'Present')}</p>
          </div>
          <div style={{ flex: 1, background: '#f77e7e11', border: '1px solid #f77e7e33', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
            <p style={{ margin: 0, fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.8rem', color: '#f77e7e' }}>{noShowCount}</p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t('Απόντες', 'Absent')}</p>
          </div>
          <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
            <p style={{ margin: 0, fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.8rem', color: 'var(--text-secondary)' }}>{unmarkedCount}</p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t('Εκκρεμούν', 'Pending')}</p>
          </div>
        </div>

        {/* Participants per category */}
        {allRegistrations.length === 0 ? (
          <div style={cardStyle}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
              {t('Δεν υπάρχουν εγγεγραμμένοι συμμετέχοντες', 'No registered participants')}
            </p>
          </div>
        ) : (
          regsByCategory.map(cat => (
            <div key={cat.id} style={cardStyle}>
              <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.95rem', color: 'var(--accent)', margin: '0 0 0.75rem', letterSpacing: '0.04em' }}>
                {t(cat.title_el, cat.title_en || cat.title_el)}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {cat.regs.map((r: any) => {
                  const status = attendanceMap[r.id]
                  return (
                    <div key={r.id} style={{
                      background: 'var(--bg)',
                      border: `1px solid ${status === 'attended' ? '#7ef7a044' : status === 'no_show' ? '#f77e7e44' : 'var(--border)'}`,
                      borderRadius: '10px', padding: '0.75rem 1rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                            {r.profiles?.full_name}
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '0.75rem' }}>{' '}(#{r.profiles?.member_id})</span>
                          </p>
                          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            🐕 {r.dogs?.name} · {r.dogs?.dog_id}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => setAttendanceMap(prev => ({ ...prev, [r.id]: 'attended' }))}
                            style={{
                              background: status === 'attended' ? '#7ef7a0' : 'transparent',
                              border: `1px solid ${status === 'attended' ? '#7ef7a0' : 'var(--border)'}`,
                              borderRadius: '8px', padding: '0.4rem 1rem',
                              color: status === 'attended' ? 'var(--bg)' : 'var(--text-secondary)',
                              cursor: 'pointer', fontSize: '0.85rem',
                              fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                              transition: 'all 0.15s', minWidth: '80px',
                            }}>
                            ✓ {t('Παρών', 'Present')}
                          </button>
                          <button
                            onClick={() => setAttendanceMap(prev => ({ ...prev, [r.id]: 'no_show' }))}
                            style={{
                              background: status === 'no_show' ? '#f77e7e' : 'transparent',
                              border: `1px solid ${status === 'no_show' ? '#f77e7e' : 'var(--border)'}`,
                              borderRadius: '8px', padding: '0.4rem 1rem',
                              color: status === 'no_show' ? 'var(--bg)' : 'var(--text-secondary)',
                              cursor: 'pointer', fontSize: '0.85rem',
                              fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                              transition: 'all 0.15s', minWidth: '80px',
                            }}>
                            ✗ {t('Απών', 'Absent')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {closeMsg && (
          <div style={{
            background: closeMsg.type === 'success' ? 'rgba(0,200,100,0.1)' : 'rgba(220,50,50,0.1)',
            border: `1px solid ${closeMsg.type === 'success' ? 'rgba(0,200,100,0.3)' : 'rgba(220,50,50,0.3)'}`,
            borderRadius: '10px', padding: '0.85rem', marginBottom: '1rem',
            color: closeMsg.type === 'success' ? '#00c864' : '#dc3232',
            fontSize: '0.88rem', fontWeight: 600,
          }}>
            {closeMsg.text}
          </div>
        )}

        <button
          onClick={handleCloseEvent}
          disabled={closeLoading}
          style={{
            width: '100%',
            background: closeLoading ? 'var(--bg-card)' : 'var(--accent)',
            border: 'none', borderRadius: '12px', padding: '1rem',
            color: closeLoading ? 'var(--text-secondary)' : 'var(--bg)',
            fontWeight: 700, cursor: closeLoading ? 'not-allowed' : 'pointer',
            fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.2rem',
            letterSpacing: '0.05em', opacity: closeLoading ? 0.7 : 1,
          }}>
          {closeLoading
            ? t('Επεξεργασία...', 'Processing...')
            : t('✅ Κλείσιμο & Ολοκλήρωση Αγώνα', '✅ Close & Complete Event')}
        </button>

      </div>
    </main>
  )
}
