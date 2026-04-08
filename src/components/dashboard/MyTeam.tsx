'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'

export default function MyTeam({ team, profile, onSave }: { team: any, profile: any, onSave: () => void }) {
  const { t } = useLang()
  const supabase = createClient()
  const [view, setView] = useState<'main' | 'create' | 'join'>('main')
  const [saving, setSaving] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamDesc, setTeamDesc] = useState('')
  const [searchId, setSearchId] = useState('')
  const [foundTeam, setFoundTeam] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleCreate() {
    if (!teamName.trim() || !profile?.id) return
    setSaving(true)
    const { data: newTeam, error: createError } = await supabase.from('teams')
      .insert({ name: teamName, description: teamDesc, created_by: profile.id })
      .select().single()
    if (createError) { setMsg(t('Σφάλμα δημιουργίας', 'Error creating team')); setSaving(false); return }
    await supabase.from('team_members').insert({ team_id: newTeam.id, user_id: profile.id, status: 'accepted', invited_by: profile.id, joined_at: new Date().toISOString() })
    setSaving(false)
    onSave()
  }

  async function handleSearch() {
    if (!searchId.trim()) return
    setSearching(true)
    setFoundTeam(null)
    const { data } = await supabase.from('teams').select('*').ilike('name', `%${searchId}%`).limit(5)
    setFoundTeam(data || [])
    setSearching(false)
  }

  async function handleJoinRequest(teamId: string) {
    if (!profile?.id) return
    setSaving(true)
    const { error } = await supabase.from('team_members').insert({
      team_id: teamId, user_id: profile.id, status: 'pending', invited_by: profile.id,
    })
    setSaving(false)
    if (error) { setMsg(t('Σφάλμα αιτήματος', 'Error sending request')); return }
    setMsg(t('Το αίτημά σου στάλθηκε!', 'Request sent!'))
    setTimeout(() => { setMsg(''); setView('main'); onSave() }, 2000)
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '0.65rem 0.85rem',
    color: 'var(--text-primary)', fontSize: '0.9rem',
    fontFamily: 'Outfit, sans-serif', marginBottom: '0.75rem', outline: 'none',
  }

  if (team) return (
    <div>
      <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛡️</div>
        <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem', color: 'var(--accent)' }}>{team.name}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>ID: {team.id?.slice(0, 8)}</p>
        {team.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.75rem' }}>{team.description}</p>}
      </div>
    </div>
  )

  if (view === 'create') return (
    <div>
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
      <textarea style={{...inputStyle, minHeight: '80px', resize: 'vertical'}} value={teamDesc} onChange={e => setTeamDesc(e.target.value)} placeholder={t('Προαιρετικά...', 'Optional...')} />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => setView('main')} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>
          {t('Πίσω', 'Back')}
        </button>
        <button onClick={handleCreate} disabled={saving || !teamName.trim()} style={{ flex: 1, background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '0.75rem', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', opacity: !teamName.trim() ? 0.7 : 1 }}>
          {saving ? '...' : t('Δημιουργία', 'Create')}
        </button>
      </div>
    </div>
  )

  if (view === 'join') return (
    <div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
        {t('Αναζήτηση ομάδας', 'Search for a team')}
      </p>
      <input style={inputStyle} value={searchId} onChange={e => setSearchId(e.target.value)} placeholder={t('Όνομα ομάδας...', 'Team name...')} />
      <button onClick={handleSearch} disabled={searching} style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '0.75rem', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', marginBottom: '1rem' }}>
        {searching ? t('Αναζήτηση...', 'Searching...') : t('Αναζήτηση', 'Search')}
      </button>
      {Array.isArray(foundTeam) && foundTeam.map((ft: any) => (
        <div key={ft.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ft.name}</p>
            {ft.description && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ft.description}</p>}
          </div>
          <button onClick={() => handleJoinRequest(ft.id)} style={{ background: 'var(--accent)', border: 'none', borderRadius: '6px', padding: '0.4rem 0.85rem', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>
            {t('Αίτημα', 'Request')}
          </button>
        </div>
      ))}
      {msg && <p style={{ color: 'var(--accent)', textAlign: 'center', fontSize: '0.9rem', marginTop: '0.5rem' }}>{msg}</p>}
      <button onClick={() => setView('main')} style={{ width: '100%', marginTop: '0.5rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>
        {t('Πίσω', 'Back')}
      </button>
    </div>
  )

  return (
    <div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        {t('Δεν είσαι μέλος ομάδας ακόμα', 'You are not in a team yet')}
      </p>
      <button onClick={() => setView('create')} style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: '10px', padding: '1rem', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
        🛡️ {t('Δημιουργία Ομάδας', 'Create Team')}
      </button>
      <button onClick={() => setView('join')} style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem' }}>
        🔍 {t('Εύρεση & Αίτημα', 'Find & Request to Join')}
      </button>
    </div>
  )
}
