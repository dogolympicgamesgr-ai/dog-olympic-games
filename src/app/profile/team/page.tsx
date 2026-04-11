'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'

export default function MyTeamPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [team, setTeam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'main' | 'create' | 'join'>('main')
  const [saving, setSaving] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamDesc, setTeamDesc] = useState('')
  const [searchId, setSearchId] = useState('')
  const [foundTeams, setFoundTeams] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    async function init() {
      const res = await fetch('/auth/session')
      const { user } = await res.json()
      if (!user) { router.push('/'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: memberData } = await supabase
        .from('team_members').select('*, teams(*)')
        .eq('user_id', user.id).eq('status', 'accepted').maybeSingle()
      setTeam(memberData?.teams || null)
      setLoading(false)
    }
    init()
  }, [])

  async function handleCreate() {
    if (!teamName.trim() || !profile?.id) return
    setSaving(true)
    const { data: newTeam, error } = await supabase.from('teams')
      .insert({ name: teamName, description: teamDesc, created_by: profile.id })
      .select().single()
    if (error) { setMsg(t('Σφάλμα δημιουργίας', 'Error creating team')); setSaving(false); return }
    await supabase.from('team_members').insert({
      team_id: newTeam.id, user_id: profile.id,
      status: 'accepted', invited_by: profile.id,
      joined_at: new Date().toISOString(),
    })
    setSaving(false)
    setTeam(newTeam)
    setView('main')
  }

  async function handleSearch() {
    if (!searchId.trim()) return
    setSearching(true)
    setFoundTeams([])
    const { data } = await supabase.from('teams').select('*').ilike('name', `%${searchId}%`).limit(5)
    setFoundTeams(data || [])
    setSearching(false)
  }

  async function handleJoinRequest(teamId: string) {
    if (!profile?.id) return
    setSaving(true)
    const { error } = await supabase.from('team_members').insert({
      team_id: teamId, user_id: profile.id,
      status: 'pending', invited_by: profile.id,
    })
    setSaving(false)
    if (error) { setMsg(t('Σφάλμα αιτήματος', 'Error sending request')); return }
    setMsg(t('Το αίτημά σου στάλθηκε!', 'Request sent!'))
    setTimeout(() => { setMsg(''); setView('main') }, 2000)
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '0.65rem 0.85rem',
    color: 'var(--text-primary)', fontSize: '0.9rem',
    fontFamily: 'Outfit, sans-serif', marginBottom: '0.75rem',
    outline: 'none', boxSizing: 'border-box' as const,
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
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          {view !== 'main' ? (
            <button onClick={() => setView('main')} style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '1.2rem', padding: '0.25rem',
            }}>←</button>
          ) : (
            <button onClick={() => router.back()} style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '1.2rem', padding: '0.25rem',
            }}>←</button>
          )}
          <h1 style={{
            fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem',
            letterSpacing: '0.05em', color: 'var(--text-primary)',
          }}>
            👥 {t('Η Ομάδα μου', 'My Team')}
          </h1>
        </div>

        {team && view === 'main' && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '2rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🛡️</div>
            <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.8rem', color: 'var(--accent)', letterSpacing: '0.05em' }}>
              {team.name}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              ID: {team.id?.slice(0, 8)}
            </p>
            {team.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                {team.description}
              </p>
            )}
          </div>
        )}

        {!team && view === 'main' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '0.5rem' }}>
              {t('Δεν είσαι μέλος ομάδας ακόμα', 'You are not in a team yet')}
            </p>
            <button onClick={() => setView('create')} style={{
              background: 'var(--accent)', border: 'none', borderRadius: '12px',
              padding: '1rem', color: 'var(--bg)', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem',
            }}>
              🛡️ {t('Δημιουργία Ομάδας', 'Create Team')}
            </button>
            <button onClick={() => setView('join')} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '1rem', color: 'var(--text-primary)',
              cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem',
            }}>
              🔍 {t('Εύρεση & Αίτημα', 'Find & Request to Join')}
            </button>
          </div>
        )}

        {view === 'create' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {t('Δημιούργησε νέα ομάδα', 'Create a new team')}
            </p>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
              {t('Όνομα ομάδας *', 'Team name *')}
            </label>
            <input style={inputStyle} value={teamName} onChange={e => setTeamName(e.target.value)} placeholder={t('Όνομα...', 'Name...')} />
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
              {t('Περιγραφή', 'Description')}
            </label>
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              value={teamDesc} onChange={e => setTeamDesc(e.target.value)}
              placeholder={t('Προαιρετικά...', 'Optional...')} />
            {msg && <p style={{ color: '#f77e7e', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{msg}</p>}
            <button onClick={handleCreate} disabled={saving || !teamName.trim()} style={{
              width: '100%', background: 'var(--accent)', border: 'none',
              borderRadius: '8px', padding: '0.85rem', color: 'var(--bg)',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
              opacity: !teamName.trim() ? 0.7 : 1,
            }}>
              {saving ? '...' : t('Δημιουργία', 'Create')}
            </button>
          </div>
        )}

        {view === 'join' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {t('Αναζήτηση ομάδας', 'Search for a team')}
            </p>
            <input style={inputStyle} value={searchId} onChange={e => setSearchId(e.target.value)}
              placeholder={t('Όνομα ομάδας...', 'Team name...')} />
            <button onClick={handleSearch} disabled={searching} style={{
              width: '100%', background: 'var(--accent)', border: 'none',
              borderRadius: '8px', padding: '0.75rem', color: 'var(--bg)',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', marginBottom: '1rem',
            }}>
              {searching ? t('Αναζήτηση...', 'Searching...') : t('Αναζήτηση', 'Search')}
            </button>
            {foundTeams.map((ft: any) => (
              <div key={ft.id} style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '1rem', marginBottom: '0.5rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ft.name}</p>
                  {ft.description && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ft.description}</p>}
                </div>
                <button onClick={() => handleJoinRequest(ft.id)} style={{
                  background: 'var(--accent)', border: 'none', borderRadius: '6px',
                  padding: '0.4rem 0.85rem', color: 'var(--bg)',
                  fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem',
                  fontFamily: 'Outfit, sans-serif',
                }}>
                  {t('Αίτημα', 'Request')}
                </button>
              </div>
            ))}
            {msg && <p style={{ color: 'var(--accent)', textAlign: 'center', fontSize: '0.9rem', marginTop: '0.5rem' }}>{msg}</p>}
          </div>
        )}
      </div>
    </main>
  )
}