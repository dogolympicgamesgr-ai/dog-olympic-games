'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const ROLE_GROUPS = [
  { role: 'judge',     icon: '⚖️', label: 'Judges',     color: '#7eb8f7' },
  { role: 'organizer', icon: '📋', label: 'Organizers',  color: '#7ef7a0' },
  { role: 'decoy',     icon: '🎯', label: 'Decoys',      color: '#f77e7e' },
]

export default function AdminRoles() {
  const supabase = createClient()
  const [roleData, setRoleData] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadRoles() }, [])

  async function loadRoles() {
    setLoading(true)
    const { data } = await supabase
      .from('user_roles')
      .select('role, profiles(full_name, member_id, email, avatar_url)')
      .in('role', ['judge', 'organizer', 'decoy'])

    const grouped: Record<string, any[]> = { judge: [], organizer: [], decoy: [] }
    data?.forEach((r: any) => {
      if (grouped[r.role]) grouped[r.role].push(r.profiles)
    })
    setRoleData(grouped)
    setLoading(false)
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
      {ROLE_GROUPS.map(({ role, icon, label, color }) => (
        <div key={role} style={{ background: 'var(--bg-card)', border: `1px solid ${color}33`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{icon}</span>
            <h3 style={{ color, fontWeight: 600, fontSize: '1rem' }}>{label}</h3>
            <span style={{ marginLeft: 'auto', background: 'var(--bg)', borderRadius: '20px', padding: '0.15rem 0.6rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {roleData[role]?.length || 0}
            </span>
          </div>
          <div style={{ padding: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
            {roleData[role]?.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.5rem', textAlign: 'center' }}>None assigned</p>
            ) : roleData[role]?.map((user, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderBottom: i < roleData[role].length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg)', border: `1px solid ${color}`, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                  {user?.avatar_url ? <img src={user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                </div>
                <div>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>{user?.full_name || 'No name'}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>#{user?.member_id}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
