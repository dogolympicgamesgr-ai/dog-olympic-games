'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type SeminarFilter = 'pending' | 'approved' | 'completed' | 'cancelled'

export default function AdminSeminars() {
  const supabase = createClient()
  const [seminars, setSeminars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<SeminarFilter>('pending')

  useEffect(() => { loadSeminars() }, [filter])

  async function loadSeminars() {
    setLoading(true)
    const { data } = await supabase
      .from('seminars')
      .select('*, profiles(full_name, member_id)')
      .eq('status', filter)
      .order('seminar_date', { ascending: true })
    setSeminars(data || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('seminars').update({ status }).eq('id', id)
    loadSeminars()
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
    textTransform: 'capitalize' as const,
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(['pending', 'approved', 'completed', 'cancelled'] as SeminarFilter[]).map(s => (
          <button key={s} onClick={() => setFilter(s)} style={tabStyle(s)}>{s}</button>
        ))}
      </div>

      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {seminars.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
              No {filter} seminars
            </p>
          )}
          {seminars.map(s => (
            <div key={s.id} style={{
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
                <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {s.title_el}
                  {s.is_online && <span style={{ color: '#7eb8f7', fontSize: '0.75rem', marginLeft: '0.5rem' }}>ONLINE</span>}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {s.is_online ? s.url : s.location} · {s.seminar_date ? new Date(s.seminar_date).toLocaleDateString('el-GR') : 'No date'}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  By: {s.profiles?.full_name || 'Admin'} #{s.profiles?.member_id}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {s.status === 'pending' && <>
                  <button onClick={() => updateStatus(s.id, 'approved')} style={{ background: '#7ef7a033', border: '1px solid #7ef7a0', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#7ef7a0', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Approve</button>
                  <button onClick={() => updateStatus(s.id, 'cancelled')} style={{ background: '#f77e7e33', border: '1px solid #f77e7e', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Reject</button>
                </>}
                {s.status === 'approved' && (
                  <button onClick={() => updateStatus(s.id, 'cancelled')} style={{ background: '#f77e7e33', border: '1px solid #f77e7e', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Cancel</button>
                )}
                {s.status === 'cancelled' && (
                  <button onClick={() => updateStatus(s.id, 'approved')} style={{ background: '#7ef7a033', border: '1px solid #7ef7a0', borderRadius: '6px', padding: '0.4rem 0.75rem', color: '#7ef7a0', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>Restore</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
