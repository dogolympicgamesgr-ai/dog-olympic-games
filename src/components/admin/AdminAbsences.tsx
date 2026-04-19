'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminAbsences() {
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [records, setRecords] = useState<Record<string, any[]>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState<string | null>(null)
  const [clearAmounts, setClearAmounts] = useState<Record<string, number>>({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, member_id, email, no_show_count, total_no_shows, status')
      .gt('total_no_shows', 0)
      .order('total_no_shows', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  async function loadRecords(userId: string) {
    if (records[userId]) return
    const { data } = await supabase
      .from('no_show_records')
      .select('id, created_at, event_id, dog_id, events(title_el, event_date, location), dogs(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setRecords(prev => ({ ...prev, [userId]: data || [] }))
  }

  async function clearWarnings(userId: string, amount: number) {
    const user = users.find(u => u.id === userId)
    if (!user) return
    const newCount = Math.max(0, user.no_show_count - amount)
    setClearing(userId)
    await supabase
      .from('profiles')
      .update({ no_show_count: newCount })
      .eq('id', userId)
    setClearing(null)
    setClearAmounts(prev => ({ ...prev, [userId]: 0 }))
    await load()
  }

  function toggleExpand(userId: string) {
    if (expanded === userId) {
      setExpanded(null)
    } else {
      setExpanded(userId)
      loadRecords(userId)
    }
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>

  if (users.length === 0) return (
    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', paddingTop: '3rem' }}>
      <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</p>
      <p>No recorded absences.</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '750px' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '0.5rem' }}>
        {users.length} user{users.length > 1 ? 's' : ''} with recorded no-shows. Active warnings can be partially or fully cleared. Lifetime total is never reduced.
      </p>

      {users.map(user => {
        const isExpanded = expanded === user.id
        const clearAmount = clearAmounts[user.id] || 0
        const userRecords = records[user.id] || []

        return (
          <div key={user.id} style={{
            background: 'var(--bg-card)',
            border: `1px solid ${user.no_show_count > 0 ? '#f77e7e44' : 'var(--border)'}`,
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            {/* Header row */}
            <div style={{
              padding: '1rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                  {user.full_name}
                  <span style={{ color: 'var(--accent)', fontWeight: 400, fontSize: '0.75rem', marginLeft: '0.4rem' }}>
                    #{user.member_id}
                  </span>
                  {user.status === 'banned' && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.68rem', color: '#f77e7e', fontWeight: 700, padding: '0.1rem 0.4rem', border: '1px solid #f77e7e44', borderRadius: '99px' }}>
                      BANNED
                    </span>
                  )}
                </p>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{user.email}</p>
              </div>

              {/* Counters */}
              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexShrink: 0 }}>
                {/* Active warnings */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    background: user.no_show_count > 0 ? 'rgba(247,126,126,0.15)' : 'var(--bg)',
                    border: `1px solid ${user.no_show_count > 0 ? '#f77e7e44' : 'var(--border)'}`,
                    borderRadius: '8px',
                    padding: '0.3rem 0.75rem',
                  }}>
                    <span style={{ color: user.no_show_count > 0 ? '#f77e7e' : 'var(--text-secondary)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.4rem' }}>
                      {user.no_show_count}
                    </span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.62rem', color: 'var(--text-secondary)' }}>Active</p>
                </div>

                {/* Lifetime total */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    background: 'rgba(120,120,255,0.1)',
                    border: '1px solid #a0a0ff33',
                    borderRadius: '8px',
                    padding: '0.3rem 0.75rem',
                  }}>
                    <span style={{ color: '#a0a0ff', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.4rem' }}>
                      {user.total_no_shows}
                    </span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.62rem', color: 'var(--text-secondary)' }}>Lifetime</p>
                </div>

                {/* Expand button */}
                <button
                  onClick={() => toggleExpand(user.id)}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.75rem',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '0.78rem',
                  }}
                >
                  {isExpanded ? '▲ Hide' : '▼ History'}
                </button>
              </div>
            </div>

            {/* Clear controls — only if active warnings exist */}
            {user.no_show_count > 0 && (
              <div style={{
                padding: '0.75rem 1.25rem',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                  Clear warnings:
                </p>
                <input
                  type="number"
                  min={1}
                  max={user.no_show_count}
                  value={clearAmount || ''}
                  onChange={e => setClearAmounts(prev => ({ ...prev, [user.id]: Math.min(user.no_show_count, Math.max(1, parseInt(e.target.value) || 0)) }))}
                  placeholder={`1–${user.no_show_count}`}
                  style={{
                    width: '80px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '0.4rem 0.6rem',
                    color: 'var(--text-primary)',
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => clearWarnings(user.id, clearAmount)}
                  disabled={!clearAmount || clearing === user.id}
                  style={{
                    background: clearAmount ? '#7ef7a033' : 'transparent',
                    border: `1px solid ${clearAmount ? '#7ef7a0' : 'var(--border)'}`,
                    borderRadius: '8px',
                    padding: '0.4rem 1rem',
                    color: clearAmount ? '#7ef7a0' : 'var(--text-secondary)',
                    cursor: clearAmount && clearing !== user.id ? 'pointer' : 'not-allowed',
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    opacity: clearing === user.id ? 0.6 : 1,
                  }}
                >
                  {clearing === user.id ? 'Clearing...' : 'Clear'}
                </button>
                <button
                  onClick={() => clearWarnings(user.id, user.no_show_count)}
                  disabled={clearing === user.id}
                  style={{
                    background: 'transparent',
                    border: '1px solid #f77e7e44',
                    borderRadius: '8px',
                    padding: '0.4rem 1rem',
                    color: '#f77e7e',
                    cursor: clearing !== user.id ? 'pointer' : 'not-allowed',
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '0.82rem',
                    opacity: clearing === user.id ? 0.6 : 1,
                  }}
                >
                  Clear All
                </button>
              </div>
            )}

            {/* History */}
            {isExpanded && (
              <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)' }}>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  No-show history
                </p>
                {userRecords.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Loading...</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {userRecords.map((rec: any) => (
                      <div key={rec.id} style={{
                        background: 'var(--bg)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                      }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {rec.events?.title_el || 'Unknown event'}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            🐕 {rec.dogs?.name || '—'} · {rec.events?.location || '—'}
                          </p>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                          {rec.created_at ? new Date(rec.created_at).toLocaleDateString('el-GR') : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}