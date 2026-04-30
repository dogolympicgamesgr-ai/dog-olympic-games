'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'

export default function TeamsPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()

  const [teams, setTeams] = useState<any[]>([])
  const [totalTeams, setTotalTeams] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadTeams()
  }, [])

  async function loadTeams() {
    setLoading(true)

    // Single query: teams + accepted member count via aggregate
    const { data, count } = await supabase
      .from('teams')
      .select(`
        id, name, description, avatar_url, created_at,
        team_members!inner(id)
      `, { count: 'exact' })
      .eq('team_members.status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(100)

    // Fallback: also fetch teams with zero members (inner join excludes them)
    const { data: allTeams, count: allCount } = await supabase
      .from('teams')
      .select('id, name, description, avatar_url, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(100)

    // Get member counts separately in one query
    const { data: memberCounts } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('status', 'accepted')

    const countMap: Record<string, number> = {}
    for (const row of memberCounts || []) {
      countMap[row.team_id] = (countMap[row.team_id] || 0) + 1
    }

    const enriched = (allTeams || []).map((team: any) => ({
      ...team,
      memberCount: countMap[team.id] || 0,
    }))

    setTeams(enriched)
    setTotalTeams(allCount || 0)
    setLoading(false)
  }

  // Live client-side filter — instant, no extra DB hits
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return teams
    return teams.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q)
    )
  }, [searchQuery, teams])

  if (loading) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1.5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.5rem',
            letterSpacing: '0.05em', color: 'var(--text-primary)', margin: '0 0 0.25rem',
          }}>
            🛡️ {t('Ομάδες', 'Teams')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            {t('Σύλλογοι, λέσχες και παρέες του Canathlon', 'Clubs, groups and crews of Canathlon')}
          </p>
        </div>

        {/* Single stat */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '1rem 1.5rem',
          display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
          marginBottom: '1.5rem',
        }}>
          <span style={{ fontSize: '1.5rem' }}>🛡️</span>
          <div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.6rem', color: 'var(--accent)', lineHeight: 1 }}>
              {totalTeams}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {t('Ενεργές Ομάδες', 'Active Teams')}
            </div>
          </div>
        </div>

        {/* Live search */}
        <div style={{ marginBottom: '1.5rem' }}>
          <input
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '0.65rem 0.85rem',
              color: 'var(--text-primary)', fontSize: '0.9rem',
              fontFamily: 'Outfit, sans-serif', outline: 'none',
            }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('Αναζήτηση ομάδας...', 'Search teams...')}
          />
        </div>

        {/* Teams list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem 0' }}>
              {t('Δεν βρέθηκαν ομάδες', 'No teams found')}
            </p>
          )}
          {filtered.map((team: any) => (
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
              {team.avatar_url
                ? <img src={team.avatar_url} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🛡️</div>
              }
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
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                👥 {team.memberCount}
              </span>
            </div>
          ))}
        </div>

      </div>
    </main>
  )
}
