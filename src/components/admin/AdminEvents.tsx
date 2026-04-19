'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const MultiMarkerMap = dynamic(() => import('@/components/MultiMarkerMap'), { ssr: false })

type EventFilter = 'pending' | 'approved' | 'completed' | 'results_approved' | 'cancelled'

const TAB_LABELS: Record<EventFilter, string> = {
  pending: 'Pending',
  approved: 'Approved',
  completed: 'Pending Results',
  results_approved: 'Completed',
  cancelled: 'Cancelled',
}

export default function AdminEvents() {
  const supabase = createClient()
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<EventFilter>('pending')
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingResultsCount, setPendingResultsCount] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)

  useEffect(() => { loadEvents() }, [filter])
  useEffect(() => { loadCounts() }, [])

  async function loadCounts() {
    const [pendingRes, completedRes] = await Promise.all([
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    ])
    setPendingCount(pendingRes.count || 0)
    setPendingResultsCount(completedRes.count || 0)
  }

  async function loadEvents() {
    setLoading(true)
    setShowMap(false)
    const { data } = await supabase
      .from('events')
      .select('*, profiles(full_name, member_id)')
      .eq('status', filter)
      .order('event_date', { ascending: filter === 'approved' })
    setEvents(data || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('events').update({ status }).eq('id', id)
    if (status === 'approved' || status === 'cancelled') {
      const event = events.find(e => e.id === id)
      if (event?.created_by) {
        const isApproved = status === 'approved'
        await supabase.from('notifications').insert({
          user_id: event.created_by,
          type: isApproved ? 'event_approved' : 'event_rejected',
          title_el: isApproved ? 'Ο Αγώνας Εγκρίθηκε' : 'Ο Αγώνας Απορρίφθηκε',
          title_en: isApproved ? 'Event Approved' : 'Event Rejected',
          message_el: isApproved
            ? `Ο αγώνας "${event.title_el}" εγκρίθηκε και είναι πλέον δημόσιος.`
            : `Ο αγώνας "${event.title_el}" απορρίφθηκε από τον διαχειριστή.`,
          message_en: isApproved
            ? `Your event "${event.title_el}" has been approved and is now public.`
            : `Your event "${event.title_el}" was rejected by the admin.`,
          metadata: { event_id: id },
        })
      }
    }
    loadCounts()
    loadEvents()
  }

  async function deleteEvent(id: string) {
    if (!confirm('Permanently delete this event and all its data? This cannot be undone.')) return
    setDeleting(id)
    await supabase.from('competition_results').delete().eq('event_id', id)
    await supabase.from('event_assignments').delete().eq('event_id', id)
    await supabase.from('event_categories').delete().eq('event_id', id)
    await supabase.from('events').delete().eq('id', id)
    setDeleting(null)
    loadEvents()
  }

  const eventsWithCoords = events.filter(e => e.lat && e.lng)

  const tabStyle = (t: EventFilter) => ({
    background: filter === t ? 'var(--accent)' : 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '0.4rem 1rem',
    color: filter === t ? 'var(--bg)' : 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    fontWeight: filter === t ? 700 : 400,
    position: 'relative' as const,
  })

  const statusColor = (s: string) =>
    s === 'approved' ? '#7ef7a0' :
    s === 'completed' ? '#f7c97e' :
    s === 'results_approved' ? '#7eb8f7' :
    s === 'cancelled' ? '#f77e7e' :
    'var(--accent)'

  const statusLabel = (s: string) =>
    s === 'completed' ? 'Pending Results' :
    s === 'results_approved' ? 'Completed' : s

  return (
    <div>
      {/* Alert banners */}
      {pendingCount > 0 && filter !== 'pending' && (
        <div onClick={() => setFilter('pending')} style={{ background: 'var(--accent)22', border: '1px solid var(--accent)', borderRadius: '8px', padding: '0.65rem 1rem', marginBottom: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔔</span>
          <p style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>
            {pendingCount} event{pendingCount > 1 ? 's' : ''} waiting for approval
          </p>
          <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: '0.8rem' }}>View →</span>
        </div>
      )}
      {pendingResultsCount > 0 && filter !== 'completed' && (
        <div onClick={() => setFilter('completed')} style={{ background: '#f7c97e22', border: '1px solid #f7c97e44', borderRadius: '8px', padding: '0.65rem 1rem', marginBottom: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>⏳</span>
          <p style={{ color: '#f7c97e', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>
            {pendingResultsCount} event{pendingResultsCount > 1 ? 's' : ''} waiting for results approval
          </p>
          <span style={{ marginLeft: 'auto', color: '#f7c97e', fontSize: '0.8rem' }}>View →</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {(['pending', 'approved', 'completed', 'results_approved', 'cancelled'] as EventFilter[]).map(s => (
          <button key={s} onClick={() => setFilter(s)} style={tabStyle(s)}>
            {TAB_LABELS[s]}
            {s === 'pending' && pendingCount > 0 && (
              <span style={{ marginLeft: '0.4rem', background: filter === 'pending' ? 'var(--bg)' : 'var(--accent)', color: filter === 'pending' ? 'var(--accent)' : 'var(--bg)', borderRadius: '20px', padding: '0 0.4rem', fontSize: '0.7rem', fontWeight: 700 }}>
                {pendingCount}
              </span>
            )}
            {s === 'completed' && pendingResultsCount > 0 && (
              <span style={{ marginLeft: '0.4rem', background: filter === 'completed' ? 'var(--bg)' : '#f7c97e', color: filter === 'completed' ? '#f7c97e' : 'var(--bg)', borderRadius: '20px', padding: '0 0.4rem', fontSize: '0.7rem', fontWeight: 700 }}>
                {pendingResultsCount}
              </span>
            )}
          </button>
        ))}

        {/* Map toggle — only for results_approved tab when events have coords */}
        {filter === 'results_approved' && eventsWithCoords.length > 0 && (
          <button
            onClick={() => setShowMap(v => !v)}
            style={{ marginLeft: 'auto', background: showMap ? 'var(--accent)' : 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem 1rem', color: showMap ? 'var(--bg)' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}
          >
            🗺️ {showMap ? 'Hide Map' : 'Show Map'}
          </button>
        )}
      </div>

      {/* Multi-marker map */}
      {showMap && filter === 'results_approved' && eventsWithCoords.length > 0 && (
        <div style={{ marginBottom: '1.5rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <MultiMarkerMap
            events={eventsWithCoords}
            lang="en"
            height="360px"
            onEventClick={id => router.push(`/events/${id}`)}
          />
        </div>
      )}

      {/* Event list */}
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {events.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
              No {TAB_LABELS[filter].toLowerCase()} events
            </p>
          )}
          {events.map(event => (
            <div key={event.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              <div onClick={() => router.push(`/events/${event.id}`)} style={{ flex: 1, cursor: 'pointer' }}>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.2rem' }}>
                  {event.title_el} <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>→</span>
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {event.location} · {event.event_date ? new Date(event.event_date).toLocaleDateString('el-GR') : 'No date'}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  By: {event.profiles?.full_name || 'Admin'} #{event.profiles?.member_id}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
                {event.status === 'pending' && <>
                  <button onClick={() => updateStatus(event.id, 'approved')} style={{ background: '#7ef7a033', border: '1px solid #7ef7a0', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#7ef7a0', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Approve</button>
                  <button onClick={() => updateStatus(event.id, 'cancelled')} style={{ background: '#f77e7e33', border: '1px solid #f77e7e', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Reject</button>
                </>}
                {event.status === 'approved' && (
                  <button onClick={() => updateStatus(event.id, 'cancelled')} style={{ background: '#f77e7e33', border: '1px solid #f77e7e', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Cancel</button>
                )}
                {event.status === 'cancelled' && <>
                  <button onClick={() => updateStatus(event.id, 'approved')} style={{ background: '#7ef7a033', border: '1px solid #7ef7a0', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#7ef7a0', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Restore</button>
                  <button onClick={() => deleteEvent(event.id)} disabled={deleting === event.id} style={{ background: '#f77e7e', border: 'none', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#0a0f1e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700, opacity: deleting === event.id ? 0.6 : 1 }}>
                    {deleting === event.id ? '...' : 'Delete'}
                  </button>
                </>}
                {event.status === 'completed' && (
                  <button onClick={() => router.push(`/events/${event.id}/results`)} style={{ background: '#f7c97e22', border: '1px solid #f7c97e44', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#f7c97e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>
                    Review Results →
                  </button>
                )}
                <span style={{ background: 'var(--bg)', borderRadius: '6px', padding: '0.4rem 0.75rem', color: statusColor(event.status), fontSize: '0.8rem' }}>
                  {statusLabel(event.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
