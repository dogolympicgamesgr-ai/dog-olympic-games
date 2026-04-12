'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

export default function EventDetailPage() {
  const { t } = useLang()
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [event, setEvent] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [organizer, setOrganizer] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  // Registration
  const [userDogs, setUserDogs] = useState<any[]>([])
  const [registrations, setRegistrations] = useState<any[]>([])
  const [registeringCat, setRegisteringCat] = useState<string | null>(null)
  const [selectedDog, setSelectedDog] = useState<string>('')
  const [regLoading, setRegLoading] = useState(false)
  const [regMsg, setRegMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Assignments
  const [assignments, setAssignments] = useState<any[]>([])
  const [availableJudges, setAvailableJudges] = useState<any[]>([])
  const [availableDecoys, setAvailableDecoys] = useState<any[]>([])
  const [invitingRole, setInvitingRole] = useState<{ role: 'judge' | 'decoy', categoryId: string | null } | null>(null)
  const [selectedInviteUser, setSelectedInviteUser] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignMsg, setAssignMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (id) load(id as string)
  }, [id])

  async function load(eventId: string) {
    const [eventRes, sessionRes] = await Promise.all([
      supabase
        .from('events')
        .select(`*, event_categories(
          id, title_el, title_en, required_title,
          max_participants, is_championship,
          sports(name_el, name_en, is_foundation)
        )`)
        .eq('id', eventId)
        .single(),
      fetch('/auth/session').then(r => r.json())
    ])

    if (!eventRes.data) { router.push('/events'); return }

    setEvent(eventRes.data)
    setCategories(eventRes.data.event_categories || [])
    setSession(sessionRes)

    if (eventRes.data.created_by) {
      const { data: org } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, member_id')
        .eq('id', eventRes.data.created_by)
        .single()
      setOrganizer(org)
    }

    if (sessionRes?.user) {
      const [dogsRes, regsRes] = await Promise.all([
        supabase.from('dogs').select('id, name, dog_id')
          .eq('owner_id', sessionRes.user.id).eq('status', 'active'),
        supabase.from('event_registrations').select('id, category_id, dog_id, status')
          .eq('owner_id', sessionRes.user.id)
          .in('category_id', (eventRes.data.event_categories || []).map((c: any) => c.id))
      ])
      setUserDogs(dogsRes.data || [])
      setRegistrations(regsRes.data || [])
    }

    await loadAssignments(eventId, sessionRes)
    setLoading(false)
  }

  async function loadAssignments(eventId: string, sessionRes: any) {
    const isOrganizerOrAdmin = sessionRes?.isAdmin ||
      sessionRes?.roles?.includes('organizer') ||
      sessionRes?.user?.id === event?.created_by

    // Public sees accepted only — organizer/admin sees all
    let q = supabase
      .from('event_assignments')
      .select(`
        id, role, status, category_id,
        user_id,
        profiles!event_assignments_user_id_fkey(id, full_name, avatar_url, member_id)
      `)
      .eq('event_id', eventId)

    const { data } = await q
    setAssignments(data || [])

    // Load available judges/decoys for organizer invite panel
    if (sessionRes?.isAdmin || sessionRes?.roles?.includes('organizer')) {
      const [judgeRoles, decoyRoles] = await Promise.all([
        supabase.from('user_roles').select('user_id, profiles!user_roles_user_id_fkey(id, full_name, member_id)').eq('role', 'judge'),
        supabase.from('user_roles').select('user_id, profiles!user_roles_user_id_fkey(id, full_name, member_id)').eq('role', 'decoy'),
      ])
      setAvailableJudges(judgeRoles.data || [])
      setAvailableDecoys(decoyRoles.data || [])
    }
  }

  async function handleInvite() {
    if (!selectedInviteUser || !invitingRole || !session?.user) return
    setAssignLoading(true)
    setAssignMsg(null)

    const { error } = await supabase.from('event_assignments').insert({
      event_id: id,
      category_id: invitingRole.categoryId || null,
      user_id: selectedInviteUser,
      role: invitingRole.role,
      status: 'pending',
      assigned_by: session.user.id,
    })

    if (error) {
      setAssignMsg({ type: 'error', text: t('Σφάλμα. Ίσως έχει ήδη προσκληθεί.', 'Error. They may already be invited.') })
    } else {
      // Send notification to invited user
      const profile = (invitingRole.role === 'judge' ? availableJudges : availableDecoys)
        .find((u: any) => u.user_id === selectedInviteUser)
      const categoryLabel = invitingRole.categoryId
        ? categories.find(c => c.id === invitingRole.categoryId)?.title_el || ''
        : ''
      const eventTitle = event?.title_el || ''
      const roleLabel = invitingRole.role === 'judge' ? 'Κριτής' : 'Δόλωμα'
      const roleLabelEn = invitingRole.role === 'judge' ? 'Judge' : 'Decoy'

      await supabase.from('notifications').insert({
        user_id: selectedInviteUser,
        type: 'assignment_request',
        title_el: `Πρόσκληση ως ${roleLabel}`,
        title_en: `Invitation as ${roleLabelEn}`,
        message_el: `Έχεις προσκληθεί ως ${roleLabel}${categoryLabel ? ` για την κατηγορία "${categoryLabel}"` : ''} στον αγώνα "${eventTitle}".`,
        message_en: `You have been invited as ${roleLabelEn}${categoryLabel ? ` for category "${categoryLabel}"` : ''} in event "${eventTitle}".`,
        metadata: { event_id: id, role: invitingRole.role, category_id: invitingRole.categoryId },
      })

      setAssignMsg({ type: 'success', text: t('Πρόσκληση στάλθηκε!', 'Invitation sent!') })
      setInvitingRole(null)
      setSelectedInviteUser('')
      await loadAssignments(id as string, session)
    }
    setAssignLoading(false)
  }

  async function handleRemoveAssignment(assignmentId: string) {
    setAssignLoading(true)
    await supabase.from('event_assignments').delete().eq('id', assignmentId)
    await loadAssignments(id as string, session)
    setAssignLoading(false)
  }

  async function handleRespondAssignment(assignmentId: string, newStatus: 'accepted' | 'declined') {
    setAssignLoading(true)
    await supabase.from('event_assignments').update({ status: newStatus }).eq('id', assignmentId)
    await loadAssignments(id as string, session)
    setAssignLoading(false)
  }

  // ── helpers ──────────────────────────────────────────────
  function formatDate(iso: string) {
    if (!iso) return '—'
    const d = new Date(iso)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${mins}`
  }
  function isUpcoming(iso: string) { return iso && new Date(iso) > new Date() }
  function registrationOpen(ev: any) {
    if (!ev.registration_deadline) return isUpcoming(ev.event_date)
    return new Date() < new Date(ev.registration_deadline)
  }
  function getUserRegForCat(catId: string) { return registrations.find(r => r.category_id === catId) }

  const regStatusColor = (s: string) => {
    if (s === 'confirmed') return '#7ef7a0'
    if (s === 'rejected') return '#f77e7e'
    if (s === 'no_show') return '#f7a07e'
    return 'var(--accent)'
  }
  const regStatusLabel = (s: string) => {
    if (s === 'confirmed') return t('Επιβεβαιωμένη', 'Confirmed')
    if (s === 'rejected') return t('Απορρίφθηκε', 'Rejected')
    if (s === 'no_show') return t('Απών', 'No Show')
    return t('Σε αναμονή', 'Pending')
  }
  const assignStatusColor = (s: string) => {
    if (s === 'accepted') return '#7ef7a0'
    if (s === 'declined') return '#f77e7e'
    return 'var(--accent)'
  }
  const assignStatusLabel = (s: string) => {
    if (s === 'accepted') return t('Αποδέχθηκε', 'Accepted')
    if (s === 'declined') return t('Αρνήθηκε', 'Declined')
    return t('Σε αναμονή', 'Pending')
  }

  async function handleRegister(catId: string) {
    if (!selectedDog) return
    setRegLoading(true)
    setRegMsg(null)
    const { error } = await supabase.from('event_registrations').insert({
      category_id: catId, dog_id: selectedDog,
      owner_id: session.user.id, status: 'pending',
    })
    if (error) {
      setRegMsg({ type: 'error', text: t('Σφάλμα εγγραφής. Ίσως είστε ήδη εγγεγραμμένοι.', 'Registration error. You may already be registered.') })
    } else {
      setRegMsg({ type: 'success', text: t('Εγγραφή υποβλήθηκε!', 'Registration submitted!') })
      const { data } = await supabase.from('event_registrations').select('id, category_id, dog_id, status')
        .eq('owner_id', session.user.id).in('category_id', categories.map(c => c.id))
      setRegistrations(data || [])
      setRegisteringCat(null)
      setSelectedDog('')
    }
    setRegLoading(false)
  }

  async function handleCancelReg(regId: string) {
    setRegLoading(true)
    await supabase.from('event_registrations').delete().eq('id', regId)
    const { data } = await supabase.from('event_registrations').select('id, category_id, dog_id, status')
      .eq('owner_id', session.user.id).in('category_id', categories.map(c => c.id))
    setRegistrations(data || [])
    setRegLoading(false)
  }

  // ── guards ───────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )
  if (!event) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-secondary)' }}>{t('Ο αγώνας δεν βρέθηκε', 'Event not found')}</p>
    </div>
  )

  const title = t(event.title_el, event.title_en || event.title_el)
  const desc = t(event.description_el, event.description_en || event.description_el)
  const upcoming = isUpcoming(event.event_date)
  const regOpen = registrationOpen(event)
  const isLoggedIn = !!session?.user
  const isOrganizerOrAdmin = session?.isAdmin || session?.roles?.includes('organizer') || session?.user?.id === event.created_by
  const isMyEvent = session?.user?.id === event.created_by

  // Split assignments
  const decoyAssignments = assignments.filter(a => a.role === 'decoy')
  const judgeAssignments = assignments.filter(a => a.role === 'judge')

  // What the current user can see: accepted always, pending only if organizer/admin or it's their own
  const visibleDecoys = decoyAssignments.filter(a =>
    a.status === 'accepted' || isOrganizerOrAdmin || a.user_id === session?.user?.id
  )
  const visibleJudges = judgeAssignments.filter(a =>
    a.status === 'accepted' || isOrganizerOrAdmin || a.user_id === session?.user?.id
  )

  // My pending assignment requests (for accept/decline UI)
  const myPendingAssignments = assignments.filter(a =>
    a.user_id === session?.user?.id && a.status === 'pending'
  )

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '1.25rem',
    marginBottom: '1rem',
  }
  const sectionTitle: React.CSSProperties = {
    fontFamily: 'Bebas Neue, sans-serif',
    fontSize: '1rem',
    color: 'var(--accent)',
    margin: '0 0 1rem',
    letterSpacing: '0.04em',
  }

  return (
    <main style={{
      minHeight: '100vh', background: 'var(--bg)',
      paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem'
    }}>

      {/* Lightbox */}
      {lightboxOpen && event.banner_url && (
        <div onClick={() => setLightboxOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, cursor: 'zoom-out'
        }}>
          <img src={event.banner_url} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} />
        </div>
      )}

      {/* Banner */}
      {event.banner_url && (
        <div onClick={() => setLightboxOpen(true)} style={{
          width: '100%', height: '240px', overflow: 'hidden',
          cursor: 'zoom-in', position: 'relative',
        }}>
          <img src={event.banner_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, var(--bg) 100%)' }} />
        </div>
      )}

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1.5rem' }}>

        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          cursor: 'pointer', fontSize: '1.2rem',
          marginBottom: '1rem', marginTop: event.banner_url ? '-1rem' : '0',
          padding: 0, position: 'relative', zIndex: 1
        }}>←</button>

        {/* Status badges */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.7rem', borderRadius: '99px',
            background: upcoming ? 'rgba(212,175,55,0.15)' : 'var(--bg-card)',
            color: upcoming ? 'var(--accent)' : 'var(--text-secondary)',
            border: `1px solid ${upcoming ? 'var(--accent)' : 'var(--border)'}`,
          }}>
            {upcoming ? t('Επερχόμενος', 'Upcoming') : t('Ολοκληρώθηκε', 'Past')}
          </span>
          {event.team_event && (
            <span style={{
              fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.7rem', borderRadius: '99px',
              background: 'rgba(212,175,55,0.1)', color: 'var(--accent)', border: '1px solid var(--accent)',
            }}>
              🛡️ {t('Αγώνας Ομάδων', 'Team Event')}
            </span>
          )}
        </div>

        <h1 style={{
          fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.4rem',
          letterSpacing: '0.05em', color: 'var(--text-primary)', margin: '0 0 1.25rem'
        }}>
          🏆 {title}
        </h1>

        {/* Key info */}
        <div style={cardStyle}>
          {event.event_date && (
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.65rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>📅</span>
              <div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t('Ημερομηνία', 'Date')}</p>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{formatDate(event.event_date)}</p>
              </div>
            </div>
          )}
          {event.registration_deadline && (
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.65rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⏰</span>
              <div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t('Προθεσμία Εγγραφής', 'Registration Deadline')}</p>
                <p style={{ margin: 0, fontWeight: 600, color: regOpen ? 'var(--accent)' : '#f77e7e', fontSize: '0.95rem' }}>
                  {formatDate(event.registration_deadline)}{!regOpen && ` — ${t('Έληξε', 'Closed')}`}
                </p>
              </div>
            </div>
          )}
          {event.location && (
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.65rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>📍</span>
              <div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t('Χώρος', 'Venue')}</p>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{event.location}</p>
                {event.address && <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{event.address}</p>}
              </div>
            </div>
          )}
          {event.max_participants && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>👥</span>
              <div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t('Μέγιστοι Συμμετέχοντες', 'Max Participants')}</p>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{event.max_participants}</p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {desc && (
          <div style={cardStyle}>
            <p style={sectionTitle}>{t('Περιγραφή', 'Description')}</p>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{desc}</p>
          </div>
        )}

        {/* My pending assignment requests */}
        {myPendingAssignments.length > 0 && (
          <div style={{ ...cardStyle, border: '1px solid var(--accent)' }}>
            <p style={sectionTitle}>🔔 {t('Εκκρεμείς Προσκλήσεις', 'Pending Invitations')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {myPendingAssignments.map((a: any) => {
                const cat = a.category_id ? categories.find(c => c.id === a.category_id) : null
                return (
                  <div key={a.id} style={{
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: '10px', padding: '0.85rem 1rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'
                  }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {a.role === 'judge' ? '⚖️ ' : '🎯 '}
                        {a.role === 'judge' ? t('Κριτής', 'Judge') : t('Δόλωμα', 'Decoy')}
                        {cat && ` — ${t(cat.title_el, cat.title_en || cat.title_el)}`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleRespondAssignment(a.id, 'accepted')} disabled={assignLoading}
                        style={{
                          background: '#7ef7a033', border: '1px solid #7ef7a0',
                          borderRadius: '6px', padding: '0.3rem 0.75rem',
                          color: '#7ef7a0', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700
                        }}>
                        {t('Αποδοχή', 'Accept')}
                      </button>
                      <button onClick={() => handleRespondAssignment(a.id, 'declined')} disabled={assignLoading}
                        style={{
                          background: '#f77e7e33', border: '1px solid #f77e7e',
                          borderRadius: '6px', padding: '0.3rem 0.75rem',
                          color: '#f77e7e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif'
                        }}>
                        {t('Άρνηση', 'Decline')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Categories + Registration */}
        <div style={cardStyle}>
          <p style={sectionTitle}>{t('Κατηγορίες', 'Categories')}</p>
          {regMsg && (
            <div style={{
              background: regMsg.type === 'success' ? 'rgba(0,200,100,0.1)' : 'rgba(220,50,50,0.1)',
              border: `1px solid ${regMsg.type === 'success' ? 'rgba(0,200,100,0.3)' : 'rgba(220,50,50,0.3)'}`,
              borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem',
              color: regMsg.type === 'success' ? '#00c864' : '#dc3232', fontSize: '0.85rem', fontWeight: 600
            }}>
              {regMsg.text}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {categories.map((cat: any) => {
              const userReg = getUserRegForCat(cat.id)
              const isRegistering = registeringCat === cat.id
              const sportName = t(cat.sports?.name_el, cat.sports?.name_en || cat.sports?.name_el)
              const catJudges = visibleJudges.filter(a => a.category_id === cat.id)
              const isInvitingJudgeHere = invitingRole?.role === 'judge' && invitingRole?.categoryId === cat.id

              return (
                <div key={cat.id} style={{
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <p style={{ margin: '0 0 0.2rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {cat.is_championship && '🥇 '}
                        {t(cat.title_el, cat.title_en || cat.title_el)}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {sportName}
                        {cat.required_title && ` · ${t('Απαιτείται', 'Requires')}: ${cat.required_title}`}
                        {cat.max_participants && ` · ${t('Μέγ.', 'Max')}: ${cat.max_participants}`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {/* Organizer: invite judge button */}
                      {isOrganizerOrAdmin && (
                        <button onClick={() => {
                          setInvitingRole(isInvitingJudgeHere ? null : { role: 'judge', categoryId: cat.id })
                          setSelectedInviteUser('')
                          setAssignMsg(null)
                        }} style={{
                          background: isInvitingJudgeHere ? 'var(--bg-card)' : 'var(--bg)',
                          border: '1px solid var(--border)', borderRadius: '8px',
                          padding: '0.35rem 0.75rem', color: 'var(--text-secondary)',
                          cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem',
                        }}>
                          ⚖️ {t('+ Κριτής', '+ Judge')}
                        </button>
                      )}
                      {/* Registration button */}
                      {userReg ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '99px',
                            color: regStatusColor(userReg.status),
                            background: `${regStatusColor(userReg.status)}22`,
                            border: `1px solid ${regStatusColor(userReg.status)}`,
                          }}>
                            {regStatusLabel(userReg.status)}
                          </span>
                          {userReg.status === 'pending' && regOpen && (
                            <button onClick={() => handleCancelReg(userReg.id)} disabled={regLoading}
                              style={{
                                background: 'none', border: '1px solid #f77e7e', borderRadius: '6px',
                                padding: '0.2rem 0.5rem', color: '#f77e7e', cursor: 'pointer',
                                fontSize: '0.72rem', fontFamily: 'Outfit, sans-serif'
                              }}>
                              {t('Ακύρωση', 'Cancel')}
                            </button>
                          )}
                        </div>
                      ) : (
                        isLoggedIn && regOpen && upcoming && (
                          <button onClick={() => {
                            setRegisteringCat(isRegistering ? null : cat.id)
                            setSelectedDog(''); setRegMsg(null)
                          }} style={{
                            background: isRegistering ? 'var(--bg-card)' : 'var(--accent)',
                            border: 'none', borderRadius: '8px', padding: '0.4rem 0.9rem',
                            color: isRegistering ? 'var(--text-secondary)' : 'var(--bg)',
                            fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.8rem',
                          }}>
                            {isRegistering ? t('Άκυρο', 'Cancel') : t('Εγγραφή', 'Register')}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Judges for this category */}
                  {catJudges.length > 0 && (
                    <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border)' }}>
                      <p style={{ margin: '0 0 0.4rem', fontSize: '0.72rem', color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>
                        ⚖️ {t('Κριτές', 'Judges')}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {catJudges.map((a: any) => (
                          <div key={a.id} style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            background: 'var(--bg-card)', border: `1px solid ${assignStatusColor(a.status)}44`,
                            borderRadius: '99px', padding: '0.25rem 0.6rem 0.25rem 0.3rem',
                          }}>
                            {a.profiles?.avatar_url
                              ? <img src={a.profiles.avatar_url} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                              : <span style={{ fontSize: '0.8rem' }}>👤</span>
                            }
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                              {a.profiles?.full_name}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: assignStatusColor(a.status) }}>
                              {assignStatusLabel(a.status)}
                            </span>
                            {isOrganizerOrAdmin && (
                              <button onClick={() => handleRemoveAssignment(a.id)} disabled={assignLoading}
                                style={{
                                  background: 'none', border: 'none', color: '#f77e7e',
                                  cursor: 'pointer', fontSize: '0.7rem', padding: '0 0 0 0.2rem', lineHeight: 1
                                }}>✕</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invite judge inline form */}
                  {isInvitingJudgeHere && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                      {assignMsg && (
                        <p style={{ fontSize: '0.8rem', color: assignMsg.type === 'success' ? '#00c864' : '#dc3232', marginBottom: '0.5rem' }}>
                          {assignMsg.text}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <select value={selectedInviteUser} onChange={e => setSelectedInviteUser(e.target.value)}
                          style={{
                            flex: 1, minWidth: '160px', background: 'var(--bg-card)',
                            border: '1px solid var(--border)', borderRadius: '8px',
                            padding: '0.5rem 0.75rem', color: 'var(--text-primary)',
                            fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif', outline: 'none', cursor: 'pointer'
                          }}>
                          <option value="">{t('Επίλεξε κριτή...', 'Select judge...')}</option>
                          {availableJudges.map((j: any) => (
                            <option key={j.user_id} value={j.user_id}>
                              {j.profiles?.full_name} #{j.profiles?.member_id}
                            </option>
                          ))}
                        </select>
                        <button onClick={handleInvite} disabled={!selectedInviteUser || assignLoading}
                          style={{
                            background: 'var(--accent)', border: 'none', borderRadius: '8px',
                            padding: '0.5rem 1rem', color: 'var(--bg)', fontWeight: 700,
                            cursor: selectedInviteUser ? 'pointer' : 'not-allowed',
                            fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem',
                            opacity: selectedInviteUser ? 1 : 0.6
                          }}>
                          {assignLoading ? '...' : t('Αποστολή', 'Send')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Registration dog picker */}
                  {isRegistering && !userReg && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                      {userDogs.length === 0 ? (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {t('Δεν έχεις σκύλους στο προφίλ σου.', 'You have no dogs on your profile.')}
                        </p>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <select value={selectedDog} onChange={e => setSelectedDog(e.target.value)}
                            style={{
                              flex: 1, minWidth: '160px', background: 'var(--bg-card)',
                              border: '1px solid var(--border)', borderRadius: '8px',
                              padding: '0.55rem 0.75rem', color: 'var(--text-primary)',
                              fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif', outline: 'none', cursor: 'pointer'
                            }}>
                            <option value="">{t('Επίλεξε σκύλο...', 'Select dog...')}</option>
                            {userDogs.map(dog => (
                              <option key={dog.id} value={dog.id}>{dog.name} ({dog.dog_id})</option>
                            ))}
                          </select>
                          <button onClick={() => handleRegister(cat.id)} disabled={!selectedDog || regLoading}
                            style={{
                              background: 'var(--accent)', border: 'none', borderRadius: '8px',
                              padding: '0.55rem 1.1rem', color: 'var(--bg)', fontWeight: 700,
                              cursor: selectedDog ? 'pointer' : 'not-allowed',
                              fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem',
                              opacity: selectedDog ? 1 : 0.6
                            }}>
                            {regLoading ? '...' : t('Υποβολή', 'Submit')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {!isLoggedIn && upcoming && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.75rem', textAlign: 'center' }}>
              {t('Συνδέσου για να εγγραφείς σε κατηγορία', 'Log in to register for a category')}
            </p>
          )}
        </div>

        {/* Decoys section */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p style={{ ...sectionTitle, margin: 0 }}>🎯 {t('Δόλωμα', 'Decoys')}</p>
            {isOrganizerOrAdmin && (
              <button onClick={() => {
                setInvitingRole(invitingRole?.role === 'decoy' ? null : { role: 'decoy', categoryId: null })
                setSelectedInviteUser('')
                setAssignMsg(null)
              }} style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '0.35rem 0.75rem',
                color: 'var(--text-secondary)', cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem',
              }}>
                + {t('Πρόσκληση', 'Invite')}
              </button>
            )}
          </div>

          {/* Invite decoy form */}
          {invitingRole?.role === 'decoy' && (
            <div style={{ marginBottom: '1rem' }}>
              {assignMsg && (
                <p style={{ fontSize: '0.8rem', color: assignMsg.type === 'success' ? '#00c864' : '#dc3232', marginBottom: '0.5rem' }}>
                  {assignMsg.text}
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select value={selectedInviteUser} onChange={e => setSelectedInviteUser(e.target.value)}
                  style={{
                    flex: 1, minWidth: '160px', background: 'var(--bg-card)',
                    border: '1px solid var(--border)', borderRadius: '8px',
                    padding: '0.5rem 0.75rem', color: 'var(--text-primary)',
                    fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif', outline: 'none', cursor: 'pointer'
                  }}>
                  <option value="">{t('Επίλεξε δόλωμα...', 'Select decoy...')}</option>
                  {availableDecoys.map((d: any) => (
                    <option key={d.user_id} value={d.user_id}>
                      {d.profiles?.full_name} #{d.profiles?.member_id}
                    </option>
                  ))}
                </select>
                <button onClick={handleInvite} disabled={!selectedInviteUser || assignLoading}
                  style={{
                    background: 'var(--accent)', border: 'none', borderRadius: '8px',
                    padding: '0.5rem 1rem', color: 'var(--bg)', fontWeight: 700,
                    cursor: selectedInviteUser ? 'pointer' : 'not-allowed',
                    fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem',
                    opacity: selectedInviteUser ? 1 : 0.6
                  }}>
                  {assignLoading ? '...' : t('Αποστολή', 'Send')}
                </button>
              </div>
            </div>
          )}

          {visibleDecoys.length === 0 && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {t('Δεν έχει οριστεί δόλωμα ακόμα', 'No decoy assigned yet')}
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {visibleDecoys.map((a: any) => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg)', border: `1px solid ${assignStatusColor(a.status)}44`,
                borderRadius: '10px', padding: '0.65rem 1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
                  onClick={() => router.push(`/profile/${a.profiles?.member_id}`)}>
                  {a.profiles?.avatar_url
                    ? <img src={a.profiles.avatar_url} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                    : <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                  }
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{a.profiles?.full_name}</p>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>#{a.profiles?.member_id}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '99px',
                    color: assignStatusColor(a.status), background: `${assignStatusColor(a.status)}22`,
                    border: `1px solid ${assignStatusColor(a.status)}`,
                  }}>
                    {assignStatusLabel(a.status)}
                  </span>
                  {isOrganizerOrAdmin && (
                    <button onClick={() => handleRemoveAssignment(a.id)} disabled={assignLoading}
                      style={{
                        background: 'none', border: '1px solid #f77e7e44',
                        borderRadius: '6px', padding: '0.2rem 0.5rem',
                        color: '#f77e7e', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'Outfit, sans-serif'
                      }}>
                      {t('Αφαίρεση', 'Remove')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        {event.lat && event.lng && (
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem 0.5rem' }}>
              <p style={sectionTitle}>📍 {t('Τοποθεσία', 'Location')}</p>
            </div>
            <div style={{ height: '220px' }}>
              <MapView lat={event.lat} lng={event.lng} label={event.location} />
            </div>
          </div>
        )}

        {/* Contact */}
        {(event.contact_name || event.contact_phone || event.contact_email) && (
          <div style={cardStyle}>
            <p style={sectionTitle}>{t('Επικοινωνία', 'Contact')}</p>
            {event.contact_name && (
              <p style={{ margin: '0 0 0.35rem', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                👤 {event.contact_name}
              </p>
            )}
            {event.contact_phone && (
              <p style={{ margin: '0 0 0.35rem', fontSize: '0.88rem' }}>
                <a href={`tel:${event.contact_phone}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                  📞 {event.contact_phone}
                </a>
              </p>
            )}
            {event.contact_email && (
              <p style={{ margin: 0, fontSize: '0.88rem' }}>
                <a href={`mailto:${event.contact_email}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                  ✉️ {event.contact_email}
                </a>
              </p>
            )}
          </div>
        )}

        {/* Organizer */}
        {organizer && (
          <div onClick={() => router.push(`/profile/${organizer.member_id}`)}
            style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            {organizer.avatar_url
              ? <img src={organizer.avatar_url} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>👤</div>
            }
            <div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t('Διοργανωτής', 'Organizer')}</p>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>{organizer.full_name}</p>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>#{organizer.member_id}</p>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}