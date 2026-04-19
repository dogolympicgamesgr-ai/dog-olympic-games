'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'

export default function SeminarAttendancePage() {
  const { t } = useLang()
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [seminar, setSeminar] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [registrations, setRegistrations] = useState<any[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'attended' | 'no_show'>>({})
  const [closeLoading, setCloseLoading] = useState(false)
  const [closeMsg, setCloseMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => { if (id) load(id as string) }, [id])

  async function load(seminarId: string) {
    const [seminarRes, sessionRes] = await Promise.all([
      supabase.from('seminars').select('*').eq('id', seminarId).single(),
      fetch('/auth/session').then(r => r.json()),
    ])

    if (!seminarRes.data) { router.push('/seminars'); return }

    const canAccess = sessionRes?.isAdmin || sessionRes?.user?.id === seminarRes.data.created_by
    if (!canAccess) { router.push(`/seminars/${seminarId}`); return }
    if (seminarRes.data.status !== 'approved') { router.push(`/seminars/${seminarId}`); return }

    setSeminar(seminarRes.data)
    setSession(sessionRes)

    const { data: regs } = await supabase
      .from('seminar_registrations')
      .select('id, user_id, status, attendance_status, profiles!seminar_registrations_user_id_fkey(id, full_name, member_id, no_show_count)')
      .eq('seminar_id', seminarId)

    setRegistrations(regs || [])

    const map: Record<string, 'attended' | 'no_show'> = {}
    ;(regs || []).forEach((r: any) => {
      if (r.attendance_status === 'attended' || r.attendance_status === 'no_show') {
        map[r.id] = r.attendance_status
      }
    })
    setAttendanceMap(map)
    setLoading(false)
  }

  async function handleClose() {
    setCloseLoading(true)
    setCloseMsg(null)

    const unmarked = registrations.filter(r => !attendanceMap[r.id])
    if (unmarked.length > 0) {
      setCloseMsg({
        type: 'error',
        text: t(
          `Σήμανε παρουσία/απουσία για όλους (${unmarked.length} εκκρεμούν)`,
          `Mark attendance for all participants (${unmarked.length} remaining)`
        )
      })
      setCloseLoading(false)
      return
    }

    // Update all attendance statuses
    await Promise.all(registrations.map(r =>
      supabase.from('seminar_registrations')
        .update({ attendance_status: attendanceMap[r.id] })
        .eq('id', r.id)
    ))

    // Fire no-show notifications + RPC for no-shows
    const noShows = registrations.filter(r => attendanceMap[r.id] === 'no_show')
    if (noShows.length > 0) {
      await Promise.all(noShows.map((r: any) => Promise.all([
        supabase.from('notifications').insert({
          user_id: r.user_id,
          type: 'no_show',
          title_el: 'Απουσία από Σεμινάριο',
          title_en: 'Seminar No-Show',
          message_el: `Καταγράφηκε απουσία σου από το σεμινάριο "${seminar.title_el}". Παρακαλούμε να ακυρώνεις έγκαιρα αν δεν μπορείς να παραστείς.`,
          message_en: `You were marked absent from "${seminar.title_el}". Please cancel in advance if you cannot attend.`,
          metadata: { seminar_id: id },
        }),
        supabase.rpc('increment_no_show', {
          user_id_input: r.user_id,
        }),
      ])))
    }

    // Mark seminar completed
    await supabase.from('seminars').update({ status: 'completed' }).eq('id', id)

    // Notify all admins
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      const attended = registrations.filter(r => attendanceMap[r.id] === 'attended').length
      const absent = noShows.length
      await Promise.all(admins.map(a =>
        supabase.from('notifications').insert({
          user_id: a.user_id,
          type: 'seminar_completed',
          title_el: 'Σεμινάριο Ολοκληρώθηκε',
          title_en: 'Seminar Completed',
          message_el: `Το σεμινάριο "${seminar.title_el}" ολοκληρώθηκε. Παρόντες: ${attended}, Απόντες: ${absent}.`,
          message_en: `Seminar "${seminar.title_el}" has been completed. Present: ${attended}, Absent: ${absent}.`,
          metadata: { seminar_id: id },
        })
      ))
    }

    setCloseMsg({ type: 'success', text: t('Το σεμινάριο ολοκληρώθηκε! Ανακατεύθυνση...', 'Seminar completed! Redirecting...') })
    setTimeout(() => router.push(`/seminars/${id}`), 1500)
    setCloseLoading(false)
  }

  const attendedCount = Object.values(attendanceMap).filter(v => v === 'attended').length
  const noShowCount = Object.values(attendanceMap).filter(v => v === 'no_show').length
  const unmarkedCount = registrations.length - Object.keys(attendanceMap).length

  if (loading) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )

  const cardStyle: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 1.5rem' }}>
        <button onClick={() => router.push(`/seminars/${id}`)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', marginBottom: '1.5rem', padding: 0 }}>←</button>

        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem', letterSpacing: '0.05em', color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
          📋 {t('Παρουσίες', 'Attendance')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{seminar?.title_el}</p>

        {/* Counters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { count: attendedCount, label: t('Παρόντες', 'Present'), color: '#7ef7a0' },
            { count: noShowCount, label: t('Απόντες', 'Absent'), color: '#f77e7e' },
            { count: unmarkedCount, label: t('Εκκρεμούν', 'Pending'), color: 'var(--text-secondary)' },
          ].map(({ count, label, color }) => (
            <div key={label} style={{ flex: 1, background: `${color}11`, border: `1px solid ${color}33`, borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
              <p style={{ margin: 0, fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.8rem', color }}>{count}</p>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Participants */}
        {registrations.length === 0 ? (
          <div style={cardStyle}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
              {t('Δεν υπάρχουν εγγεγραμμένοι συμμετέχοντες', 'No registered participants')}
            </p>
          </div>
        ) : (
          <div style={cardStyle}>
            <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.95rem', color: 'var(--accent)', margin: '0 0 0.75rem', letterSpacing: '0.04em' }}>
              👥 {t('Συμμετέχοντες', 'Participants')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {registrations.map((r: any) => {
                const status = attendanceMap[r.id]
                return (
                  <div key={r.id} style={{ background: 'var(--bg)', border: `1px solid ${status === 'attended' ? '#7ef7a044' : status === 'no_show' ? '#f77e7e44' : 'var(--border)'}`, borderRadius: '10px', padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          {r.profiles?.full_name}
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '0.75rem', marginLeft: '0.35rem' }}>#{r.profiles?.member_id}</span>
                        </p>
                        {r.profiles?.no_show_count > 0 && (
                          <p style={{ margin: 0, fontSize: '0.72rem', color: '#f77e7e' }}>⚠️ {r.profiles.no_show_count} {t('προηγούμενες απουσίες', 'previous no-shows')}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => setAttendanceMap(prev => ({ ...prev, [r.id]: 'attended' }))}
                          style={{ background: status === 'attended' ? '#7ef7a0' : 'transparent', border: `1px solid ${status === 'attended' ? '#7ef7a0' : 'var(--border)'}`, borderRadius: '8px', padding: '0.4rem 1rem', color: status === 'attended' ? 'var(--bg)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700, transition: 'all 0.15s', minWidth: '80px' }}
                        >
                          ✓ {t('Παρών', 'Present')}
                        </button>
                        <button
                          onClick={() => setAttendanceMap(prev => ({ ...prev, [r.id]: 'no_show' }))}
                          style={{ background: status === 'no_show' ? '#f77e7e' : 'transparent', border: `1px solid ${status === 'no_show' ? '#f77e7e' : 'var(--border)'}`, borderRadius: '8px', padding: '0.4rem 1rem', color: status === 'no_show' ? 'var(--bg)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700, transition: 'all 0.15s', minWidth: '80px' }}
                        >
                          ✗ {t('Απών', 'Absent')}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {closeMsg && (
          <div style={{ background: closeMsg.type === 'success' ? 'rgba(0,200,100,0.1)' : 'rgba(220,50,50,0.1)', border: `1px solid ${closeMsg.type === 'success' ? 'rgba(0,200,100,0.3)' : 'rgba(220,50,50,0.3)'}`, borderRadius: '10px', padding: '0.85rem', marginBottom: '1rem', color: closeMsg.type === 'success' ? '#00c864' : '#dc3232', fontSize: '0.88rem', fontWeight: 600 }}>
            {closeMsg.text}
          </div>
        )}

        <button
          onClick={handleClose}
          disabled={closeLoading}
          style={{ width: '100%', background: closeLoading ? 'var(--bg-card)' : 'var(--accent)', border: 'none', borderRadius: '12px', padding: '1rem', color: closeLoading ? 'var(--text-secondary)' : 'var(--bg)', fontWeight: 700, cursor: closeLoading ? 'not-allowed' : 'pointer', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.2rem', letterSpacing: '0.05em', opacity: closeLoading ? 0.7 : 1 }}
        >
          {closeLoading ? t('Επεξεργασία...', 'Processing...') : t('✅ Κλείσιμο & Ολοκλήρωση Σεμιναρίου', '✅ Close & Complete Seminar')}
        </button>
      </div>
    </main>
  )
}
