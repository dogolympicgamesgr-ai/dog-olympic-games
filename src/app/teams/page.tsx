'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'

export default function TeamsPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()

  const [teams, setTeams] = useState<any[]>([])
  const [totalTeams, setTotalTeams] = useState(0)
  const [totalMembers, setTotalMembers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    loadTeams()
    loadStats()
  }, [])

  async function loadTeams(query = '') {
    setSearching(true)
    let q = supabase
      .from('teams')
      .select('id, name, description, avatar_url, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (query.trim()) {
      q = q.ilike('name', `%${query}%`)
    }

    const { data } = await q
    // For each team, get member count + total points
    const enriched = await Promise.all((data || []).map(async (team: any) => {
      const { data: members } = await supabase
        .from('team_members')
        .select('profiles(points)')
        .eq('team_id', team.id)
        .eq('status', 'accepted')
      const memberCount = members?.length || 0
      const totalPoints = members?.reduce((sum: number, m: any) => sum + (m.profiles?.points || 0), 0) || 0
      return { ...team, memberCount, totalPoints }
    }))
    setTeams(enriched)
    setLoading(false)
    setSearching(false)
  }

  async function loadStats() {
    const { count: teamCount } = await supabase
      .from('teams').select('id', { count: 'exact', head: true })
    const { count: memberCount } = await supabase
      .from('team_members').select('id', { count: 'exact', head: true }).eq('status', 'accepted')
    setTotalTeams(teamCount || 0)
    setTotalMembers(memberCount || 0)
  }

  function handleSearch() {
    loadTeams(searchQuery)
  }

  if (loading) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )

  return (
    <main style={{
      minHeight: '100vh', background: 'var(--bg)',
      paddingTop: 'calc(var(--nav-height) + 2rem)',
      paddingBottom: '3rem',
    }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1.5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.5rem',
            letterSpacing: '0.05em', color: 'var(--text-primary)', margin: '0 0 0.25rem',
          }}>
            🛡️ {t('Ομάδες', 'Teams')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {t('Ομάδες συμμετεχόντων και οι σκύλοι τους', 'Participant teams and their dogs')}
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: t('Ομάδες', 'Teams'), value: totalTeams, icon: '🛡️' },
            { label: t('Μέλη', 'Members'), value: totalMembers, icon: '👥' },
          ].map(stat => (
            <div key={stat.label} style={{
              flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '1rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{stat.icon}</div>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.6rem', color: 'var(--accent)' }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input
            style={{
              flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '0.65rem 0.85rem',
              color: 'var(--text-primary)', fontSize: '0.9rem',
              fontFamily: 'Outfit, sans-serif', outline: 'none',
            }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={t('Αναζήτηση ομάδας...', 'Search teams...')}
          />
          <button onClick={handleSearch} disabled={searching} style={{
            background: 'var(--accent)', border: 'none', borderRadius: '8px',
            padding: '0.65rem 1.25rem', color: 'var(--bg)',
            fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
            fontSize: '0.9rem', whiteSpace: 'nowrap',
          }}>
            {searching ? '...' : t('Αναζήτηση', 'Search')}
          </button>
        </div>

        {/* Teams list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {teams.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem 0' }}>
              {t('Δεν βρέθηκαν ομάδες', 'No teams found')}
            </p>
          )}
          {teams.map((team: any) => (
            <div
              key={team.id}
              onClick={() => router.push(`/teams/${team.id}`)}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '12px', padding: '1rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '1rem',
                cursor: 'pointer', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {/* Avatar */}
              {team.avatar_url ? (
                <img src={team.avatar_url} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🛡️</div>
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {team.name}
                </p>
                {team.description && (
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {team.description}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem', flexShrink: 0 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  👥 {team.memberCount}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
                  {team.totalPoints} pts
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  )
}
