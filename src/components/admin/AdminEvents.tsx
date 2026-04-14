'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type EventFilter = 'pending' | 'approved' | 'completed' | 'cancelled'

export default function AdminEvents() {
  const supabase = createClient()
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<EventFilter>('pending')
  const [pendingCount, setPendingCount] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { loadEvents() }, [filter])
  useEffect(() => { loadPendingCount() }, [])

  async function loadPendingCount() {
    const { count } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    setPendingCount(count || 0)
  }

  async function loadEvents() {
    setLoading(true)
    const { data } = await supabase
      .from('events')
      .select('*, profiles(full_name, member_id)')
      .eq('status', filter)
      .order('event_date', { ascending: true })
    setEvents(data || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('events').update({ status }).eq('id', id)
    if (status === 'approved' || filter === 'pending') loadPendingCount()
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

  const statusColor = (s: string) =>
    s === 'approved' ? '#7ef7a0' :
    s === 'completed' ? '#7eb8f7' :
    s === 'cancelled' ? '#f77e7e' :
    'var(--accent)'

  const tabStyle = (t: EventFilter) => ({
    background: filter === t ? 'var(--accent)' : 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '0.4rem 1rem',
    color: filter === t ? 'var(--bg)' : 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    fontWeight: filter === t ? 700 : 400,
    textTransform: 'capitalize' as const,
  })

  return (
    <div>
      {/* Pending attention notice */}
      {pendingCount > 0 && filter !== 'pending' && (
        <div
          onClick={() => setFilter('pending')}
          style={{
            background: 'var(--accent)22',
            border: '1px solid var(--accent)',
            borderRadius: '8px',
            padding: '0.65rem 1rem',
            marginBottom: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>🔔</span>
          <p style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600 }}>
            {pendingCount} event{pendingCount > 1 ? 's' : ''} waiting for approval
          </p>
          <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: '0.8rem' }}>View →</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {(['pending', 'approved', 'completed', 'cancelled'] as EventFilter[]).map(s => (
          <button key={s} onClick={() => setFilter(s)} style={tabStyle(s)}>
            {s}
            {s === 'pending' && pendingCount > 0 && (
              <span style={{
                marginLeft: '0.4rem',
                background: filter === 'pending' ? 'var(--bg)' : 'var(--accent)',
                color: filter === 'pending' ? 'var(--accent)' : 'var(--bg)',
                borderRadius: '20px',
                padding: '0 0.4rem',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {events.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
              No {filter} events
            </p>
          )}
          {events.map(event => (
            <div key={event.id} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '1rem',
              flexWrap: 'wrap',
            }}>
              {/* Clickable info area */}
              <div
                onClick={() => router.push(`/events/${event.id}`)}
                style={{ flex: 1, cursor: 'pointer' }}
              >
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

              {/* Action buttons */}
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
                  <button
                    onClick={() => deleteEvent(event.id)}
                    disabled={deleting === event.id}
                    style={{ background: '#f77e7e', border: 'none', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#0a0f1e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700, opacity: deleting === event.id ? 0.6 : 1 }}
                  >
                    {deleting === event.id ? '...' : 'Delete'}
                  </button>
                </>}
                <span style={{ background: 'var(--bg)', borderRadius: '6px', padding: '0.4rem 0.75rem', color: statusColor(event.status), fontSize: '0.8rem' }}>
                  {event.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
