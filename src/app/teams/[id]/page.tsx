'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { use } from 'react'

export default function TeamProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()
  const { id: teamId } = use(params)

  const [team, setTeam] = useState<any>(null)
  const [captain, setCaptain] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userInTeam, setUserInTeam] = useState(false)
  const [userHasPending, setUserHasPending] = useState(false)
  const [userIsInThisTeam, setUserIsInThisTeam] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinMsg, setJoinMsg] = useState('')

  useEffect(() => { load() }, [teamId])

  async function load() {
    setLoading(true)

    // 1. Team
    const { data: teamData } = await supabase
      .from('teams').select('*').eq('id', teamId).single()
    if (!teamData) { setLoading(false); return }
    setTeam(teamData)

    // 2. Captain profile
    const { data: captainData } = await supabase
      .from('profiles').select('id, full_name, avatar_url, member_id')
      .eq('id', teamData.created_by).single()
    setCaptain(captainData)

    // 3. Accepted members with their profiles in one query
    const { data: memberRows } = await supabase
      .from('team_members')
      .select('id, user_id, profiles!team_members_user_id_fkey(id, full_name, avatar_url, member_id)')
      .eq('team_id', teamId)
      .eq('status', 'accepted')

    if (!memberRows || memberRows.length === 0) {
      setMembers([])
      setLoading(false)
      return
    }

    // 4. All dogs for all members in ONE query — no N+1
    const userIds = memberRows.map((m: any) => m.user_id)
    const { data: allDogs } = await supabase
      .from('dogs')
      .select('id, name, photo_url, owner_id, breed_id, breeds(name_el, name_en)')
      .in('owner_id', userIds)
      .eq('status', 'active')

    // Map dogs to their owner
    const dogsByOwner: Record<string, any[]> = {}
    for (const dog of allDogs || []) {
      if (!dogsByOwner[dog.owner_id]) dogsByOwner[dog.owner_id] = []
      dogsByOwner[dog.owner_id].push(dog)
    }

    const enriched = memberRows.map((m: any) => ({
      ...m,
      dogs: dogsByOwner[m.user_id] || [],
    }))

    setMembers(enriched)

    // 5. Current user session checks
    const res = await fetch('/auth/session')
    const { user } = await res.json()
    if (user) {
      setCurrentUserId(user.id)

      const [inThisTeam, inAnyTeam, pending] = await Promise.all([
        supabase.from('team_members').select('id')
          .eq('user_id', user.id).eq('team_id', teamId).eq('status', 'accepted').maybeSingle(),
        supabase.from('team_members').select('id')
          .eq('user_id', user.id).eq('status', 'accepted').maybeSingle(),
        supabase.from('team_members').select('id')
          .eq('user_id', user.id).eq('team_id', teamId).eq('status', 'pending').maybeSingle(),
      ])

      setUserIsInThisTeam(!!inThisTeam.data)
      setUserInTeam(!!inAnyTeam.data)
      setUserHasPending(!!pending.data)
    }

    setLoading(false)
  }

  async function handleJoinRequest() {
    if (!currentUserId) { router.push('/'); return }
    setJoining(true)
    const { error } = await supabase.from('team_members').insert({
      team_id: teamId, user_id: currentUserId,
      status: 'pending', invited_by: currentUserId,
    })
    if (error) {
      setJoinMsg(t('Σφάλμα αιτήματος', 'Error sending request'))
    } else {
      setUserHasPending(true)
      setJoinMsg(t('Το αίτημά σου στάλθηκε!', 'Request sent!'))
      if (captain?.id) {
        const { data: senderProfile } = await supabase
          .from('profiles').select('full_name').eq('id', currentUserId).single()
        await supabase.from('notifications').insert({
          user_id: captain.id,
          type: 'team_join_request',
          title_el: 'Νέο αίτημα εισόδου',
          title_en: 'New Join Request',
          message_el: `Ο/Η ${senderProfile?.full_name} ζητά να μπει στην ομάδα "${team?.name}".`,
          message_en: `${senderProfile?.full_name} wants to join "${team?.name}".`,
          metadata: { team_id: teamId, requester_id: currentUserId },
        })
      }
    }
    setJoining(false)
  }

  if (loading) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )

  if (!team) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-secondary)' }}>{t('Η ομάδα δεν βρέθηκε', 'Team not found')}</p>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1.5rem' }}>

        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          cursor: 'pointer', fontSize: '1.2rem', marginBottom: '1.5rem', padding: 0,
        }}>←</button>

        {/* Lightbox */}
        {lightboxSrc && (
          <div onClick={() => setLightboxSrc(null)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, cursor: 'zoom-out',
          }}>
            <img src={lightboxSrc} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} />
          </div>
        )}

        {/* Team hero */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem',
        }}>
          {team.avatar_url
            ? <img src={team.avatar_url} onClick={() => setLightboxSrc(team.avatar_url)}
                style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent)', marginBottom: '1rem', cursor: 'zoom-in' }} />
            : <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'var(--bg)', border: '3px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', margin: '0 auto 1rem' }}>🛡️</div>
          }

          <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.2rem', color: 'var(--accent)', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>
            {team.name}
          </h1>

          {team.description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 1rem' }}>
              {team.description}
            </p>
          )}

          {/* Member count only */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem', color: 'var(--text-primary)' }}>
              {members.length}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {t('Μέλη', 'Members')}
            </div>
          </div>

          {/* Captain */}
          {captain && (
            <div
              onClick={() => router.push(`/profile/${captain.member_id}`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg)', borderRadius: '99px', padding: '0.35rem 0.85rem', cursor: 'pointer' }}
            >
              {captain.avatar_url
                ? <img src={captain.avatar_url} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                : <span>👤</span>
              }
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                👑 {t('Αρχηγός', 'Captain')}: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{captain.full_name}</span>
              </span>
            </div>
          )}

          {/* Join logic */}
          {currentUserId && !userInTeam && !userHasPending && (
            <div style={{ marginTop: '1rem' }}>
              <button onClick={handleJoinRequest} disabled={joining} style={{
                background: 'var(--accent)', border: 'none', borderRadius: '10px',
                padding: '0.75rem 2rem', color: 'var(--bg)',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem',
              }}>
                {joining ? '...' : t('Αίτημα Συμμετοχής', 'Request to Join')}
              </button>
            </div>
          )}
          {userHasPending && !userIsInThisTeam && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--accent)' }}>
              ⏳ {t('Αίτημα σε αναμονή', 'Request pending')}
            </p>
          )}
          {userInTeam && !userIsInThisTeam && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {t('Είσαι ήδη σε άλλη ομάδα', 'You are already in another team')}
            </p>
          )}
          {joinMsg && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--accent)' }}>{joinMsg}</p>
          )}
        </div>

        {/* Members + their dogs */}
        {members.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {members.map((m: any) => {
              const profile = m.profiles as any
              return (
                <div key={m.user_id} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '1rem 1.25rem',
                }}>
                  {/* Member row */}
                  <div
                    onClick={() => router.push(`/profile/${profile?.member_id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: m.dogs.length ? '0.75rem' : 0 }}
                  >
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>👤</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {profile?.full_name}
                        {m.user_id === team.created_by && (
                          <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: 'var(--accent)' }}>👑</span>
                        )}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        #{profile?.member_id}
                      </p>
                    </div>
                  </div>

                  {/* Dogs */}
                  {m.dogs.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                      {m.dogs.map((dog: any) => (
                        <div
                          key={dog.id}
                          onClick={() => router.push(`/dogs/${dog.id}`)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: 'var(--bg)', borderRadius: '8px', padding: '0.35rem 0.65rem',
                            cursor: 'pointer', border: '1px solid var(--border)',
                            transition: 'border-color 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                        >
                          {dog.photo_url
                            ? <img
                                src={dog.photo_url}
                                onClick={e => { e.stopPropagation(); setLightboxSrc(dog.photo_url) }}
                                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', cursor: 'zoom-in', flexShrink: 0 }}
                              />
                            : <span style={{ fontSize: '1rem', flexShrink: 0 }}>🐕</span>
                          }
                          <div>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                              {dog.name}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                              {t(dog.breeds?.name_el, dog.breeds?.name_en)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {members.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
            {t('Δεν υπάρχουν μέλη ακόμα', 'No members yet')}
          </p>
        )}

      </div>
    </main>
  )
}
