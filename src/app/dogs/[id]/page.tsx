'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import DogTitleCircles, { TitleCircle } from '@/components/dashboard/DogTitleCircles'

const DISCIPLINE_ICONS: Record<string, string> = {
  'Υπακοή':   '🎯',
  'Προστασία': '🛡️',
  'Ανίχνευση': '🔍',
  'Ευκινησία': '⚡',
}

export default function DogProfilePage() {
  const { t } = useLang()
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [dog, setDog] = useState<any>(null)
  const [owner, setOwner] = useState<any>(null)
  const [results, setResults] = useState<any[]>([])
  const [foundationRank, setFoundationRank] = useState<any>(null)
  const [sportRanks, setSportRanks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/')
    })
    if (id) loadDog(id as string)
    return () => subscription.unsubscribe()
  }, [id])

  async function loadDog(dogId: string) {
    const [dogRes, resultsRes, foundationRes, sportRes] = await Promise.all([
      supabase.from('dogs').select('*, breeds(name)').eq('id', dogId).single(),
      supabase.from('competition_results')
        .select('*, events(id, title_el, title_en, event_date, location), event_categories(title_el, title_en)')
        .eq('dog_id', dogId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false }),
      supabase.from('foundation_ranking')
        .select('entry_participations, entry_title, basic_participations, basic_title')
        .eq('dog_id', dogId)
        .maybeSingle(),
      supabase.from('dog_sport_ranking')
        .select('*, sports(id, name_el, name_en, is_foundation)')
        .eq('dog_id', dogId),
    ])

    if (!dogRes.data) { router.push('/'); return }
    setDog(dogRes.data)
    setResults(resultsRes.data || [])
    setFoundationRank(foundationRes.data || null)
    setSportRanks(sportRes.data || [])
    setLoading(false)

    const ownerRes = await supabase
      .from('profiles')
      .select('full_name, member_id, avatar_url')
      .eq('id', dogRes.data.owner_id)
      .single()
    setOwner(ownerRes.data)
  }

  function calcAge(dob: string): string {
    if (!dob) return '—'
    const birth = new Date(dob)
    const now = new Date()
    let years = now.getFullYear() - birth.getFullYear()
    let months = now.getMonth() - birth.getMonth()
    if (months < 0) { years--; months += 12 }
    if (years === 0) return `${months} ${t('μήνες', 'months')}`
    if (months === 0) return `${years} ${t('χρόνια', 'years')}`
    return `${years} ${t('χρόνια', 'years')} ${t('και', 'and')} ${months} ${t('μήνες', 'months')}`
  }

  const statusColor = (s: string) => {
    if (s === 'active') return '#4caf50'
    if (s === 'retired') return 'var(--text-secondary)'
    if (s === 'in_our_memories') return '#9575cd'
    return 'var(--text-secondary)'
  }

  if (loading) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem', letterSpacing: '0.1em' }}>
        {t('Φόρτωση...', 'Loading...')}
      </div>
    </div>
  )

  const isDeceased = dog.status === 'in_our_memories'

  // CHANGE 1: Updated title circles block
  const titleCircles: TitleCircle[] = []

  if (foundationRank) {
    // Entry — always show if any activity
    if (foundationRank.entry_participations > 0 || foundationRank.entry_title) {
      titleCircles.push({
        icon: '⭐', label: t('Εισαγωγικό', 'Entry'), color: '#7eb8f7',
        earned: foundationRank.entry_title,
        progress: foundationRank.entry_title ? undefined : `${foundationRank.entry_participations}/2`
      })
    }
    // Basic — always show if any activity, locked if no entry_title
    if (foundationRank.basic_participations > 0 || foundationRank.basic_title) {
      titleCircles.push({
        icon: '⭐⭐', label: t('Βασικό', 'Basic'), color: '#7ef7a0',
        earned: foundationRank.basic_title,
        progress: foundationRank.basic_title ? undefined : `${foundationRank.basic_participations}/2`
      })
    }
  }

  for (const sr of sportRanks) {
    if (sr.sports?.is_foundation) continue
    const hasActivity = sr.participations > 0 || sr.total_points > 0 || sr.title
    if (!hasActivity) continue
    const sportName = t(sr.sports?.name_el, sr.sports?.name_en) || sr.sports?.name_el || '?'
    const icon = DISCIPLINE_ICONS[sr.sports?.name_el] || '🏅'
    titleCircles.push({
      icon,
      label: sportName,
      sublabel: `Lvl ${sr.current_sublevel}`,
      color: 'var(--accent)',
      earned: sr.title === true,
      progress: sr.title ? undefined : `${sr.participations}/2`,
    })
  }

  const earnedCount = titleCircles.filter(c => c.earned).length

  // CHANGE 2: Find top discipline
  const topDiscipline = sportRanks
    .filter(sr => !sr.sports?.is_foundation && (sr.participations > 0 || sr.title))
    .sort((a, b) => b.current_sublevel !== a.current_sublevel
      ? b.current_sublevel - a.current_sublevel
      : b.total_points - a.total_points)[0]

  return (
    <div style={{ minHeight: '90vh', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            fontFamily: 'Bebas Neue, sans-serif',
            letterSpacing: '0.05em',
            color: 'var(--text-primary)',
            marginBottom: '0.25rem',
          }}>
            {dog.name}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.15rem' }}>
            Dog ID: {dog.dog_id}
          </p>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: statusColor(dog.status || 'active'), marginBottom: '0.2rem' }}>
            ● {dog.status === 'active' ? t('Ενεργός', 'Active') : dog.status === 'retired' ? t('Αποσυρμένος', 'Retired') : '🕯️ ' + t('Στη μνήμη του', 'In our memories')}
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            {dog.breeds?.name || t('Άγνωστη φυλή', 'Unknown breed')}
            {dog.gender ? ` · ${dog.gender === 'male' ? t('Αρσενικό', 'Male') : t('Θηλυκό', 'Female')}` : ''}
            {dog.neutered ? ` · ${t('Στειρωμένο', 'Neutered')}` : ''}
            {!isDeceased && dog.date_of_birth ? ` · ${calcAge(dog.date_of_birth)}` : ''}
          </p>
          {dog.chip_number && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
              🔖 Chip: {dog.chip_number}
            </p>
          )}
        </div>

        {/* Circle layout — desktop */}
        <div className="circles-desktop" style={{
          gridTemplateColumns: '120px 1fr 120px',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2.5rem',
          minHeight: '220px',
        }}>
          {/* Left — owner */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {owner && (
              <div
                onClick={() => router.push(`/profile/${owner.member_id}`)}
                style={{ cursor: 'pointer', textAlign: 'center' }}
              >
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  border: '2px solid var(--accent)', overflow: 'hidden',
                  background: 'var(--bg-card)', margin: '0 auto',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {owner.avatar_url
                    ? <img src={owner.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '1.8rem' }}>🐾</span>
                  }
                </div>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '80px', textAlign: 'center' }}>
                  {owner.full_name}
                </p>
                <p style={{ fontSize: '0.6rem', color: 'var(--accent)' }}>#{owner.member_id}</p>
              </div>
            )}
          </div>

          {/* Center — dog photo + title orbit */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '220px',
          }}>
            <DogTitleCircles circles={titleCircles} />

            {/* Dog photo */}
            <div
              onClick={() => dog.photo_url && setLightbox(true)}
              style={{
                width: '200px', height: '200px', borderRadius: '50%',
                border: `3px solid ${statusColor(dog.status || 'active')}`,
                background: 'var(--bg-card)', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 30px ${isDeceased ? 'rgba(149,117,205,0.2)' : 'rgba(232,185,79,0.15)'}`,
                cursor: dog.photo_url ? 'zoom-in' : 'default',
                position: 'relative', zIndex: 3,
              }}
            >
              {dog.photo_url
                ? <img src={dog.photo_url} alt={dog.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                : <span style={{ fontSize: '5rem' }}>{isDeceased ? '🕯️' : '🐕'}</span>
              }
            </div>
          </div>

          {/* Right — spacer */}
          <div />
        </div>

        {/* Mobile layout */}
        <div className="circles-mobile" style={{ marginBottom: '2rem' }}>
          {/* Dog photo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div
              onClick={() => dog.photo_url && setLightbox(true)}
              style={{
                width: '160px', height: '160px', borderRadius: '50%',
                border: `3px solid ${statusColor(dog.status || 'active')}`,
                background: 'var(--bg-card)', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: dog.photo_url ? 'zoom-in' : 'default',
              }}
            >
              {dog.photo_url
                ? <img src={dog.photo_url} alt={dog.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                : <span style={{ fontSize: '4rem' }}>{isDeceased ? '🕯️' : '🐕'}</span>
              }
            </div>
          </div>

          {/* Owner on mobile */}
          {owner && (
            <div
              onClick={() => router.push(`/profile/${owner.member_id}`)}
              style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', cursor: 'pointer' }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'var(--bg-card)', borderRadius: '99px',
                padding: '0.35rem 0.85rem', border: '1px solid var(--border)',
              }}>
                {owner.avatar_url
                  ? <img src={owner.avatar_url} style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                  : <span>🐾</span>
                }
                <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600 }}>{owner.full_name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>#{owner.member_id}</span>
              </div>
            </div>
          )}

          {/* Title circles on mobile */}
          <DogTitleCircles circles={titleCircles} />
        </div>

        {/* Stats circles */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem', maxWidth: '400px', margin: '0 auto 2rem',
        }}>
          {[
            { label: t('Αγώνες', 'Events'), value: results.length },
            { label: t('Τίτλοι', 'Titles'), value: earnedCount },
            { label: t('Αθλήματα', 'Sports'), value: sportRanks.length },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '50%', aspectRatio: '1',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(232,185,79,0.08)',
            }}>
              <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.4rem)', fontFamily: 'Bebas Neue, sans-serif', color: 'var(--accent)', letterSpacing: '0.05em' }}>
                {stat.value}
              </p>
              <p style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center', padding: '0 0.25rem' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* CHANGE 2: Top discipline card */}
        {topDiscipline && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 100%)',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: '14px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                🏆 {t('Κορυφαίο Άθλημα', 'Top Discipline')}
              </p>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
                {t(topDiscipline.sports?.name_el, topDiscipline.sports?.name_en || topDiscipline.sports?.name_el)}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.6rem', color: 'var(--accent)', lineHeight: 1 }}>
                Lvl {topDiscipline.current_sublevel}
              </p>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {topDiscipline.total_points} {t('σύνολο πόντων', 'total points')}
              </p>
            </div>
          </div>
        )}

        {/* Per-discipline ranking */}
        {(foundationRank || sportRanks.length > 0) && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.3rem', letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '1rem' }}>
              {t('Κατάταξη', 'Ranking')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

              {foundationRank && (<>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>⭐</span>
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem', margin: 0 }}>{t('Εισαγωγικό Επίπεδο', 'Entry Level')}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>{t('Συμμετοχές', 'Participations')}: {foundationRank.entry_participations}/2</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: '99px', background: foundationRank.entry_title ? 'rgba(126,184,247,0.15)' : 'var(--bg)', border: `1px solid ${foundationRank.entry_title ? '#7eb8f7' : 'var(--border)'}`, color: foundationRank.entry_title ? '#7eb8f7' : 'var(--text-secondary)' }}>
                    {foundationRank.entry_title ? '🏅 ' + t('Τίτλος', 'Title') : t('Σε εξέλιξη', 'In progress')}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>⭐⭐</span>
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem', margin: 0 }}>{t('Βασικό Επίπεδο', 'Basic Level')}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>{t('Συμμετοχές', 'Participations')}: {foundationRank.basic_participations}/2</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: '99px', background: foundationRank.basic_title ? 'rgba(126,247,160,0.15)' : 'var(--bg)', border: `1px solid ${foundationRank.basic_title ? '#7ef7a0' : 'var(--border)'}`, color: foundationRank.basic_title ? '#7ef7a0' : 'var(--text-secondary)' }}>
                    {foundationRank.basic_title ? '🏅 ' + t('Τίτλος', 'Title') : foundationRank.entry_title ? t('Σε εξέλιξη', 'In progress') : t('Κλειδωμένο', 'Locked')}
                  </span>
                </div>
              </>)}

              {sportRanks.filter(sr => !sr.sports?.is_foundation).map(sr => {
                const sportName = t(sr.sports?.name_el, sr.sports?.name_en) || sr.sports?.name_el
                const icon = DISCIPLINE_ICONS[sr.sports?.name_el] || '🏅'
                return (
                  <div key={sr.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem', margin: 0 }}>{sportName} — {t('Επίπεδο', 'Level')} {sr.current_sublevel}</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>{t('Συμμετοχές', 'Participations')}: {sr.participations}/2 · {t('Σύνολο πόντων', 'Total points')}: {sr.total_points}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: '99px', background: sr.title ? 'rgba(232,185,79,0.15)' : 'var(--bg)', border: `1px solid ${sr.title ? 'var(--accent)' : 'var(--border)'}`, color: sr.title ? 'var(--accent)' : 'var(--text-secondary)' }}>
                      {sr.title ? '🏅 ' + t('Τίτλος', 'Title') : t('Σε εξέλιξη', 'In progress')}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Competition history */}
        <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.3rem', letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '1rem' }}>
          {t('Ιστορικό Αγώνων', 'Competition History')}
        </h2>

        {results.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {t('Δεν υπάρχουν αγώνες ακόμα.', 'No competitions yet.')}
          </div>
        ) : (
          results.map(r => (
            <div
              key={r.id}
              onClick={() => r.events?.id && router.push(`/events/${r.events.id}`)}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: r.events?.id ? 'pointer' : 'default', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => { if (r.events?.id) e.currentTarget.style.borderColor = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {t(r.events?.title_el, r.events?.title_en || r.events?.title_el) || '—'}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {t(r.event_categories?.title_el, r.event_categories?.title_en || r.event_categories?.title_el) || '—'}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {r.events?.event_date ? new Date(r.events.event_date).toLocaleDateString('el-GR') : '—'}
                  {r.events?.location ? ` · ${r.events.location}` : ''}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                {r.placement && <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.3rem', color: 'var(--accent)' }}>#{r.placement}</p>}
                {r.score != null && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.score} pts</p>}
                <p style={{ fontSize: '0.72rem', fontWeight: 600, color: r.passed ? '#7ef7a0' : '#f77e7e' }}>
                  {r.passed ? '✓ Pass' : '✗ Fail'}
                </p>
                {r.passed && r.title_earned && (
                  <p style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 600 }}>🏅 {t('Τίτλος', 'Title')}</p>
                )}
              </div>
            </div>
          ))
        )}

        {/* Lightbox */}
        {lightbox && (
          <div onClick={() => setLightbox(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, cursor: 'zoom-out',
          }}>
            <img src={dog.photo_url} alt={dog.name} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} />
          </div>
        )}

        <style>{`
          .circles-desktop { display: grid !important; }
          .circles-mobile  { display: none !important; }
          @media (max-width: 600px) {
            .circles-desktop { display: none !important; }
            .circles-mobile  { display: block !important; }
          }
        `}</style>
      </div>
    </div>
  )
}