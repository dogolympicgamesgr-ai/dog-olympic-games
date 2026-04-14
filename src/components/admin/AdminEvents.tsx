'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type EventFilter = 'pending' | 'approved' | 'completed' | 'cancelled'

export default function AdminEvents() {
  const supabase = createClient()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<EventFilter>('pending')

  useEffect(() => { loadEvents() }, [filter])

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
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(['pending', 'approved', 'completed', 'cancelled'] as EventFilter[]).map(s => (
          <button key={s} onClick={() => setFilter(s)} style={tabStyle(s)}>{s}</button>
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
              <div style={{ flex: 1 }}>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.2rem' }}>
                  {event.title_el}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {event.location} · {event.event_date ? new Date(event.event_date).toLocaleDateString('el-GR') : 'No date'}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  By: {event.profiles?.full_name || 'Admin'} #{event.profiles?.member_id}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
                {event.status === 'pending' && <>
                  <button onClick={() => updateStatus(event.id, 'approved')} style={{ background: '#7ef7a033', border: '1px solid #7ef7a0', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#7ef7a0', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Approve</button>
                  <button onClick={() => updateStatus(event.id, 'cancelled')} style={{ background: '#f77e7e33', border: '1px solid #f77e7e', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Reject</button>
                </>}
                {event.status === 'approved' && (
                  <button onClick={() => updateStatus(event.id, 'cancelled')} style={{ background: '#f77e7e33', border: '1px solid #f77e7e', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Cancel</button>
                )}
                {event.status === 'cancelled' && (
                  <button onClick={() => updateStatus(event.id, 'approved')} style={{ background: '#7ef7a033', border: '1px solid #7ef7a0', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#7ef7a0', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Restore</button>
                )}
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
