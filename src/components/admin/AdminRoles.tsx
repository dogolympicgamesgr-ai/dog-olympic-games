'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const ROLE_GROUPS = [
  { role: 'judge', icon: '⚖️', label: 'Judges', color: '#7eb8f7' },
  { role: 'organizer', icon: '📋', label: 'Organizers', color: '#7ef7a0' },
  { role: 'decoy', icon: '🎯', label: 'Decoys', color: '#f77e7e' },
]

const FOUNDATION_SPORTS = [
  { id: 'eed3995d-6e70-42c9-994d-4c684c7e9286', name_en: 'Entry Level', name_el: 'Εισαγωγικό Επίπεδο' },
  { id: '72b6e4ff-3ef5-4f85-bcba-9385ead2b37f', name_en: 'Basic Level', name_el: 'Βασικό Επίπεδο' },
]

const DISCIPLINE_SPORTS = [
  { id: '7fb8f0e4-b196-4bbf-adfc-a242388834a2', name_en: 'Obedience', name_el: 'Υπακοή' },
  { id: '8b541fbf-5677-4511-8c30-cb0b45285352', name_en: 'Protection', name_el: 'Προστασία' },
  { id: '6d4d3351-b297-4fcf-8eb1-53f01abc2ded', name_en: 'Detection', name_el: 'Ανίχνευση' },
  { id: '28b101f4-c34d-48d9-a003-c47ea51009e9', name_en: 'Agility', name_el: 'Ευκινησία' },
]

export default function AdminRoles() {
  const supabase = createClient()
  const [roleData, setRoleData] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [expandedJudge, setExpandedJudge] = useState<string | null>(null)
  const [qualifications, setQualifications] = useState<Record<string, any[]>>({}) // keyed by judge user_id
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadRoles() }, [])

  async function loadRoles() {
    setLoading(true)
    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('role, user_id')
      .in('role', ['judge', 'organizer', 'decoy'])

    if (!roleRows || roleRows.length === 0) {
      setRoleData({ judge: [], organizer: [], decoy: [] })
      setLoading(false)
      return
    }

    const userIds = [...new Set(roleRows.map((r: any) => r.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, member_id, email, avatar_url')
      .in('id', userIds)

    const profileMap: Record<string, any> = {}
    profiles?.forEach((p: any) => { profileMap[p.id] = p })

    const grouped: Record<string, any[]> = { judge: [], organizer: [], decoy: [] }
    roleRows.forEach((r: any) => {
      if (grouped[r.role] && profileMap[r.user_id]) {
        grouped[r.role].push(profileMap[r.user_id])
      }
    })
    setRoleData(grouped)

    // Load qualifications for all judges
    if (grouped.judge.length > 0) {
      const judgeIds = grouped.judge.map((j: any) => j.id)
      const { data: quals } = await supabase
        .from('judge_qualifications')
        .select('*')
        .in('judge_user_id', judgeIds)

      const qualMap: Record<string, any[]> = {}
      judgeIds.forEach((id: string) => { qualMap[id] = [] })
      quals?.forEach((q: any) => {
        if (qualMap[q.judge_user_id]) qualMap[q.judge_user_id].push(q)
      })
      setQualifications(qualMap)
    }

    setLoading(false)
  }

  function getQual(judgeId: string, sportId: string) {
    return qualifications[judgeId]?.find(q => q.sport_id === sportId) || null
  }

  async function toggleFoundationQual(judgeId: string, sportId: string) {
    setSaving(true)
    const existing = getQual(judgeId, sportId)
    if (existing) {
      await supabase.from('judge_qualifications').delete().eq('id', existing.id)
    } else {
      await supabase.from('judge_qualifications').insert({
        judge_user_id: judgeId,
        sport_id: sportId,
        max_sublevel: null,
      })
    }
    await reloadQuals(judgeId)
    setSaving(false)
  }

  async function setDisciplineQual(judgeId: string, sportId: string, level: number | null) {
    setSaving(true)
    const existing = getQual(judgeId, sportId)
    if (level === null) {
      // Remove qualification
      if (existing) await supabase.from('judge_qualifications').delete().eq('id', existing.id)
    } else if (existing) {
      await supabase.from('judge_qualifications').update({ max_sublevel: level }).eq('id', existing.id)
    } else {
      await supabase.from('judge_qualifications').insert({
        judge_user_id: judgeId,
        sport_id: sportId,
        max_sublevel: level,
      })
    }
    await reloadQuals(judgeId)
    setSaving(false)
  }

  async function reloadQuals(judgeId: string) {
    const { data } = await supabase
      .from('judge_qualifications')
      .select('*')
      .eq('judge_user_id', judgeId)
    setQualifications(prev => ({ ...prev, [judgeId]: data || [] }))
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {ROLE_GROUPS.map(({ role, icon, label, color }) => (
        <div key={role} style={{ background: 'var(--bg-card)', border: `1px solid ${color}33`, borderRadius: '12px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{icon}</span>
            <h3 style={{ color, fontWeight: 600, fontSize: '1rem', margin: 0 }}>{label}</h3>
            <span style={{ marginLeft: 'auto', background: 'var(--bg)', borderRadius: '20px', padding: '0.15rem 0.6rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {roleData[role]?.length || 0}
            </span>
          </div>

          {/* Members */}
          <div style={{ padding: '0.75rem' }}>
            {roleData[role]?.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.5rem', textAlign: 'center' }}>None assigned</p>
            ) : roleData[role]?.map((user, i) => {
              const isExpanded = role === 'judge' && expandedJudge === user.id
              const userQuals = qualifications[user.id] || []

              return (
                <div key={user.id}>
                  {/* User row */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderBottom: i < roleData[role].length - 1 && !isExpanded ? '1px solid var(--border)' : 'none', cursor: role === 'judge' ? 'pointer' : 'default', borderRadius: '8px', transition: 'background 0.1s' }}
                    onClick={() => role === 'judge' && setExpandedJudge(isExpanded ? null : user.id)}
                    onMouseEnter={e => { if (role === 'judge') e.currentTarget.style.background = 'var(--bg)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg)', border: `1px solid ${color}`, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                      {user?.avatar_url ? <img src={user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500, margin: 0 }}>{user?.full_name || 'No name'}</p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', margin: 0 }}>#{user?.member_id}</p>
                    </div>
                    {role === 'judge' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {/* Qual summary pills */}
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {userQuals.length === 0 ? (
                            <span style={{ fontSize: '0.68rem', color: '#f77e7e', background: '#f77e7e11', border: '1px solid #f77e7e33', borderRadius: '99px', padding: '0.1rem 0.45rem' }}>No qualifications</span>
                          ) : userQuals.map(q => {
                            const sport = [...FOUNDATION_SPORTS, ...DISCIPLINE_SPORTS].find(s => s.id === q.sport_id)
                            const isDisc = DISCIPLINE_SPORTS.find(s => s.id === q.sport_id)
                            return (
                              <span key={q.id} style={{ fontSize: '0.68rem', color: '#7eb8f7', background: '#7eb8f711', border: '1px solid #7eb8f733', borderRadius: '99px', padding: '0.1rem 0.45rem', whiteSpace: 'nowrap' }}>
                                {sport?.name_en}{isDisc && q.max_sublevel ? ` ≤${q.max_sublevel}` : ''}
                              </span>
                            )
                          })}
                        </div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    )}
                  </div>

                  {/* Qualification manager — judges only */}
                  {isExpanded && (
                    <div style={{ margin: '0.25rem 0 0.75rem', padding: '1rem', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <p style={{ margin: '0 0 0.85rem', fontSize: '0.72rem', color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Judge Qualifications {saving && '— saving...'}
                      </p>

                      {/* Foundation sports — checkbox */}
                      <p style={{ margin: '0 0 0.4rem', fontSize: '0.78rem', color: '#7eb8f7', fontWeight: 600 }}>Foundation</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                        {FOUNDATION_SPORTS.map(sport => {
                          const has = !!getQual(user.id, sport.id)
                          return (
                            <label key={sport.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                              <input
                                type="checkbox"
                                checked={has}
                                disabled={saving}
                                onChange={() => toggleFoundationQual(user.id, sport.id)}
                                style={{ accentColor: '#7eb8f7', width: '15px', height: '15px', cursor: 'pointer' }}
                              />
                              <span>{sport.name_en}</span>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>({sport.name_el})</span>
                            </label>
                          )
                        })}
                      </div>

                      {/* Discipline sports — dropdown for sublevel */}
                      <p style={{ margin: '0 0 0.4rem', fontSize: '0.78rem', color: '#7eb8f7', fontWeight: 600 }}>Disciplines</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {DISCIPLINE_SPORTS.map(sport => {
                          const qual = getQual(user.id, sport.id)
                          const currentLevel = qual?.max_sublevel ?? null
                          return (
                            <div key={sport.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', flex: 1 }}>
                                {sport.name_en}
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginLeft: '0.35rem' }}>({sport.name_el})</span>
                              </span>
                              <select
                                value={currentLevel ?? 'none'}
                                disabled={saving}
                                onChange={e => {
                                  const val = e.target.value
                                  setDisciplineQual(user.id, sport.id, val === 'none' ? null : parseInt(val))
                                }}
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.3rem 0.6rem', color: qual ? '#7eb8f7' : 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif', cursor: 'pointer', outline: 'none' }}
                              >
                                <option value="none">Not qualified</option>
                                <option value="1">Up to sublevel 1</option>
                                <option value="2">Up to sublevel 2</option>
                                <option value="3">All sublevels</option>
                              </select>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
