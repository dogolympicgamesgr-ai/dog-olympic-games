'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminAbsences() {
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, member_id, email, no_show_count, status')
      .gt('no_show_count', 0)
      .order('no_show_count', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  async function clearWarnings(userId: string) {
    setClearing(userId)
    await supabase
      .from('profiles')
      .update({ no_show_count: 0 })
      .eq('id', userId)
    setClearing(null)
    await load()
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>

  if (users.length === 0) return (
    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', paddingTop: '3rem' }}>
      <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</p>
      <p>No recorded absences.</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '700px' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '0.5rem' }}>
        {users.length} user{users.length > 1 ? 's' : ''} with recorded no-shows. Clear warnings after reviewing — penalties (ban etc.) are applied separately via Users tab.
      </p>
      {users.map(user => (
        <div key={user.id} style={{
          background: 'var(--bg-card)',
          border: '1px solid #f77e7e44',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <div style={{
              background: 'rgba(247,126,126,0.15)',
              border: '1px solid #f77e7e44',
              borderRadius: '99px',
              padding: '0.3rem 1rem',
              textAlign: 'center',
            }}>
              <span style={{ color: '#f77e7e', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.3rem', letterSpacing: '0.05em' }}>
                {user.no_show_count}
              </span>
              <span style={{ color: '#f77e7e', fontSize: '0.68rem', marginLeft: '0.3rem' }}>no-shows</span>
            </div>
            <button
              onClick={() => clearWarnings(user.id)}
              disabled={clearing === user.id}
              style={{
                background: 'transparent',
                border: '1px solid #7ef7a0',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                color: '#7ef7a0',
                cursor: clearing === user.id ? 'not-allowed' : 'pointer',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.82rem',
                fontWeight: 600,
                opacity: clearing === user.id ? 0.6 : 1,
              }}
            >
              {clearing === user.id ? 'Clearing...' : 'Clear Warnings'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}