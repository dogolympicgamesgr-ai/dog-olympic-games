'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type SeminarFilter = 'pending' | 'approved' | 'completed' | 'cancelled'

const TAB_LABELS: Record<SeminarFilter, string> = {
  pending: 'Pending',
  approved: 'Approved',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export default function AdminSeminars() {
  const supabase = createClient()
  const router = useRouter()
  const [seminars, setSeminars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<SeminarFilter>('pending')
  const [pendingCount, setPendingCount] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [noShowData, setNoShowData] = useState<Record<string, any[]>>({})
  const [notifying, setNotifying] = useState<string | null>(null)
  const [notifyModal, setNotifyModal] = useState<{ seminar: any } | null>(null)
  const [notifyChannels, setNotifyChannels] = useState<Set<string>>(new Set(['push']))
  const [notifyResult, setNotifyResult] = useState<string | null>(null)

  useEffect(() => { loadSeminars() }, [filter])
  useEffect(() => { loadCounts() }, [])

  async function loadCounts() {
    const { count } = await supabase
      .from('seminars').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    setPendingCount(count || 0)
  }

  async function loadSeminars() {
    setLoading(true)
    setExpanded(null)
    const { data } = await supabase
      .from('seminars')
      .select('*, profiles(full_name, member_id)')
      .eq('status', filter)
      .order('seminar_date', { ascending: filter === 'approved' })
    setSeminars(data || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('seminars').update({ status }).eq('id', id)

    const seminar = seminars.find(s => s.id === id)
    if (seminar?.created_by && (status === 'approved' || status === 'cancelled')) {
      const isApproved = status === 'approved'
      await supabase.from('notifications').insert({
        user_id: seminar.created_by,
        type: isApproved ? 'seminar_approved' : 'seminar_rejected',
        title_el: isApproved ? 'Το Σεμινάριο Εγκρίθηκε' : 'Το Σεμινάριο Απορρίφθηκε',
        title_en: isApproved ? 'Seminar Approved' : 'Seminar Rejected',
        message_el: isApproved
          ? `Το σεμινάριο "${seminar.title_el}" εγκρίθηκε και είναι πλέον δημόσιο.`
          : `Το σεμινάριο "${seminar.title_el}" απορρίφθηκε από τον διαχειριστή.`,
        message_en: isApproved
          ? `Your seminar "${seminar.title_el}" has been approved and is now public.`
          : `Your seminar "${seminar.title_el}" was rejected by the admin.`,
        metadata: { seminar_id: id },
      })
    }

    loadCounts()
    loadSeminars()
  }

  async function loadNoShows(seminarId: string) {
    if (noShowData[seminarId]) {
      setExpanded(expanded === seminarId ? null : seminarId)
      return
    }
    const { data } = await supabase
      .from('seminar_registrations')
      .select('id, attendance_status, profiles!seminar_registrations_user_id_fkey(full_name, member_id)')
      .eq('seminar_id', seminarId)
      .eq('attendance_status', 'no_show')
    setNoShowData(prev => ({ ...prev, [seminarId]: data || [] }))
    setExpanded(seminarId)
  }

  function openNotifyModal(seminar: any) {
    setNotifyChannels(new Set(['push']))
    setNotifyResult(null)
    setNotifyModal({ seminar })
  }

  function toggleNotifyChannel(ch: string) {
    setNotifyChannels(prev => {
      const next = new Set(prev)
      next.has(ch) ? next.delete(ch) : next.add(ch)
      return next
    })
  }

  async function sendNotify() {
    if (!notifyModal || notifyChannels.size === 0) return
    const { seminar } = notifyModal
    setNotifying(seminar.id)
    setNotifyResult(null)

    try {
      const locationStr = seminar.is_online ? 'Online' : seminar.location || ''
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: 'all',
          title_el: `Νέο Σεμινάριο: ${seminar.title_el}`,
          title_en: `New Seminar: ${seminar.title_el}`,
          message_el: `Ένα νέο σεμινάριο είναι διαθέσιμο: "${seminar.title_el}" στις ${new Date(seminar.seminar_date).toLocaleDateString('el-GR')} — ${locationStr}`,
          message_en: `A new seminar is available: "${seminar.title_el}" on ${new Date(seminar.seminar_date).toLocaleDateString('en-GB')} — ${locationStr}`,
          channels: Array.from(notifyChannels),
          item_type: 'seminar',
          item_id: seminar.id,
          item_data: {
            id: seminar.id,
            title_el: seminar.title_el,
            title_en: seminar.title_en,
            location: seminar.location,
            seminar_date: seminar.seminar_date,
            is_online: seminar.is_online,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      const parts = []
      if (data.push_sent > 0) parts.push(`${data.push_sent} push`)
      if (data.email_sent > 0) parts.push(`${data.email_sent} email`)
      setNotifyResult(`✅ Sent: ${parts.join(', ')}`)
    } catch (e: any) {
      setNotifyResult(`❌ ${e.message}`)
    } finally {
      setNotifying(null)
    }
  }

  const tabStyle = (t: SeminarFilter) => ({
    background: filter === t ? 'var(--accent)' : 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '0.4rem 1rem',
    color: filter === t ? 'var(--bg)' : 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    fontWeight: filter === t ? 700 : 400,
  })

  return (
    <div>
      {/* Pending alert */}
      {pendingCount > 0 && filter !== 'pending' && (
        <div onClick={() => setFilter('pending')} style={{ background: 'var(--accent)22', border: '1px solid var(--accent)', borderRadius: '8px', padding: '0.65rem 1rem', marginBottom: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔔</span>
          <p style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>
            {pendingCount} seminar{pendingCount > 1 ? 's' : ''} waiting for approval
          </p>
          <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: '0.8rem' }}>View →</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(['pending', 'approved', 'completed', 'cancelled'] as SeminarFilter[]).map(s => (
          <button key={s} onClick={() => setFilter(s)} style={tabStyle(s)}>
            {TAB_LABELS[s]}
            {s === 'pending' && pendingCount > 0 && (
              <span style={{ marginLeft: '0.4rem', background: filter === 'pending' ? 'var(--bg)' : 'var(--accent)', color: filter === 'pending' ? 'var(--accent)' : 'var(--bg)', borderRadius: '20px', padding: '0 0.4rem', fontSize: '0.7rem', fontWeight: 700 }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {seminars.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
              No {TAB_LABELS[filter].toLowerCase()} seminars
            </p>
          )}
          {seminars.map(s => (
            <div key={s.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div onClick={() => router.push(`/seminars/${s.id}`)} style={{ flex: 1, cursor: 'pointer' }}>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {s.title_el}
                    {s.is_online && <span style={{ fontSize: '0.7rem', color: '#7eb8f7', background: '#7eb8f711', border: '1px solid #7eb8f733', borderRadius: '99px', padding: '0.1rem 0.45rem' }}>Online</span>}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>→</span>
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {s.is_online ? s.url : s.location} · {s.seminar_date ? new Date(s.seminar_date).toLocaleDateString('el-GR') : 'No date'}
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    By: {s.profiles?.full_name || 'Admin'} #{s.profiles?.member_id}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
                  {s.status === 'pending' && <>
                    <button onClick={() => updateStatus(s.id, 'approved')} style={{ background: '#7ef7a033', border: '1px solid #7ef7a0', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#7ef7a0', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Approve</button>
                    <button onClick={() => updateStatus(s.id, 'cancelled')} style={{ background: '#f77e7e33', border: '1px solid #f77e7e', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Reject</button>
                  </>}
                  {s.status === 'approved' && <>
                    {/* Notify button — only on approved seminars */}
                    <button
                      onClick={() => openNotifyModal(s)}
                      style={{ background: '#7eb8f722', border: '1px solid #7eb8f744', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#7eb8f7', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}
                    >
                      📢 Notify
                    </button>
                    <button onClick={() => updateStatus(s.id, 'cancelled')} style={{ background: '#f77e7e33', border: '1px solid #f77e7e', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Cancel</button>
                  </>}
                  {s.status === 'cancelled' && (
                    <button onClick={() => updateStatus(s.id, 'approved')} style={{ background: '#7ef7a033', border: '1px solid #7ef7a0', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#7ef7a0', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Restore</button>
                  )}
                  {s.status === 'completed' && (
                    <button
                      onClick={() => loadNoShows(s.id)}
                      style={{ background: '#f77e7e22', border: '1px solid #f77e7e44', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}
                    >
                      ⚠️ No-shows {expanded === s.id ? '▲' : '▼'}
                    </button>
                  )}
                </div>
              </div>

              {/* No-show expansion */}
              {expanded === s.id && s.status === 'completed' && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 1.25rem', background: 'var(--bg)' }}>
                  {(noShowData[s.id] || []).length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>✅ No absences recorded</p>
                  ) : (
                    <>
                      <p style={{ fontSize: '0.75rem', color: '#f77e7e', fontWeight: 600, margin: '0 0 0.5rem' }}>
                        {noShowData[s.id].length} no-show{noShowData[s.id].length > 1 ? 's' : ''}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {noShowData[s.id].map((r: any) => (
                          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', color: '#f77e7e' }}>⚠️</span>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                              {r.profiles?.full_name}
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.35rem' }}>#{r.profiles?.member_id}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Notify Modal ───────────────────────────────────────────── */}
      {notifyModal && (
        <div
          onClick={() => { setNotifyModal(null); setNotifyResult(null) }}
          style={{ position: 'fixed', inset: 0, background: '#000000cc', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '420px' }}
          >
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem', fontSize: '1rem' }}>
              📢 Notify All Users
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
              {notifyModal.seminar.title_el}
            </p>

            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
              Send via
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
              {[
                { id: 'push',  icon: '🔔', label: 'Push' },
                { id: 'email', icon: '✉️', label: 'Email' },
              ].map(ch => (
                <label key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifyChannels.has(ch.id)}
                    onChange={() => toggleNotifyChannel(ch.id)}
                    style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{ch.icon} {ch.label}</span>
                </label>
              ))}
            </div>

            {notifyResult && (
              <p style={{ fontSize: '0.82rem', color: notifyResult.startsWith('✅') ? '#7ef7a0' : '#f77e7e', marginBottom: '1rem' }}>
                {notifyResult}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setNotifyModal(null); setNotifyResult(null) }}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem 1rem', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem' }}
              >
                Close
              </button>
              <button
                onClick={sendNotify}
                disabled={notifyChannels.size === 0 || !!notifying}
                style={{ background: notifyChannels.size > 0 && !notifying ? 'var(--accent)' : 'var(--border)', border: 'none', borderRadius: '6px', padding: '0.5rem 1.25rem', color: notifyChannels.size > 0 && !notifying ? 'var(--bg)' : 'var(--text-secondary)', cursor: notifyChannels.size > 0 && !notifying ? 'pointer' : 'not-allowed', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.85rem' }}
              >
                {notifying ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
