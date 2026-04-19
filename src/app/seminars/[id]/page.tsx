'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

export default function SeminarDetailPage() {
  const { t } = useLang()
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [seminar, setSeminar] = useState<any>(null)
  const [organizer, setOrganizer] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [registration, setRegistration] = useState<any>(null)
  const [registrations, setRegistrations] = useState<any[]>([])
  const [regLoading, setRegLoading] = useState(false)
  const [regMsg, setRegMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => { if (id) load(id as string) }, [id])

  async function load(seminarId: string) {
    const [seminarRes, sessionRes] = await Promise.all([
      supabase.from('seminars').select('*').eq('id', seminarId).single(),
      fetch('/auth/session').then(r => r.json()),
    ])

    if (!seminarRes.data) { router.push('/seminars'); return }
    setSeminar(seminarRes.data)
    setSession(sessionRes)

    if (seminarRes.data.created_by) {
      const { data: org } = await supabase
        .from('profiles').select('full_name, avatar_url, member_id')
        .eq('id', seminarRes.data.created_by).single()
      setOrganizer(org)
    }

    if (sessionRes?.user) {
      const { data: myReg } = await supabase
        .from('seminar_registrations')
        .select('id, status, attendance_status')
        .eq('seminar_id', seminarId)
        .eq('user_id', sessionRes.user.id)
        .maybeSingle()
      setRegistration(myReg)
    }

    // Load all registrations only for organizer/admin
    const isOrgOrAdmin = sessionRes?.isAdmin || sessionRes?.roles?.includes('organizer') || sessionRes?.user?.id === seminarRes.data.created_by
    if (isOrgOrAdmin && ['approved', 'completed'].includes(seminarRes.data.status)) {
      const { data: allRegs } = await supabase
        .from('seminar_registrations')
        .select('id, user_id, status, attendance_status, profiles!seminar_registrations_user_id_fkey(id, full_name, member_id, avatar_url)')
        .eq('seminar_id', seminarId)
      setRegistrations(allRegs || [])
    }

    setLoading(false)
  }

  async function handleRegister() {
    if (!session?.user) return
    setRegLoading(true)
    setRegMsg(null)
    const { error } = await supabase.from('seminar_registrations').insert({
      seminar_id: id,
      user_id: session.user.id,
      status: 'confirmed',
    })
    if (error) {
      setRegMsg({ type: 'error', text: t('Σφάλμα εγγραφής.', 'Registration error.') })
    } else {
      setRegMsg({ type: 'success', text: t('Εγγραφή ολοκληρώθηκε!', 'Registration confirmed!') })
      const { data: myReg } = await supabase
        .from('seminar_registrations').select('id, status, attendance_status')
        .eq('seminar_id', id as string).eq('user_id', session.user.id).maybeSingle()
      setRegistration(myReg)
      // Reload registrations if org/admin
      if (isOrgOrAdmin) {
        const { data: allRegs } = await supabase
          .from('seminar_registrations')
          .select('id, user_id, status, attendance_status, profiles!seminar_registrations_user_id_fkey(id, full_name, member_id, avatar_url)')
          .eq('seminar_id', id as string)
        setRegistrations(allRegs || [])
      }
    }
    setRegLoading(false)
  }

  async function handleCancel() {
    if (!registration) return
    setRegLoading(true)
    await supabase.from('seminar_registrations').delete().eq('id', registration.id)
    setRegistration(null)
    if (isOrgOrAdmin) {
      const { data: allRegs } = await supabase
        .from('seminar_registrations')
        .select('id, user_id, status, attendance_status, profiles!seminar_registrations_user_id_fkey(id, full_name, member_id, avatar_url)')
        .eq('seminar_id', id as string)
      setRegistrations(allRegs || [])
    }
    setRegLoading(false)
  }

  const formatDate = (iso: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${mins}`
  }

  if (loading) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )
  if (!seminar) return null

  const isLoggedIn = !!session?.user
  const isMyEvent = session?.user?.id === seminar.created_by
  const isAdmin = session?.isAdmin
  const isOrgOrAdmin = isAdmin || session?.roles?.includes('organizer') || isMyEvent
  const isUpcoming = seminar.seminar_date && new Date(seminar.seminar_date) > new Date()
  const isCompleted = seminar.status === 'completed'
  const canAttendance = (isMyEvent || isAdmin) && seminar.status === 'approved'
  const title = t(seminar.title_el, seminar.title_en || seminar.title_el)
  const desc = t(seminar.description_el, seminar.description_en || seminar.description_el)

  const cardStyle: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' }
  const sectionTitle: React.CSSProperties = { fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: 'var(--accent)', margin: '0 0 1rem', letterSpacing: '0.04em' }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>

      {/* Banner lightbox */}
      {lightboxOpen && seminar.banner_url && (
        <div onClick={() => setLightboxOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'zoom-out' }}>
          <img src={seminar.banner_url} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} />
        </div>
      )}

      {/* Banner */}
      {seminar.banner_url && (
        <div onClick={() => setLightboxOpen(true)} style={{ width: '100%', height: '240px', overflow: 'hidden', cursor: 'zoom-in', position: 'relative' }}>
          <img src={seminar.banner_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, var(--bg) 100%)' }} />
        </div>
      )}

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1.5rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', marginBottom: '1rem', marginTop: seminar.banner_url ? '-1rem' : '0', padding: 0, position: 'relative', zIndex: 1 }}>←</button>

        {/* Status badges */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          {seminar.is_online && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.7rem', borderRadius: '99px', background: 'rgba(126,184,247,0.15)', color: '#7eb8f7', border: '1px solid #7eb8f744' }}>
              🌐 Online
            </span>
          )}
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.7rem', borderRadius: '99px', background: isCompleted ? 'rgba(120,120,255,0.15)' : isUpcoming ? 'rgba(212,175,55,0.15)' : 'var(--bg-card)', color: isCompleted ? '#a0a0ff' : isUpcoming ? 'var(--accent)' : 'var(--text-secondary)', border: `1px solid ${isCompleted ? '#a0a0ff' : isUpcoming ? 'var(--accent)' : 'var(--border)'}` }}>
            {isCompleted ? t('✅ Ολοκληρώθηκε', '✅ Completed') : isUpcoming ? t('Επερχόμενο', 'Upcoming') : t('Παρελθόν', 'Past')}
          </span>
        </div>

        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.4rem', letterSpacing: '0.05em', color: 'var(--text-primary)', margin: '0 0 1.25rem' }}>
          📚 {title}
        </h1>

        {/* Organizer action */}
        {canAttendance && (
          <button
            onClick={() => router.push(`/seminars/${id}/attendance`)}
            style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: '12px', padding: '0.85rem', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', letterSpacing: '0.04em', marginBottom: '1rem' }}
          >
            📋 {t('Παρουσίες & Κλείσιμο', 'Attendance & Close')}
          </button>
        )}

        {/* Key info */}
        <div style={cardStyle}>
          {seminar.seminar_date && (
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.65rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>📅</span>
              <div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t('Ημερομηνία', 'Date')}</p>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{formatDate(seminar.seminar_date)}</p>
              </div>
            </div>
          )}
          {seminar.is_online && seminar.url ? (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🔗</span>
              <div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t('Σύνδεσμος', 'Link')}</p>
                {isLoggedIn && registration ? (
                  <a href={seminar.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem', wordBreak: 'break-all' }}>{seminar.url}</a>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('Εγγράψου για πρόσβαση στον σύνδεσμο', 'Register to access the link')}</p>
                )}
              </div>
            </div>
          ) : seminar.location ? (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>📍</span>
              <div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t('Τοποθεσία', 'Location')}</p>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{seminar.location}</p>
                {seminar.address && <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{seminar.address}</p>}
              </div>
            </div>
          ) : null}
        </div>

        {/* Description */}
        {desc && (
          <div style={cardStyle}>
            <p style={sectionTitle}>{t('Περιγραφή', 'Description')}</p>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{desc}</p>
          </div>
        )}

        {/* Registration */}
        {isLoggedIn && seminar.status === 'approved' && isUpcoming && (
          <div style={cardStyle}>
            <p style={sectionTitle}>{t('Συμμετοχή', 'Participation')}</p>
            {regMsg && (
              <div style={{ background: regMsg.type === 'success' ? 'rgba(0,200,100,0.1)' : 'rgba(220,50,50,0.1)', border: `1px solid ${regMsg.type === 'success' ? 'rgba(0,200,100,0.3)' : 'rgba(220,50,50,0.3)'}`, borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem', color: regMsg.type === 'success' ? '#00c864' : '#dc3232', fontSize: '0.85rem', fontWeight: 600 }}>
                {regMsg.text}
              </div>
            )}
            {registration ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#7ef7a0', fontWeight: 600 }}>
                  ✅ {t('Είσαι εγγεγραμμένος/η', 'You are registered')}
                </p>
                <button onClick={handleCancel} disabled={regLoading} style={{ background: 'none', border: '1px solid #f77e7e', borderRadius: '8px', padding: '0.4rem 0.9rem', color: '#f77e7e', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'Outfit, sans-serif' }}>
                  {t('Ακύρωση Εγγραφής', 'Cancel Registration')}
                </button>
              </div>
            ) : (
              <button onClick={handleRegister} disabled={regLoading} style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: '10px', padding: '0.85rem', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', letterSpacing: '0.04em' }}>
                {regLoading ? t('Εγγραφή...', 'Registering...') : t('Εγγραφή στο Σεμινάριο', 'Register for Seminar')}
              </button>
            )}
          </div>
        )}

        {/* Participants — organizer/admin only */}
        {isOrgOrAdmin && registrations.length > 0 && (
          <div style={cardStyle}>
            <p style={sectionTitle}>👥 {t('Συμμετέχοντες', 'Participants')} ({registrations.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {registrations.map(r => {
                const profile = r.profiles
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', borderRadius: '8px', padding: '0.5rem 0.75rem', border: `1px solid ${r.attendance_status === 'no_show' ? '#f77e7e22' : r.attendance_status === 'attended' ? '#7ef7a022' : 'var(--border)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {profile?.avatar_url
                        ? <img src={profile.avatar_url} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>👤</div>}
                      <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{profile?.full_name}</p>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>#{profile?.member_id}</p>
                      </div>
                    </div>
                    {isCompleted && r.attendance_status && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '99px', color: r.attendance_status === 'attended' ? '#7ef7a0' : '#f77e7e', background: r.attendance_status === 'attended' ? '#7ef7a022' : '#f77e7e22', border: `1px solid ${r.attendance_status === 'attended' ? '#7ef7a044' : '#f77e7e44'}` }}>
                        {r.attendance_status === 'attended' ? t('Παρών', 'Present') : t('Απών', 'Absent')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Map */}
        {!seminar.is_online && seminar.lat && seminar.lng && (
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem 0.5rem' }}>
              <p style={sectionTitle}>📍 {t('Τοποθεσία', 'Location')}</p>
            </div>
            <div style={{ height: '220px' }}>
              <MapView lat={seminar.lat} lng={seminar.lng} label={seminar.location} />
            </div>
          </div>
        )}

        {/* Contact */}
        {(seminar.contact_name || seminar.contact_phone || seminar.contact_email) && (
          <div style={cardStyle}>
            <p style={sectionTitle}>{t('Επικοινωνία', 'Contact')}</p>
            {seminar.contact_name && <p style={{ margin: '0 0 0.35rem', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>👤 {seminar.contact_name}</p>}
            {seminar.contact_phone && (
              <p style={{ margin: '0 0 0.35rem', fontSize: '0.88rem' }}>
                <a href={`tel:${seminar.contact_phone}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>📞 {seminar.contact_phone}</a>
              </p>
            )}
            {seminar.contact_email && (
              <p style={{ margin: 0, fontSize: '0.88rem' }}>
                <a href={`mailto:${seminar.contact_email}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>✉️ {seminar.contact_email}</a>
              </p>
            )}
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
