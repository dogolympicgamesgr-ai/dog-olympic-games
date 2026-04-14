'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type ResultFilter = 'needs_review' | 'pending' | 'approved'

export default function AdminResults() {
  const supabase = createClient()
  const router = useRouter()
  const [filter, setFilter] = useState<ResultFilter>('needs_review')

  // needs_review: completed events with pending competition_results
  const [reviewEvents, setReviewEvents] = useState<any[]>([])
  const [reviewLoading, setReviewLoading] = useState(true)

  // pending / approved: individual competition_result records
  const [results, setResults] = useState<any[]>([])
  const [resultsLoading, setResultsLoading] = useState(false)

  useEffect(() => {
    if (filter === 'needs_review') loadReviewEvents()
    else loadResults()
  }, [filter])

  async function loadReviewEvents() {
    setReviewLoading(true)
    // Get distinct event_ids from pending competition_results
    const { data: pending } = await supabase
      .from('competition_results')
      .select('event_id')
      .eq('status', 'pending')

    if (!pending || pending.length === 0) {
      setReviewEvents([])
      setReviewLoading(false)
      return
    }

    const eventIds = [...new Set(pending.map((r: any) => r.event_id))]

    const { data: events } = await supabase
      .from('events')
      .select('id, title_el, title_en, location, event_date, profiles(full_name, member_id)')
      .in('id', eventIds)
      .order('event_date', { ascending: false })

    setReviewEvents(events || [])
    setReviewLoading(false)
  }

  async function loadResults() {
    setResultsLoading(true)
    const { data } = await supabase
      .from('competition_results')
      .select('*, events(title_el, location, event_date), dogs(name, dog_id), profiles(full_name, member_id)')
      .eq('status', filter)
      .order('created_at', { ascending: false })
    setResults(data || [])
    setResultsLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('competition_results')
      .update({ status, approved_by: user?.id })
      .eq('id', id)
    loadResults()
  }

  const tabStyle = (t: ResultFilter) => ({
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
        <button onClick={() => setFilter('needs_review')} style={tabStyle('needs_review')}>
          🔔 Needs Review
        </button>
        <button onClick={() => setFilter('pending')} style={tabStyle('pending')}>
          Pending
        </button>
        <button onClick={() => setFilter('approved')} style={tabStyle('approved')}>
          Approved
        </button>
      </div>

      {/* NEEDS REVIEW: completed events with pending results */}
      {filter === 'needs_review' && (
        reviewLoading
          ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
          : reviewEvents.length === 0
            ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</p>
                <p style={{ color: 'var(--text-secondary)' }}>No events waiting for results approval</p>
              </div>
            )
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {reviewEvents.map(event => (
                  <div key={event.id} style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--accent)',
                    borderRadius: '10px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}>
                    <div>
                      <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{event.title_el}</p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {event.location} · {event.event_date ? new Date(event.event_date).toLocaleDateString('el-GR') : 'No date'}
                      </p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        Organizer: {event.profiles?.full_name} #{event.profiles?.member_id}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/events/${event.id}/results`)}
                      style={{
                        background: 'var(--accent)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.5rem 1.25rem',
                        color: 'var(--bg)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'Outfit, sans-serif',
                        fontSize: '0.85rem',
                        flexShrink: 0,
                      }}
                    >
                      Review Results →
                    </button>
                  </div>
                ))}
              </div>
            )
      )}

      {/* PENDING / APPROVED: individual competition_result records */}
      {(filter === 'pending' || filter === 'approved') && (
        resultsLoading
          ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {results.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                  No {filter} results
                </p>
              )}
              {results.map(r => (
                <div key={r.id} style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}>
                  <div>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.events?.title_el}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      Dog: <span style={{ color: 'var(--accent)' }}>{r.dogs?.name}</span> · Owner: {r.profiles?.full_name} #{r.profiles?.member_id}
                    </p>
                    {r.placement && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                        Placement: #{r.placement} {r.score && `· Score: ${r.score}`}
                      </p>
                    )}
                  </div>
                  {r.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => updateStatus(r.id, 'approved')}
                        style={{ background: '#7ef7a033', border: '1px solid #7ef7a0', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#7ef7a0', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}
                      >Approve</button>
                      <button
                        onClick={() => updateStatus(r.id, 'rejected')}
                        style={{ background: '#f77e7e33', border: '1px solid #f77e7e', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}
                      >Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
      )}
    </div>
  )
}
