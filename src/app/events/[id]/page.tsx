'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

const ENTRY_SPORT_ID = 'eed3995d-6e70-42c9-994d-4c684c7e9286'
const BASIC_SPORT_ID = '72b6e4ff-3ef5-4f85-bcba-9385ead2b37f'

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
  const [eligibilityMsg, setEligibilityMsg] = useState<string | null>(null)
  const [eligibilityLoading, setEligibilityLoading] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [regMsg, setRegMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Assignments
  const [assignments, setAssignments] = useState<any[]>([])
  const [availableJudges, setAvailableJudges] = useState<any[]>([])
  const [judgeQualifications, setJudgeQualifications] = useState<any[]>([])
  const [availableDecoys, setAvailableDecoys] = useState<any[]>([])
  const [invitingRole, setInvitingRole] = useState<{ role: 'judge' | 'decoy', categoryId: string | null } | null>(null)
  const [selectedInviteUser, setSelectedInviteUser] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignMsg, setAssignMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Participants list
  const [allRegistrations, setAllRegistrations] = useState<any[]>([])
  const [approvedResults, setApprovedResults] = useState<any[]>([])

  useEffect(() => { if (id) load(id as string) }, [id])

  async function load(eventId: string) {
    const [eventRes, sessionRes] = await Promise.all([
      supabase
        .from('events')
        .select(`*, event_categories(
          id, title_el, title_en, required_foundation, required_sport_level,
          max_participants, is_championship,
          sports(id, name_el, name_en, is_foundation)
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
        .from('profiles').select('full_name, avatar_url, member_id')
        .eq('id', eventRes.data.created_by).single()
      setOrganizer(org)
    }

    if (sessionRes?.user) {
      const [dogsRes, regsRes] = await Promise.all([
        supabase.from('dogs').select('id, name, dog_id')
          .eq('owner_id', sessionRes.user.id).eq('status', 'active'),
        supabase.from('event_registrations').select('id, category_id, dog_id, status, attendance_status')
          .eq('owner_id', sessionRes.user.id)
          .in('category_id', (eventRes.data.event_categories || []).map((c: any) => c.id))
      ])
      setUserDogs(dogsRes.data || [])
      setRegistrations(regsRes.data || [])

      const eventStatus = eventRes.data.status
      if (['approved', 'completed', 'results_approved'].includes(eventStatus)) {
        await loadAllRegistrations(eventId, eventRes.data.event_categories || [])
      }
    }

    await loadAssignments(eventId, sessionRes)
    setLoading(false)
  }

  async function loadAllRegistrations(eventId: string, cats: any[]) {
    const catIds = cats.map((c: any) => c.id)
    if (catIds.length === 0) return
    const { data } = await supabase
      .from('event_registrations')
      .select(`
        id, category_id, dog_id, owner_id, status, attendance_status,
        dogs!event_registrations_dog_id_fkey(id, name, dog_id),
        profiles!event_registrations_owner_id_fkey(id, full_name, member_id, no_show_count)
      `)
      .in('category_id', catIds)
      .eq('status', 'confirmed')
    setAllRegistrations(data || [])
  }

  async function loadAssignments(eventId: string, sessionRes: any) {
    const { data } = await supabase
      .from('event_assignments')
      .select(`
        id, role, status, category_id, user_id,
        profiles!event_assignments_user_id_fkey(id, full_name, avatar_url, member_id)
      `)
      .eq('event_id', eventId)
    setAssignments(data || [])

    if (sessionRes?.isAdmin || sessionRes?.roles?.includes('organizer')) {
      const [judgeRoles, decoyRoles] = await Promise.all([
        supabase.from('user_roles').select('user_id, profiles!user_roles_user_id_fkey(id, full_name, member_id)').eq('role', 'judge'),
        supabase.from('user_roles').select('user_id, profiles!user_roles_user_id_fkey(id, full_name, member_id)').eq('role', 'decoy'),
      ])
      setAvailableJudges(judgeRoles.data || [])
      setAvailableDecoys(decoyRoles.data || [])

      const judgeIds = (judgeRoles.data || []).map((j: any) => j.user_id)
      if (judgeIds.length > 0) {
        const { data: quals } = await supabase
          .from('judge_qualifications').select('*').in('judge_user_id', judgeIds)
        setJudgeQualifications(quals || [])
      }
    }
  }

  // ── Eligibility check on dog select ──
  async function handleDogSelect(dogId: string, catId: string) {
    setSelectedDog(dogId)
    setEligibilityMsg(null)
    if (!dogId) return

    const cat = categories.find(c => c.id === catId)
    if (!cat) return

    const sportId = cat.sports?.id
    const isFoundation = cat.sports?.is_foundation
    const isEntry = sportId === ENTRY_SPORT_ID
    const requiredSublevel = cat.required_sport_level ? parseInt(cat.required_sport_level) : 1

    setEligibilityLoading(true)

    if (isFoundation) {
      const { data: foundRank } = await supabase
        .from('foundation_ranking')
        .select('entry_title, basic_title')
        .eq('dog_id', dogId)
        .maybeSingle()

      if (isEntry && foundRank?.entry_title) {
        setEligibilityMsg(t(
          'Αυτός ο σκύλος έχει ήδη κερδίσει τον τίτλο Εισαγωγικού Επιπέδου και δεν μπορεί να ξαναδηλώσει σε αυτή την κατηγορία.',
          'This dog has already earned the Entry Level title and cannot register for this category again.'
        ))
        setSelectedDog('')
      } else if (!isEntry && foundRank?.basic_title) {
        setEligibilityMsg(t(
          'Αυτός ο σκύλος έχει ήδη κερδίσει τον τίτλο Βασικού Επιπέδου και δεν μπορεί να ξαναδηλώσει σε αυτή την κατηγορία.',
          'This dog has already earned the Basic Level title and cannot register for this category again.'
        ))
        setSelectedDog('')
      }
    } else {
      const { data: sportRank } = await supabase
        .from('dog_sport_ranking')
        .select('current_sublevel, title')
        .eq('dog_id', dogId)
        .eq('sport_id', sportId)
        .maybeSingle()

      if (sportRank?.title) {
        setEligibilityMsg(t(
          `Αυτός ο σκύλος έχει ολοκληρώσει και τα 3 επίπεδα στο ${cat.sports?.name_el} και δεν μπορεί να ξαναδηλώσει.`,
          `This dog has completed all 3 sublevels in ${cat.sports?.name_en} and cannot register again.`
        ))
        setSelectedDog('')
      } else if (sportRank && sportRank.current_sublevel > requiredSublevel) {
        setEligibilityMsg(t(
          `Αυτός ο σκύλος βρίσκεται σε επίπεδο ${sportRank.current_sublevel} και δεν μπορεί να κατεβεί σε χαμηλότερο επίπεδο.`,
          `This dog is at sublevel ${sportRank.current_sublevel} and cannot compete at a lower sublevel.`
        ))
        setSelectedDog('')
      }
    }

    setEligibilityLoading(false)
  }

  function getQualifiedJudges(categoryId: string | null) {
    if (!categoryId) return availableJudges
    const cat = categories.find(c => c.id === categoryId)
    if (!cat) return availableJudges
    const sportId = cat.sports?.id
    const isFoundation = cat.sports?.is_foundation
    const requiredSublevel = cat.required_sport_level ? parseInt(cat.required_sport_level) : null
    return availableJudges.filter(judge => {
      const qual = judgeQualifications.find(q => q.judge_user_id === judge.user_id && q.sport_id === sportId)
      if (!qual) return false
      if (isFoundation) return true
      if (requiredSublevel === null) return true
      return qual.max_sublevel >= requiredSublevel
    })
  }

  async function handleInvite() {
    if (!selectedInviteUser || !invitingRole || !session?.user) return
    setAssignLoading(true)
    setAssignMsg(null)
    const { error } = await supabase.from('event_assignments').insert({
      event_id: id, category_id: invitingRole.categoryId || null,
      user_id: selectedInviteUser, role: invitingRole.role,
      status: 'pending', assigned_by: session.user.id,
    })
    if (error) {
      setAssignMsg({ type: 'error', text: t('Σφάλμα. Ίσως έχει ήδη προσκληθεί.', 'Error. They may already be invited.') })
    } else {
      const categoryLabel = invitingRole.categoryId
        ? categories.find(c => c.id === invitingRole.categoryId)?.title_el || '' : ''
      const eventTitle = event?.title_el || ''
      const roleLabel = invitingRole.role === 'judge' ? 'Κριτής' : 'Δόλωμα'
      const roleLabelEn = invitingRole.role === 'judge' ? 'Judge' : 'Decoy'
      await supabase.from('notifications').insert({
        user_id: selectedInviteUser, type: 'assignment_request',
        title_el: `Πρόσκληση ως ${roleLabel}`, title_en: `Invitation as ${roleLabelEn}`,
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
    const assignment = assignments.find(a => a.id === assignmentId)
    if (assignment && event?.created_by) {
      const responderName = session?.profile?.full_name || 'Someone'
      const roleLabel = assignment.role === 'judge' ? 'Κριτής' : 'Δόλωμα'
      const roleLabelEn = assignment.role === 'judge' ? 'Judge' : 'Decoy'
      const statusEl = newStatus === 'accepted' ? 'αποδέχθηκε' : 'αρνήθηκε'
      const statusEn = newStatus === 'accepted' ? 'accepted' : 'declined'
      await supabase.from('notifications').insert({
        user_id: event.created_by, type: 'assignment_response',
        title_el: `${roleLabel} ${statusEl} την πρόσκληση`,
        title_en: `${roleLabelEn} ${statusEn} the invitation`,
        message_el: `${responderName} ${statusEl} την πρόσκληση ως ${roleLabel} για τον αγώνα "${event.title_el}".`,
        message_en: `${responderName} ${statusEn} the invitation as ${roleLabelEn} for event "${event.title_el}".`,
        metadata: { event_id: id, role: assignment.role },
      })
    }
    await loadAssignments(id as string, session)
    setAssignLoading(false)
  }

  async function handleRegister(catId: string) {
    if (!selectedDog || eligibilityMsg) return
    setRegLoading(true)
    setRegMsg(null)
    const { error } = await supabase.from('event_registrations').insert({
      category_id: catId, dog_id: selectedDog,
      owner_id: session.user.id, status: 'confirmed',
    })
    if (error) {
      setRegMsg({ type: 'error', text: t('Σφάλμα εγγραφής. Ίσως είστε ήδη εγγεγραμμένοι.', 'Registration error. You may already be registered.') })
    } else {
      setRegMsg({ type: 'success', text: t('Εγγραφή ολοκληρώθηκε!', 'Registration confirmed!') })
      const { data } = await supabase.from('event_registrations')
        .select('id, category_id, dog_id, status, attendance_status')
        .eq('owner_id', session.user.id).in('category_id', categories.map(c => c.id))
      setRegistrations(data || [])
      setRegisteringCat(null)
      setSelectedDog('')
      setEligibilityMsg(null)
    }
    setRegLoading(false)
  }

  async function handleCancelReg(regId: string) {
    setRegLoading(true)
    await supabase.from('event_registrations').delete().eq('id', regId)
    const { data } = await supabase.from('event_registrations')
      .select('id, category_id, dog_id, status, attendance_status')
      .eq('owner_id', session.user.id).in('category_id', categories.map(c => c.id))
    setRegistrations(data || [])
    setRegLoading(false)
  }

  function formatDate(iso: string) {
    if (!iso) return '—'
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  function isUpcoming(iso: string) { return iso && new Date(iso) > new Date() }
  function registrationOpen(ev: any) {
    if (!ev.registration_deadline) return isUpcoming(ev.event_date)
    return new Date() < new Date(ev.registration_deadline)
  }
  function getUserRegForCat(catId: string) { return registrations.find(r => r.category_id === catId) }

  const assignStatusColor = (s: string) => s === 'accepted' ? '#7ef7a0' : s === 'declined' ? '#f77e7e' : 'var(--accent)'
  const assignStatusLabel = (s: string) =>
    s === 'accepted' ? t('Αποδέχθηκε', 'Accepted') :
    s === 'declined' ? t('Αρνήθηκε', 'Declined') : t('Σε αναμονή', 'Pending')

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
  const isCompleted = event.status === 'completed' || event.status === 'results_approved'
  const isLocked = event.status === 'results_approved'
  const canManageAttendance = (isMyEvent || session?.isAdmin) && event.status === 'approved'
  const canManageAssignments = isOrganizerOrAdmin && !isLocked
  const myJudgeAssignments = assignments.filter(a => a.user_id === session?.user?.id && a.role === 'judge' && a.status === 'accepted')
  const isAssignedJudge = myJudgeAssignments.length > 0 && isCompleted
  const canReviewResults = session?.isAdmin && isCompleted
  const decoyAssignments = assignments.filter(a => a.role === 'decoy')
  const judgeAssignments = assignments.filter(a => a.role === 'judge')
  const visibleDecoys = decoyAssignments.filter(a => a.status === 'accepted' || isOrganizerOrAdmin || a.user_id === session?.user?.id)
  const visibleJudges = judgeAssignments.filter(a => a.status === 'accepted' || isOrganizerOrAdmin || a.user_id === session?.user?.id)
  const myPendingAssignments = assignments.filter(a => a.user_id === session?.user?.id && a.status === 'pending')

  const cardStyle: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' }
  const sectionTitle: React.CSSProperties = { fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: 'var(--accent)', margin: '0 0 1rem', letterSpacing: '0.04em' }
  const actionBtnStyle: React.CSSProperties = { flex: 1, border: 'none', borderRadius: '10px', padding: '0.85rem 1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', letterSpacing: '0.04em', textAlign: 'center' }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      {/* Lightbox */}
      {lightboxOpen && event.banner_url && (
        <div onClick={() => setLightboxOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'zoom-out' }}>
          <img src={event.banner_url} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} />
        </div>
      )}

      {/* Banner */}
      {event.banner_url && (
        <div onClick={() => setLightboxOpen(true)} style={{ width: '100%', height: '240px', overflow: 'hidden', cursor: 'zoom-in', position: 'relative' }}>
          <img src={event.banner_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, var(--bg) 100%)' }} />
        </div>
      )}

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', marginBottom: '1rem', marginTop: event.banner_url ? '-1rem' : '0', padding: 0, position: 'relative', zIndex: 1 }}>←</button>

        {/* Status badge */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.7rem', borderRadius: '99px', background: isLocked ? 'rgba(212,175,55,0.15)' : isCompleted ? 'rgba(120,120,255,0.15)' : upcoming ? 'rgba(212,175,55,0.15)' : 'var(--bg-card)', color: isLocked ? 'var(--accent)' : isCompleted ? '#a0a0ff' : upcoming ? 'var(--accent)' : 'var(--text-secondary)', border: `1px solid ${isLocked ? 'var(--accent)' : isCompleted ? '#a0a0ff' : upcoming ? 'var(--accent)' : 'var(--border)'}` }}>
            {isLocked ? t('🔒 Αποτελέσματα Εγκρίθηκαν', '🔒 Results Approved') : isCompleted ? t('✅ Ολοκληρώθηκε', '✅ Completed') : upcoming ? t('Επερχόμενος', 'Upcoming') : t('Παρελθόν', 'Past')}
          </span>
        </div>

        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.4rem', letterSpacing: '0.05em', color: 'var(--text-primary)', margin: '0 0 1.25rem' }}>
          🏆 {title}
        </h1>

        {/* Action buttons */}
        {(canManageAttendance || isAssignedJudge || canReviewResults) && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {canManageAttendance && (
              <button onClick={() => router.push(`/events/${id}/attendance`)} style={{ ...actionBtnStyle, background: 'var(--accent)', color: 'var(--bg)' }}>
                📋 {t('Παρουσίες & Κλείσιμο', 'Attendance & Close')}
              </button>
            )}
            {isAssignedJudge && (
              <button onClick={() => router.push(`/events/${id}/score`)} style={{ ...actionBtnStyle, background: 'rgba(212,175,55,0.15)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                ⚖️ {t('Βαθμολόγηση', 'Score Event')}
              </button>
            )}
            {canReviewResults && (
              <button onClick={() => router.push(`/events/${id}/results`)} style={{ ...actionBtnStyle, background: 'rgba(120,120,255,0.15)', color: '#a0a0ff', border: '1px solid #a0a0ff' }}>
                ✅ {t('Αποτελέσματα', 'Review Results')}
              </button>
            )}
          </div>
        )}

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

        {/* My pending invitations */}
        {myPendingAssignments.length > 0 && (
          <div style={{ ...cardStyle, border: '1px solid var(--accent)' }}>
            <p style={sectionTitle}>🔔 {t('Εκκρεμείς Προσκλήσεις', 'Pending Invitations')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {myPendingAssignments.map((a: any) => {
                const cat = a.category_id ? categories.find(c => c.id === a.category_id) : null
                return (
                  <div key={a.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {a.role === 'judge' ? '⚖️ ' : '🎯 '}
                      {a.role === 'judge' ? t('Κριτής', 'Judge') : t('Δόλωμα', 'Decoy')}
                      {cat && ` — ${t(cat.title_el, cat.title_en || cat.title_el)}`}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleRespondAssignment(a.id, 'accepted')} disabled={assignLoading} style={{ background: '#7ef7a033', border: '1px solid #7ef7a0', borderRadius: '6px', padding: '0.3rem 0.75rem', color: '#7ef7a0', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
                        {t('Αποδοχή', 'Accept')}
                      </button>
                      <button onClick={() => handleRespondAssignment(a.id, 'declined')} disabled={assignLoading} style={{ background: '#f77e7e33', border: '1px solid #f77e7e', borderRadius: '6px', padding: '0.3rem 0.75rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>
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
            <div style={{ background: regMsg.type === 'success' ? 'rgba(0,200,100,0.1)' : 'rgba(220,50,50,0.1)', border: `1px solid ${regMsg.type === 'success' ? 'rgba(0,200,100,0.3)' : 'rgba(220,50,50,0.3)'}`, borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', color: regMsg.type === 'success' ? '#00c864' : '#dc3232', fontSize: '0.85rem', fontWeight: 600 }}>
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
              const qualifiedJudges = isInvitingJudgeHere ? getQualifiedJudges(cat.id) : []
              const alreadyInvitedIds = new Set(judgeAssignments.filter(a => a.category_id === cat.id).map(a => a.user_id))

              return (
                <div key={cat.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <p style={{ margin: '0 0 0.2rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {cat.is_championship && '🥇 '}
                        {t(cat.title_el, cat.title_en || cat.title_el)}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {sportName}
                        {cat.required_foundation && ` · ${t('Απαιτείται', 'Requires')}: ${cat.required_foundation === 'entry' ? t('Εισαγωγικό Επίπεδο', 'Entry Level') : t('Βασικό Επίπεδο', 'Basic Level')}${cat.required_sport_level ? ` ${cat.required_sport_level}` : ''}`}
                        {cat.max_participants && ` · ${t('Μέγ.', 'Max')}: ${cat.max_participants}`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {canManageAssignments && (
                        <button
                          onClick={() => { setInvitingRole(isInvitingJudgeHere ? null : { role: 'judge', categoryId: cat.id }); setSelectedInviteUser(''); setAssignMsg(null) }}
                          style={{ background: isInvitingJudgeHere ? 'var(--bg-card)' : 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.35rem 0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem' }}
                        >
                          ⚖️ {t('+ Κριτής', '+ Judge')}
                        </button>
                      )}
                      {userReg ? (
                        <div style={{ width: '100%' }}>
                          {(() => {
                            const dogName = userDogs.find(d => d.id === userReg.dog_id)?.name || '—'
                            const catTitle = t(cat.title_el, cat.title_en || cat.title_el)
                            const canCancel = userReg.status === 'confirmed' && !['completed','cancelled','results_approved'].includes(event.status) && new Date(event.event_date) > new Date()
                            return (
                              <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '10px', padding: '0.6rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                  🐕 {t(`Έχεις δηλώσει συμμετοχή με τον/την ${dogName} στην κατηγορία ${catTitle}`, `You registered ${dogName} for ${catTitle}`)}
                                </p>
                                {canCancel && (
                                  <button onClick={() => handleCancelReg(userReg.id)} disabled={regLoading} style={{ background: 'none', border: '1px solid #f77e7e', borderRadius: '6px', padding: '0.3rem 0.65rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Outfit, sans-serif', whiteSpace: 'nowrap' }}>
                                    {t('Ακύρωση Συμμετοχής', 'Cancel Registration')}
                                  </button>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      ) : (
                        isLoggedIn && regOpen && upcoming && !isLocked && (
                          <button
                            onClick={() => { setRegisteringCat(isRegistering ? null : cat.id); setSelectedDog(''); setEligibilityMsg(null); setRegMsg(null) }}
                            style={{ background: isRegistering ? 'var(--bg-card)' : 'var(--accent)', border: 'none', borderRadius: '8px', padding: '0.4rem 0.9rem', color: isRegistering ? 'var(--text-secondary)' : 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.8rem' }}
                          >
                            {isRegistering ? t('Άκυρο', 'Cancel') : t('Εγγραφή', 'Register')}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Judges */}
                  {catJudges.length > 0 && (
                    <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border)' }}>
                      <p style={{ margin: '0 0 0.4rem', fontSize: '0.72rem', color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>⚖️ {t('Κριτές', 'Judges')}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {catJudges.map((a: any) => (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-card)', border: `1px solid ${assignStatusColor(a.status)}44`, borderRadius: '99px', padding: '0.25rem 0.6rem 0.25rem 0.3rem' }}>
                            {a.profiles?.avatar_url ? <img src={a.profiles.avatar_url} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} /> : <span style={{ fontSize: '0.8rem' }}>👤</span>}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>{a.profiles?.full_name}</span>
                            {canManageAssignments && (
                              <>
                                <span style={{ fontSize: '0.65rem', color: assignStatusColor(a.status) }}>{assignStatusLabel(a.status)}</span>
                                <button onClick={() => handleRemoveAssignment(a.id)} disabled={assignLoading} style={{ background: 'none', border: 'none', color: '#f77e7e', cursor: 'pointer', fontSize: '0.7rem', padding: '0 0 0 0.2rem', lineHeight: 1 }}>✕</button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invite judge */}
                  {isInvitingJudgeHere && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                      {assignMsg && <p style={{ fontSize: '0.8rem', color: assignMsg.type === 'success' ? '#00c864' : '#dc3232', marginBottom: '0.5rem' }}>{assignMsg.text}</p>}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <select value={selectedInviteUser} onChange={e => setSelectedInviteUser(e.target.value)} style={{ flex: 1, minWidth: '160px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif', outline: 'none', cursor: 'pointer' }}>
                          <option value="">
                            {qualifiedJudges.length === 0 ? t('Κανένας κριτής δεν είναι κατάλληλος', 'No qualified judges available') : t('Επίλεξε κριτή...', 'Select judge...')}
                          </option>
                          {qualifiedJudges.filter(j => !alreadyInvitedIds.has(j.user_id)).map((j: any) => (
                            <option key={j.user_id} value={j.user_id}>{j.profiles?.full_name} #{j.profiles?.member_id}</option>
                          ))}
                        </select>
                        <button onClick={handleInvite} disabled={!selectedInviteUser || assignLoading || qualifiedJudges.length === 0} style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', color: 'var(--bg)', fontWeight: 700, cursor: selectedInviteUser ? 'pointer' : 'not-allowed', fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem', opacity: selectedInviteUser ? 1 : 0.6 }}>
                          {assignLoading ? '...' : t('Αποστολή', 'Send')}
                        </button>
                      </div>
                      {qualifiedJudges.length === 0 && (
                        <p style={{ fontSize: '0.75rem', color: '#f7c97e', marginTop: '0.4rem' }}>
                          {t('Δεν υπάρχουν κριτές με τα απαραίτητα προσόντα για αυτή την κατηγορία.', 'No judges have the required qualifications for this category.')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Registration picker */}
                  {isRegistering && !userReg && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                      {userDogs.length === 0 ? (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t('Δεν έχεις σκύλους στο προφίλ σου.', 'You have no dogs on your profile.')}</p>
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <select
                              value={selectedDog}
                              onChange={e => handleDogSelect(e.target.value, cat.id)}
                              style={{ flex: 1, minWidth: '160px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.55rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif', outline: 'none', cursor: 'pointer' }}
                            >
                              <option value="">{t('Επίλεξε σκύλο...', 'Select dog...')}</option>
                              {userDogs.map(dog => <option key={dog.id} value={dog.id}>{dog.name} ({dog.dog_id})</option>)}
                            </select>
                            <button
                              onClick={() => handleRegister(cat.id)}
                              disabled={!selectedDog || regLoading || eligibilityLoading || !!eligibilityMsg}
                              style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '0.55rem 1.1rem', color: 'var(--bg)', fontWeight: 700, cursor: (selectedDog && !eligibilityMsg) ? 'pointer' : 'not-allowed', fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem', opacity: (selectedDog && !eligibilityMsg) ? 1 : 0.6 }}
                            >
                              {eligibilityLoading ? '...' : regLoading ? '...' : t('Υποβολή', 'Submit')}
                            </button>
                          </div>
                          {/* Eligibility warning */}
                          {eligibilityMsg && (
                            <div style={{ marginTop: '0.5rem', background: 'rgba(247,126,126,0.1)', border: '1px solid #f77e7e44', borderRadius: '8px', padding: '0.6rem 0.85rem' }}>
                              <p style={{ margin: 0, fontSize: '0.8rem', color: '#f77e7e', fontWeight: 600 }}>
                                ⚠️ {eligibilityMsg}
                              </p>
                            </div>
                          )}
                        </>
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

        {/* Decoys */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p style={{ ...sectionTitle, margin: 0 }}>🎯 {t('Δόλωμα', 'Decoys')}</p>
            {canManageAssignments && (
              <button onClick={() => { setInvitingRole(invitingRole?.role === 'decoy' ? null : { role: 'decoy', categoryId: null }); setSelectedInviteUser(''); setAssignMsg(null) }} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.35rem 0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem' }}>
                + {t('Πρόσκληση', 'Invite')}
              </button>
            )}
          </div>
          {invitingRole?.role === 'decoy' && (
            <div style={{ marginBottom: '1rem' }}>
              {assignMsg && <p style={{ fontSize: '0.8rem', color: assignMsg.type === 'success' ? '#00c864' : '#dc3232', marginBottom: '0.5rem' }}>{assignMsg.text}</p>}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select value={selectedInviteUser} onChange={e => setSelectedInviteUser(e.target.value)} style={{ flex: 1, minWidth: '160px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif', outline: 'none', cursor: 'pointer' }}>
                  <option value="">{t('Επίλεξε δόλωμα...', 'Select decoy...')}</option>
                  {availableDecoys.map((d: any) => <option key={d.user_id} value={d.user_id}>{d.profiles?.full_name} #{d.profiles?.member_id}</option>)}
                </select>
                <button onClick={handleInvite} disabled={!selectedInviteUser || assignLoading} style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', color: 'var(--bg)', fontWeight: 700, cursor: selectedInviteUser ? 'pointer' : 'not-allowed', fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem', opacity: selectedInviteUser ? 1 : 0.6 }}>
                  {assignLoading ? '...' : t('Αποστολή', 'Send')}
                </button>
              </div>
            </div>
          )}
          {visibleDecoys.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('Δεν έχει οριστεί δόλωμα ακόμα', 'No decoy assigned yet')}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {visibleDecoys.map((a: any) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', border: `1px solid ${assignStatusColor(a.status)}44`, borderRadius: '10px', padding: '0.65rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }} onClick={() => router.push(`/profile/${a.profiles?.member_id}`)}>
                  {a.profiles?.avatar_url ? <img src={a.profiles.avatar_url} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>}
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{a.profiles?.full_name}</p>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>#{a.profiles?.member_id}</p>
                  </div>
                </div>
                {canManageAssignments && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '99px', color: assignStatusColor(a.status), background: `${assignStatusColor(a.status)}22`, border: `1px solid ${assignStatusColor(a.status)}` }}>
                      {assignStatusLabel(a.status)}
                    </span>
                    <button onClick={() => handleRemoveAssignment(a.id)} disabled={assignLoading} style={{ background: 'none', border: '1px solid #f77e7e44', borderRadius: '6px', padding: '0.2rem 0.5rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'Outfit, sans-serif' }}>
                      {t('Αφαίρεση', 'Remove')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Participants */}
        {isLoggedIn && ['approved','completed','results_approved'].includes(event.status) && (
          <div style={cardStyle}>
            <p style={sectionTitle}>👥 {t('Συμμετέχοντες', 'Participants')}</p>
            {allRegistrations.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('Δεν υπάρχουν εγγεγραμμένοι συμμετέχοντες ακόμα', 'No registered participants yet')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {categories.map(cat => {
                  const catRegs = allRegistrations.filter(r => r.category_id === cat.id)
                  if (catRegs.length === 0) return null
                  return (
                    <div key={cat.id}>
                      <p style={{ fontSize: '0.72rem', color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.04em', margin: '0 0 0.5rem' }}>
                        {t(cat.title_el, cat.title_en || cat.title_el)} · {t(cat.sports?.name_el, cat.sports?.name_en || cat.sports?.name_el)}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {catRegs.map((r: any) => {
                          const result = approvedResults.find(res => res.dog_id === r.dog_id && res.category_id === cat.id)
                          return (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', borderRadius: '8px', padding: '0.5rem 0.75rem', border: `1px solid ${r.attendance_status === 'no_show' ? '#f77e7e22' : result?.passed ? '#7ef7a022' : result && !result.passed ? '#f77e7e22' : 'var(--border)'}`, flexWrap: 'wrap', gap: '0.4rem' }}>
                              <div>
                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  {r.profiles?.full_name}
                                  <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '0.72rem' }}>(#{r.profiles?.member_id})</span>
                                  {isOrganizerOrAdmin && r.profiles?.no_show_count > 0 && (
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '99px', background: 'rgba(247,126,126,0.15)', border: '1px solid #f77e7e44', color: '#f77e7e' }}>
                                      ⚠️ {r.profiles.no_show_count} {t('απουσίες', 'no-shows')}
                                    </span>
                                  )}
                                </p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>🐕 {r.dogs?.name} · {r.dogs?.dog_id}</p>
                              </div>
                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                {event.status === 'completed' && (
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '99px', color: r.attendance_status === 'attended' ? '#7ef7a0' : '#f77e7e', background: r.attendance_status === 'attended' ? '#7ef7a022' : '#f77e7e22', border: `1px solid ${r.attendance_status === 'attended' ? '#7ef7a044' : '#f77e7e44'}` }}>
                                    {r.attendance_status === 'attended' ? t('Παρών', 'Present') : t('Απών', 'Absent')}
                                  </span>
                                )}
                                {result && (
                                  <>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '99px', color: result.passed ? '#7ef7a0' : '#f77e7e', background: result.passed ? '#7ef7a022' : '#f77e7e22', border: `1px solid ${result.passed ? '#7ef7a044' : '#f77e7e44'}` }}>
                                      {result.passed ? t('Επιτυχία', 'Pass') : t('Αποτυχία', 'Fail')}
                                    </span>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '99px', color: 'var(--accent)', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)' }}>
                                      {result.score} pts
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

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
            {event.contact_name && <p style={{ margin: '0 0 0.35rem', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>👤 {event.contact_name}</p>}
            {event.contact_phone && <p style={{ margin: '0 0 0.35rem', fontSize: '0.88rem' }}><a href={`tel:${event.contact_phone}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>📞 {event.contact_phone}</a></p>}
            {event.contact_email && <p style={{ margin: 0, fontSize: '0.88rem' }}><a href={`mailto:${event.contact_email}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>✉️ {event.contact_email}</a></p>}
          </div>
        )}

        {/* Organizer */}
        {organizer && (
          <div onClick={() => router.push(`/profile/${organizer.member_id}`)} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            {organizer.avatar_url ? <img src={organizer.avatar_url} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>👤</div>}
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
