'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'

type View = 'main' | 'create' | 'join' | 'manage' | 'invite'

export default function MyTeamPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<any>(null)
  const [team, setTeam] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([]) // incoming (captain sees)
  const [myPendingRequests, setMyPendingRequests] = useState<any[]>([]) // outgoing (member sees)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('main')
  const [saving, setSaving] = useState(false)

  // Create form
  const [teamName, setTeamName] = useState('')
  const [teamDesc, setTeamDesc] = useState('')

  // Join form
  const [searchQuery, setSearchQuery] = useState('')
  const [foundTeams, setFoundTeams] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  // Invite form
  const [inviteMemberId, setInviteMemberId] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')

  // Avatar upload
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'error' | 'success'>('success')

  function showMsg(text: string, type: 'error' | 'success' = 'success') {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 3000)
  }

  useEffect(() => {
    init()
  }, [])

  async function init() {
    setLoading(true)
    const res = await fetch('/auth/session')
    const { user } = await res.json()
    if (!user) { router.push('/'); return }

    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    // Check if user is in a team
    const { data: memberData } = await supabase
      .from('team_members')
      .select('*, teams(*)')
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .maybeSingle()

    if (memberData?.teams) {
      setTeam(memberData.teams)
      await loadTeamData(memberData.teams.id, user.id, memberData.teams.created_by)
    } else {
      // Load user's outgoing pending requests
      const { data: myPending } = await supabase
        .from('team_members')
        .select('*, teams(id, name, avatar_url)')
        .eq('user_id', user.id)
        .eq('status', 'pending')
      setMyPendingRequests(myPending || [])
    }

    setLoading(false)
  }

  async function loadTeamData(teamId: string, userId: string, captainId: string) {
    // Load members with profiles
    const { data: mems } = await supabase
      .from('team_members')
      .select('*, profiles(id, full_name, avatar_url, member_id, points)')
      .eq('team_id', teamId)
      .eq('status', 'accepted')
    setMembers(mems || [])

    // If captain, load pending join requests
    if (userId === captainId) {
      const { data: pending } = await supabase
        .from('team_members')
        .select('*, profiles(id, full_name, avatar_url, member_id)')
        .eq('team_id', teamId)
        .eq('status', 'pending')
      setPendingRequests(pending || [])
    }
  }

  const isCaptin = profile && team && team.created_by === profile.id

  // ── CREATE ──
  async function handleCreate() {
    if (!teamName.trim() || !profile?.id) return
    setSaving(true)
    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert({ name: teamName, description: teamDesc, created_by: profile.id })
      .select().single()
    if (error) { showMsg(t('Σφάλμα δημιουργίας ομάδας', 'Error creating team'), 'error'); setSaving(false); return }
    await supabase.from('team_members').insert({
      team_id: newTeam.id, user_id: profile.id,
      status: 'accepted', invited_by: profile.id,
      joined_at: new Date().toISOString(),
    })
    setSaving(false)
    setTeam(newTeam)
    setView('main')
    await init()
  }

  // ── SEARCH & REQUEST ──
  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    setFoundTeams([])
    const { data } = await supabase
      .from('teams').select('*').ilike('name', `%${searchQuery}%`).limit(8)
    setFoundTeams(data || [])
    setSearching(false)
  }

  async function handleJoinRequest(teamId: string) {
    if (!profile?.id) return
    // Check already pending to this team
    const { data: existing } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', profile.id)
      .maybeSingle()
    if (existing) { showMsg(t('Ήδη έχεις στείλει αίτημα', 'Already sent a request'), 'error'); return }

    setSaving(true)
    const { error } = await supabase.from('team_members').insert({
      team_id: teamId, user_id: profile.id,
      status: 'pending', invited_by: profile.id,
    })
    setSaving(false)
    if (error) { showMsg(t('Σφάλμα αιτήματος', 'Error sending request'), 'error'); return }
    showMsg(t('Το αίτημά σου στάλθηκε!', 'Request sent!'))
    await init()
    setView('main')
  }

  async function handleCancelRequest(requestId: string) {
    await supabase.from('team_members').delete().eq('id', requestId)
    showMsg(t('Αίτημα ακυρώθηκε', 'Request cancelled'))
    await init()
  }

  // ── CAPTAIN: ACCEPT / REJECT ──
  async function handleAccept(memberId: string, userId: string) {
    // Check if user already in a team
    const { data: existing } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .maybeSingle()

    if (existing) {
      // Delete pending row, notify captain via UI
      await supabase.from('team_members').delete().eq('id', memberId)
      showMsg(t('Ο χρήστης είναι ήδη σε ομάδα. Το αίτημα αφαιρέθηκε.', 'User already in a team. Request removed.'), 'error')
      await loadTeamData(team.id, profile.id, team.created_by)
      return
    }

    // Accept
    await supabase.from('team_members')
      .update({ status: 'accepted', joined_at: new Date().toISOString() })
      .eq('id', memberId)

    // Notify accepted user
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'team_accepted',
      title_el: 'Αποδοχή σε ομάδα',
      title_en: 'Team Request Accepted',
      message_el: `Το αίτημά σου για την ομάδα "${team.name}" έγινε δεκτό!`,
      message_en: `Your request to join "${team.name}" has been accepted!`,
      metadata: { team_id: team.id },
    })

    showMsg(t('Μέλος προστέθηκε!', 'Member added!'))
    await loadTeamData(team.id, profile.id, team.created_by)
  }

  async function handleReject(memberId: string) {
    await supabase.from('team_members').delete().eq('id', memberId)
    showMsg(t('Αίτημα απορρίφθηκε', 'Request rejected'))
    await loadTeamData(team.id, profile.id, team.created_by)
  }

  // ── CAPTAIN: INVITE BY MEMBER_ID ──
  async function handleInvite() {
    if (!inviteMemberId.trim()) return
    setSaving(true)
    setInviteMsg('')

    // Find profile by member_id
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('member_id', inviteMemberId.trim())
      .maybeSingle()

    if (!targetProfile) {
      setInviteMsg(t('Δεν βρέθηκε μέλος με αυτό το ID', 'No member found with this ID'))
      setSaving(false)
      return
    }

    // Check if already in a team
    const { data: inTeam } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', targetProfile.id)
      .eq('status', 'accepted')
      .maybeSingle()

    if (inTeam) {
      setInviteMsg(t('Αυτό το μέλος είναι ήδη σε ομάδα', 'This member is already in a team'))
      setSaving(false)
      return
    }

    // Check already pending invite to this team
    const { data: existingInvite } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', team.id)
      .eq('user_id', targetProfile.id)
      .maybeSingle()

    if (existingInvite) {
      setInviteMsg(t('Έχει ήδη σταλεί πρόσκληση', 'Invite already sent'))
      setSaving(false)
      return
    }

    // Insert pending invite
    await supabase.from('team_members').insert({
      team_id: team.id,
      user_id: targetProfile.id,
      status: 'pending',
      invited_by: profile.id,
    })

    // Notify invited user
    await supabase.from('notifications').insert({
      user_id: targetProfile.id,
      type: 'team_invite',
      title_el: 'Πρόσκληση σε ομάδα',
      title_en: 'Team Invitation',
      message_el: `Σε προσκαλούν στην ομάδα "${team.name}"!`,
      message_en: `You've been invited to join "${team.name}"!`,
      metadata: { team_id: team.id },
    })

    setInviteMsg(t(`Πρόσκληση στάλθηκε στον ${targetProfile.full_name}!`, `Invite sent to ${targetProfile.full_name}!`))
    setInviteMemberId('')
    setSaving(false)
  }

  // ── CAPTAIN: REMOVE MEMBER ──
  async function handleRemoveMember(memberId: string, userId: string) {
    if (userId === profile.id) return // can't remove yourself
    await supabase.from('team_members').delete().eq('id', memberId)
    showMsg(t('Μέλος αφαιρέθηκε', 'Member removed'))
    await loadTeamData(team.id, profile.id, team.created_by)
  }

  // ── LEAVE TEAM ──
  async function handleLeave() {
    if (!confirm(t('Σίγουρα θέλεις να φύγεις από την ομάδα;', 'Are you sure you want to leave this team?'))) return
    await supabase.from('team_members')
      .delete()
      .eq('user_id', profile.id)
      .eq('team_id', team.id)
    setTeam(null)
    setMembers([])
    setView('main')
    await init()
  }

  // ── DELETE TEAM (captain) ──
  async function handleDeleteTeam() {
    if (!confirm(t('Σίγουρα θέλεις να διαγράψεις την ομάδα; Δεν μπορεί να αναιρεθεί.', 'Are you sure you want to delete this team? This cannot be undone.'))) return
    await supabase.from('team_members').delete().eq('team_id', team.id)
    await supabase.from('teams').delete().eq('id', team.id)
    setTeam(null)
    setMembers([])
    setPendingRequests([])
    setView('main')
    await init()
  }

  // ── AVATAR UPLOAD ──
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !team) return
    setAvatarUploading(true)
    const ext = file.name.split('.').pop()
    const path = `team-${team.id}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars').upload(path, file, { upsert: true })
    if (uploadError) { showMsg(t('Σφάλμα μεταφόρτωσης', 'Upload error'), 'error'); setAvatarUploading(false); return }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('teams').update({ avatar_url: urlData.publicUrl }).eq('id', team.id)
    setTeam((prev: any) => ({ ...prev, avatar_url: urlData.publicUrl }))
    setAvatarUploading(false)
    showMsg(t('Εικόνα ενημερώθηκε!', 'Avatar updated!'))
  }

  // ── STYLES ──
  const card: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: '12px', padding: '1.5rem',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '0.65rem 0.85rem',
    color: 'var(--text-primary)', fontSize: '0.9rem',
    fontFamily: 'Outfit, sans-serif', marginBottom: '0.75rem',
    outline: 'none', boxSizing: 'border-box',
  }
  const btnPrimary: React.CSSProperties = {
    width: '100%', background: 'var(--accent)', border: 'none',
    borderRadius: '8px', padding: '0.85rem', color: 'var(--bg)',
    fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem',
  }
  const btnSecondary: React.CSSProperties = {
    width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '0.85rem', color: 'var(--text-primary)',
    cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem',
  }
  const btnDanger: React.CSSProperties = {
    background: 'none', border: '1px solid #f77e7e',
    borderRadius: '8px', padding: '0.5rem 1rem', color: '#f77e7e',
    cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.8rem',
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

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={() => view !== 'main' ? setView('main') : router.back()} style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', fontSize: '1.2rem', padding: '0.25rem',
          }}>←</button>
          <h1 style={{
            fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem',
            letterSpacing: '0.05em', color: 'var(--text-primary)', margin: 0,
          }}>
            👥 {t('Η Ομάδα μου', 'My Team')}
          </h1>
        </div>

        {/* Global message */}
        {msg && (
          <div style={{
            background: msgType === 'error' ? 'rgba(247,126,126,0.12)' : 'rgba(var(--accent-rgb, 100,200,100),0.12)',
            border: `1px solid ${msgType === 'error' ? '#f77e7e' : 'var(--accent)'}`,
            borderRadius: '8px', padding: '0.75rem 1rem',
            color: msgType === 'error' ? '#f77e7e' : 'var(--accent)',
            fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center',
          }}>{msg}</div>
        )}

        {/* ── NO TEAM: MAIN ── */}
        {!team && view === 'main' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '0.5rem' }}>
              {t('Δεν είσαι μέλος ομάδας ακόμα', 'You are not in a team yet')}
            </p>
            <button onClick={() => setView('create')} style={btnPrimary}>
              🛡️ {t('Δημιουργία Ομάδας', 'Create Team')}
            </button>
            <button onClick={() => setView('join')} style={btnSecondary}>
              🔍 {t('Εύρεση & Αίτημα', 'Find & Request to Join')}
            </button>

            {/* Outgoing pending requests */}
            {myPendingRequests.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  {t('Εκκρεμή αιτήματά σου', 'Your pending requests')}
                </p>
                {myPendingRequests.map((req: any) => (
                  <div key={req.id} style={{
                    ...card, display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: '0.5rem', padding: '0.85rem 1rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {req.teams?.avatar_url ? (
                        <img src={req.teams.avatar_url} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🛡️</div>
                      )}
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{req.teams?.name}</span>
                    </div>
                    <button onClick={() => handleCancelRequest(req.id)} style={btnDanger}>
                      {t('Ακύρωση', 'Cancel')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CREATE TEAM ── */}
        {view === 'create' && (
          <div style={card}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {t('Δημιούργησε νέα ομάδα', 'Create a new team')}
            </p>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
              {t('Όνομα ομάδας *', 'Team name *')}
            </label>
            <input style={inputStyle} value={teamName} onChange={e => setTeamName(e.target.value)}
              placeholder={t('Όνομα...', 'Name...')} />
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
              {t('Περιγραφή', 'Description')}
            </label>
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              value={teamDesc} onChange={e => setTeamDesc(e.target.value)}
              placeholder={t('Προαιρετικά...', 'Optional...')} />
            <button onClick={handleCreate} disabled={saving || !teamName.trim()} style={{ ...btnPrimary, opacity: !teamName.trim() ? 0.6 : 1 }}>
              {saving ? '...' : t('Δημιουργία', 'Create')}
            </button>
          </div>
        )}

        {/* ── JOIN / SEARCH ── */}
        {view === 'join' && (
          <div style={card}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {t('Αναζήτηση ομάδας', 'Search for a team')}
            </p>
            <input style={inputStyle} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={t('Όνομα ομάδας...', 'Team name...')} />
            <button onClick={handleSearch} disabled={searching} style={{ ...btnPrimary, marginBottom: '1rem' }}>
              {searching ? t('Αναζήτηση...', 'Searching...') : t('Αναζήτηση', 'Search')}
            </button>
            {foundTeams.map((ft: any) => (
              <div key={ft.id} style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '1rem', marginBottom: '0.5rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {ft.avatar_url ? (
                    <img src={ft.avatar_url} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🛡️</div>
                  )}
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{ft.name}</p>
                    {ft.description && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>{ft.description}</p>}
                  </div>
                </div>
                <button onClick={() => handleJoinRequest(ft.id)} disabled={saving} style={{
                  background: 'var(--accent)', border: 'none', borderRadius: '6px',
                  padding: '0.4rem 0.85rem', color: 'var(--bg)',
                  fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif',
                }}>
                  {t('Αίτημα', 'Request')}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── IN TEAM: MAIN VIEW ── */}
        {team && view === 'main' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Team card */}
            <div style={{ ...card, textAlign: 'center' }}>
              {/* Avatar */}
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem' }}>
                {team.avatar_url ? (
                  <img src={team.avatar_url} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent)' }} />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg)', border: '3px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', margin: '0 auto' }}>🛡️</div>
                )}
                {isCaptin && (
                  <button onClick={() => fileInputRef.current?.click()} style={{
                    position: 'absolute', bottom: 0, right: 0,
                    background: 'var(--accent)', border: 'none', borderRadius: '50%',
                    width: 26, height: 26, cursor: 'pointer', fontSize: '0.7rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {avatarUploading ? '...' : '✏️'}
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
              </div>

              <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.8rem', color: 'var(--accent)', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>
                {team.name}
              </h2>
              {isCaptin && <span style={{ fontSize: '0.7rem', color: 'var(--accent)', background: 'rgba(var(--accent-rgb,100,200,100),0.12)', borderRadius: '99px', padding: '0.2rem 0.6rem' }}>👑 {t('Αρχηγός', 'Captain')}</span>}
              {team.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.75rem' }}>{team.description}</p>
              )}
              <button onClick={() => router.push(`/teams/${team.id}`)} style={{
                marginTop: '0.75rem', background: 'none', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '0.4rem 1rem', color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif',
              }}>
                {t('Δες τη σελίδα ομάδας', 'View team page')} →
              </button>
            </div>

            {/* Pending join requests (captain only) */}
            {isCaptin && pendingRequests.length > 0 && (
              <div style={card}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>
                  📬 {t('Αιτήματα Εισόδου', 'Join Requests')} ({pendingRequests.length})
                </p>
                {pendingRequests.map((req: any) => (
                  <div key={req.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.6rem 0', borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {req.profiles?.avatar_url ? (
                        <img src={req.profiles.avatar_url} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                      )}
                      <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{req.profiles?.full_name}</p>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>#{req.profiles?.member_id}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => handleAccept(req.id, req.user_id)} style={{
                        background: 'var(--accent)', border: 'none', borderRadius: '6px',
                        padding: '0.35rem 0.7rem', color: 'var(--bg)',
                        fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'Outfit, sans-serif',
                      }}>{t('✓', '✓')}</button>
                      <button onClick={() => handleReject(req.id)} style={{
                        ...btnDanger, padding: '0.35rem 0.7rem', width: 'auto',
                      }}>{t('✕', '✕')}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Members list */}
            <div style={card}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>
                👥 {t('Μέλη', 'Members')} ({members.length})
              </p>
              {members.map((m: any) => (
                <div key={m.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.6rem 0', borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                    onClick={() => router.push(`/profile/${m.profiles?.member_id}`)}>
                    {m.profiles?.avatar_url ? (
                      <img src={m.profiles.avatar_url} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                    )}
                    <div>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {m.profiles?.full_name}
                        {m.user_id === team.created_by && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: 'var(--accent)' }}>👑</span>}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>#{m.profiles?.member_id}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.profiles?.points ?? 0} pts</span>
                    {isCaptin && m.user_id !== profile.id && (
                      <button onClick={() => handleRemoveMember(m.id, m.user_id)} style={{ ...btnDanger, padding: '0.25rem 0.5rem', width: 'auto', fontSize: '0.72rem' }}>
                        {t('Αφαίρεση', 'Remove')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Captain actions */}
            {isCaptin && (
              <button onClick={() => setView('invite')} style={btnSecondary}>
                ✉️ {t('Πρόσκληση μέλους', 'Invite Member')}
              </button>
            )}

            {/* Leave / Delete */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              {!isCaptin && (
                <button onClick={handleLeave} style={{ ...btnDanger, width: '100%', textAlign: 'center' }}>
                  🚪 {t('Αποχώρηση από ομάδα', 'Leave Team')}
                </button>
              )}
              {isCaptin && (
                <button onClick={handleDeleteTeam} style={{ ...btnDanger, width: '100%', textAlign: 'center' }}>
                  🗑️ {t('Διαγραφή ομάδας', 'Delete Team')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── INVITE VIEW ── */}
        {view === 'invite' && (
          <div style={card}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {t('Πρόσκληση μέλους με Member ID', 'Invite member by Member ID')}
            </p>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
              {t('Member ID (5 ψηφία)', 'Member ID (5 digits)')}
            </label>
            <input style={inputStyle} value={inviteMemberId} onChange={e => setInviteMemberId(e.target.value)}
              placeholder="00123" maxLength={5} />
            {inviteMsg && (
              <p style={{ fontSize: '0.85rem', color: inviteMsg.includes('✓') || inviteMsg.includes('sent') || inviteMsg.includes('στάλθηκε') ? 'var(--accent)' : '#f77e7e', marginBottom: '0.5rem' }}>
                {inviteMsg}
              </p>
            )}
            <button onClick={handleInvite} disabled={saving || !inviteMemberId.trim()} style={{ ...btnPrimary, opacity: !inviteMemberId.trim() ? 0.6 : 1 }}>
              {saving ? '...' : t('Αποστολή Πρόσκλησης', 'Send Invite')}
            </button>
          </div>
        )}

      </div>
    </main>
  )
}
