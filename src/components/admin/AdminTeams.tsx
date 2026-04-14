'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminTeams() {
  const supabase = createClient()
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [members, setMembers] = useState<Record<string, any[]>>({})
  const [membersLoading, setMembersLoading] = useState(false)

  useEffect(() => { loadTeams() }, [])

  async function loadTeams() {
    setLoading(true)
    const { data } = await supabase
      .from('teams')
      .select('*, profiles!teams_leader_id_fkey(full_name, member_id)')
      .order('created_at', { ascending: false })
    setTeams(data || [])
    setLoading(false)
  }

  async function expandTeam(teamId: string) {
    if (expanded === teamId) { setExpanded(null); return }
    setExpanded(teamId)

    if (members[teamId]) return // already loaded

    setMembersLoading(true)
    const { data } = await supabase
      .from('team_members')
      .select('*, profiles!team_members_user_id_fkey(full_name, member_id, avatar_url)')
      .eq('team_id', teamId)
    setMembers(prev => ({ ...prev, [teamId]: data || [] }))
    setMembersLoading(false)
  }

  async function deleteTeam(teamId: string) {
    if (!confirm('Delete this team? This cannot be undone.')) return
    await supabase.from('team_members').delete().eq('team_id', teamId)
    await supabase.from('teams').delete().eq('id', teamId)
    loadTeams()
  }

  return (
    <div>
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {teams.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No teams yet</p>
          )}
          {teams.map(team => (
            <div key={team.id} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '1rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
              }}>
                <div onClick={() => expandTeam(team.id)} style={{ cursor: 'pointer', flex: 1 }}>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{team.name}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    Leader: {team.profiles?.full_name} #{team.profiles?.member_id}
                  </p>
                  {team.description && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                      {team.description}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button onClick={() => expandTeam(team.id)} style={{
                    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px',
                    padding: '0.4rem 0.75rem', color: 'var(--text-secondary)', cursor: 'pointer',
                    fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif',
                  }}>
                    {expanded === team.id ? 'Hide' : 'Members'}
                  </button>
                  <button onClick={() => deleteTeam(team.id)} style={{
                    background: '#f77e7e33', border: '1px solid #f77e7e', borderRadius: '6px',
                    padding: '0.4rem 0.75rem', color: '#f77e7e', cursor: 'pointer',
                    fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif',
                  }}>Delete</button>
                </div>
              </div>

              {expanded === team.id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.25rem' }}>
                  {membersLoading && !members[team.id] ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading members...</p>
                  ) : members[team.id]?.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No members</p>
                  ) : members[team.id]?.map((m, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.4rem 0',
                      borderBottom: i < members[team.id].length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        border: '1px solid var(--accent)', overflow: 'hidden',
                        background: 'var(--bg)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexShrink: 0,
                      }}>
                        {m.profiles?.avatar_url
                          ? <img src={m.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : '👤'}
                      </div>
                      <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                        {m.profiles?.full_name}
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}> #{m.profiles?.member_id}</span>
                      </span>
                      <span style={{
                        marginLeft: 'auto', fontSize: '0.72rem',
                        color: m.status === 'accepted' ? '#7ef7a0' : 'var(--accent)',
                      }}>
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
