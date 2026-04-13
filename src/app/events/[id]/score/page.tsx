'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'

interface DogScore {
  registrationId: string
  dogId: string
  dogName: string
  dogDisplayId: string
  ownerName: string
  ownerMemberId: string
  ownerId: string
  levelAtTime: string
  score: string
  passed: boolean | null
}

interface CategoryScoring {
  categoryId: string
  titleEl: string
  titleEn: string
  sportName: string
  assignmentId: string
  dogs: DogScore[]
  submitted: boolean
  submitting: boolean
  submitMsg: { type: 'success' | 'error', text: string } | null
}

export default function ScorePage() {
  const { t } = useLang()
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [event, setEvent] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<CategoryScoring[]>([])

  useEffect(() => {
    if (id) load(id as string)
  }, [id])

  async function load(eventId: string) {
    const [eventRes, sessionRes] = await Promise.all([
      supabase.from('events').select('id, title_el, title_en, status').eq('id', eventId).single(),
      fetch('/auth/session').then(r => r.json())
    ])

    if (!eventRes.data) { router.push('/events'); return }

    // Must be completed
    if (eventRes.data.status !== 'completed') {
      router.push(`/events/${eventId}`)
      return
    }

    // Must be a logged in judge
    if (!sessionRes?.user) { router.push(`/events/${eventId}`); return }

    setEvent(eventRes.data)
    setSession(sessionRes)

    // Get this judge's accepted assignments for this event
    const { data: myAssignments } = await supabase
      .from('event_assignments')
      .select(`
        id, category_id,
        event_categories!event_assignments_category_id_fkey(
          id, title_el, title_en,
          sports(name_el, name_en)
        )
      `)
      .eq('event_id', eventId)
      .eq('user_id', sessionRes.user.id)
      .eq('role', 'judge')
      .eq('status', 'accepted')

    if (!myAssignments || myAssignments.length === 0) {
      router.push(`/events/${eventId}`)
      return
    }

    // For each assigned category, load attended registrations + existing results
    const builtCategories: CategoryScoring[] = []

    for (const assignment of myAssignments) {
      const cat = assignment.event_categories as any
      if (!cat) continue

      // Get attended registrations for this category
      const { data: regs } = await supabase
        .from('event_registrations')
        .select(`
          id, dog_id, owner_id,
          dogs!event_registrations_dog_id_fkey(id, name, dog_id),
          profiles!event_registrations_owner_id_fkey(id, full_name, member_id)
        `)
        .eq('category_id', cat.id)
        .eq('attendance_status', 'attended')
        .eq('status', 'confirmed')

      // Get foundation levels for each dog
      const dogIds = (regs || []).map((r: any) => r.dog_id)
      let foundationMap: Record<string, string> = {}

      if (dogIds.length > 0) {
        const { data: rankings } = await supabase
          .from('foundation_ranking')
          .select('dog_id, entry_title, basic_title')
          .in('dog_id', dogIds)

        ;(rankings || []).forEach((rank: any) => {
          if (rank.basic_title) foundationMap[rank.dog_id] = 'basic'
          else if (rank.entry_title) foundationMap[rank.dog_id] = 'entry'
          else foundationMap[rank.dog_id] = 'none'
        })
      }

      // Check if results already submitted for this category by this judge
      const { data: existingResults } = await supabase
        .from('competition_results')
        .select('id, dog_id, score, passed, status')
        .eq('event_id', eventId)
        .eq('category_id', cat.id)
        .eq('submitted_by', sessionRes.user.id)

      const existingMap: Record<string, any> = {}
      ;(existingResults || []).forEach((r: any) => { existingMap[r.dog_id] = r })

      const alreadySubmitted = existingResults && existingResults.length > 0
        && existingResults.every((r: any) => r.status === 'pending' || r.status === 'approved')
      const isApproved = existingResults && existingResults.some((r: any) => r.status === 'approved')

      const dogs: DogScore[] = (regs || []).map((r: any) => ({
        registrationId: r.id,
        dogId: r.dog_id,
        dogName: r.dogs?.name || '—',
        dogDisplayId: r.dogs?.dog_id || '—',
        ownerName: r.profiles?.full_name || '—',
        ownerMemberId: r.profiles?.member_id || '—',
        ownerId: r.owner_id,
        levelAtTime: foundationMap[r.dog_id] || 'none',
        score: existingMap[r.dog_id]?.score?.toString() || '',
        passed: existingMap[r.dog_id]?.passed ?? null,
      }))

      builtCategories.push({
        categoryId: cat.id,
        titleEl: cat.title_el,
        titleEn: cat.title_en,
        sportName: t(cat.sports?.name_el, cat.sports?.name_en || cat.sports?.name_el),
        assignmentId: assignment.id,
        dogs,
        submitted: !!alreadySubmitted,
        submitting: false,
        submitMsg: null,
      })
    }

    setCategories(builtCategories)
    setLoading(false)
  }

  function updateDogScore(catIndex: number, dogIndex: number, field: 'score' | 'passed', value: any) {
    setCategories(prev => prev.map((cat, ci) => {
      if (ci !== catIndex) return cat
      return {
        ...cat,
        dogs: cat.dogs.map((dog, di) => {
          if (di !== dogIndex) return dog
          return { ...dog, [field]: value }
        })
      }
    }))
  }

  function setCatState(catIndex: number, updates: Partial<CategoryScoring>) {
    setCategories(prev => prev.map((cat, ci) => ci === catIndex ? { ...cat, ...updates } : cat))
  }

  async function handleSubmit(catIndex: number) {
    const cat = categories[catIndex]
    if (!cat || !session?.user) return

    // Validate all dogs have score + pass/fail
    const invalid = cat.dogs.filter(d => d.score === '' || d.passed === null)
    if (invalid.length > 0) {
      setCatState(catIndex, {
        submitMsg: {
          type: 'error',
          text: t(
            `Συμπλήρωσε βαθμολογία και αποτέλεσμα για όλους τους σκύλους (${invalid.length} εκκρεμούν)`,
            `Fill score and pass/fail for all dogs (${invalid.length} remaining)`
          )
        }
      })
      return
    }

    // Validate scores 0-100
    const outOfRange = cat.dogs.filter(d => {
      const n = parseFloat(d.score)
      return isNaN(n) || n < 0 || n > 100
    })
    if (outOfRange.length > 0) {
      setCatState(catIndex, {
        submitMsg: { type: 'error', text: t('Η βαθμολογία πρέπει να είναι μεταξύ 0 και 100', 'Score must be between 0 and 100') }
      })
      return
    }

    setCatState(catIndex, { submitting: true, submitMsg: null })

    // Delete existing pending results for this category by this judge (for re-submission)
    await supabase
      .from('competition_results')
      .delete()
      .eq('event_id', id)
      .eq('category_id', cat.categoryId)
      .eq('submitted_by', session.user.id)
      .eq('status', 'pending')

    // Insert new results
    const rows = cat.dogs.map(dog => ({
      event_id: id,
      category_id: cat.categoryId,
      dog_id: dog.dogId,
      owner_id: dog.ownerId,
      score: parseFloat(dog.score),
      passed: dog.passed,
      level_at_time: dog.levelAtTime,
      submitted_by: session.user.id,
      status: 'pending',
    }))

    const { error } = await supabase.from('competition_results').insert(rows)

    if (error) {
      setCatState(catIndex, {
        submitting: false,
        submitMsg: { type: 'error', text: t('Σφάλμα υποβολής αποτελεσμάτων', 'Error submitting results') }
      })
    } else {
      // Notify admin
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')

      if (adminRoles && adminRoles.length > 0) {
        await Promise.all(adminRoles.map((a: any) =>
          supabase.from('notifications').insert({
            user_id: a.user_id,
            type: 'results_submitted',
            title_el: 'Νέα Αποτελέσματα προς Έγκριση',
            title_en: 'New Results Pending Approval',
            message_el: `Ο κριτής υπέβαλε αποτελέσματα για την κατηγορία "${cat.titleEl}" στον αγώνα "${event?.title_el}".`,
            message_en: `Judge submitted results for category "${cat.titleEl}" in event "${event?.title_el}".`,
            metadata: { event_id: id, category_id: cat.categoryId },
          })
        ))
      }

      setCatState(catIndex, {
        submitting: false,
        submitted: true,
        submitMsg: { type: 'success', text: t('Αποτελέσματα υποβλήθηκαν επιτυχώς!', 'Results submitted successfully!') }
      })
    }
  }

  if (loading) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '1.25rem',
    marginBottom: '1rem',
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 1.5rem' }}>

        <button onClick={() => router.push(`/events/${id}`)} style={{
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          cursor: 'pointer', fontSize: '1.2rem', marginBottom: '1.5rem', padding: 0
        }}>←</button>

        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem', letterSpacing: '0.05em', color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
          ⚖️ {t('Βαθμολόγηση', 'Scoring')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {t(event?.title_el, event?.title_en || event?.title_el)}
        </p>

        {categories.length === 0 && (
          <div style={cardStyle}>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
              {t('Δεν βρέθηκαν κατηγορίες για βαθμολόγηση', 'No categories found for scoring')}
            </p>
          </div>
        )}

        {categories.map((cat, catIndex) => {
          const isApproved = false // Phase 3 will lock these
          const isLocked = isApproved

          return (
            <div key={cat.categoryId} style={{
              ...cardStyle,
              border: cat.submitted ? '1px solid #7ef7a044' : '1px solid var(--border)',
            }}>
              {/* Category header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <p style={{ margin: 0, fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', color: 'var(--accent)', letterSpacing: '0.04em' }}>
                    {t(cat.titleEl, cat.titleEn || cat.titleEl)}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{cat.sportName}</p>
                </div>
                {cat.submitted && (
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.7rem', borderRadius: '99px',
                    background: '#7ef7a022', border: '1px solid #7ef7a044', color: '#7ef7a0',
                  }}>
                    ✓ {t('Υποβλήθηκε', 'Submitted')}
                  </span>
                )}
              </div>

              {/* Dogs */}
              {cat.dogs.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
                  {t('Κανένας συμμετέχων παρών σε αυτή την κατηγορία', 'No participants attended this category')}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                  {cat.dogs.map((dog, dogIndex) => (
                    <div key={dog.dogId} style={{
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: '10px', padding: '0.85rem 1rem',
                    }}>
                      {/* Dog info */}
                      <div style={{ marginBottom: '0.65rem' }}>
                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          🐕 {dog.dogName}
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '0.75rem' }}>{' '}· {dog.dogDisplayId}</span>
                        </p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          👤 {dog.ownerName} (#{dog.ownerMemberId})
                          {' · '}
                          <span style={{
                            color: dog.levelAtTime === 'basic' ? 'var(--accent)' :
                              dog.levelAtTime === 'entry' ? '#a0a0ff' : 'var(--text-secondary)'
                          }}>
                            {dog.levelAtTime === 'basic' ? t('Βασικό Επίπεδο', 'Basic Level') :
                              dog.levelAtTime === 'entry' ? t('Εισαγωγικό Επίπεδο', 'Entry Level') :
                                t('Χωρίς Τίτλο', 'No Title')}
                          </span>
                        </p>
                      </div>

                      {/* Score input */}
                      <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                            {t('Βαθμολογία (0-100)', 'Score (0-100)')}
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            disabled={isLocked}
                            value={dog.score}
                            onChange={e => updateDogScore(catIndex, dogIndex, 'score', e.target.value)}
                            style={{
                              width: '100%',
                              background: isLocked ? 'var(--bg-card)' : 'var(--bg-card)',
                              border: `1px solid ${dog.score !== '' && (parseFloat(dog.score) < 0 || parseFloat(dog.score) > 100) ? '#f77e7e' : 'var(--border)'}`,
                              borderRadius: '8px', padding: '0.55rem 0.75rem',
                              color: 'var(--text-primary)', fontSize: '1rem',
                              fontFamily: 'Bebas Neue, sans-serif', outline: 'none',
                              boxSizing: 'border-box',
                              opacity: isLocked ? 0.6 : 1,
                            }}
                            placeholder="0 — 100"
                          />
                        </div>

                        {/* Pass / Fail toggle */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {t('Αποτέλεσμα', 'Result')}
                          </label>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              disabled={isLocked}
                              onClick={() => updateDogScore(catIndex, dogIndex, 'passed', true)}
                              style={{
                                background: dog.passed === true ? '#7ef7a0' : 'transparent',
                                border: `1px solid ${dog.passed === true ? '#7ef7a0' : 'var(--border)'}`,
                                borderRadius: '8px', padding: '0.5rem 1rem',
                                color: dog.passed === true ? 'var(--bg)' : 'var(--text-secondary)',
                                cursor: isLocked ? 'not-allowed' : 'pointer',
                                fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                                transition: 'all 0.15s', opacity: isLocked ? 0.6 : 1,
                              }}>
                              ✓ {t('Pass', 'Pass')}
                            </button>
                            <button
                              disabled={isLocked}
                              onClick={() => updateDogScore(catIndex, dogIndex, 'passed', false)}
                              style={{
                                background: dog.passed === false ? '#f77e7e' : 'transparent',
                                border: `1px solid ${dog.passed === false ? '#f77e7e' : 'var(--border)'}`,
                                borderRadius: '8px', padding: '0.5rem 1rem',
                                color: dog.passed === false ? 'var(--bg)' : 'var(--text-secondary)',
                                cursor: isLocked ? 'not-allowed' : 'pointer',
                                fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                                transition: 'all 0.15s', opacity: isLocked ? 0.6 : 1,
                              }}>
                              ✗ {t('Fail', 'Fail')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit message */}
              {cat.submitMsg && (
                <div style={{
                  background: cat.submitMsg.type === 'success' ? 'rgba(0,200,100,0.1)' : 'rgba(220,50,50,0.1)',
                  border: `1px solid ${cat.submitMsg.type === 'success' ? 'rgba(0,200,100,0.3)' : 'rgba(220,50,50,0.3)'}`,
                  borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem',
                  color: cat.submitMsg.type === 'success' ? '#00c864' : '#dc3232',
                  fontSize: '0.85rem', fontWeight: 600,
                }}>
                  {cat.submitMsg.text}
                </div>
              )}

              {/* Submit button */}
              {!isLocked && cat.dogs.length > 0 && (
                <button
                  onClick={() => handleSubmit(catIndex)}
                  disabled={cat.submitting}
                  style={{
                    width: '100%',
                    background: cat.submitting ? 'var(--bg)' : cat.submitted ? 'rgba(212,175,55,0.15)' : 'var(--accent)',
                    border: cat.submitted ? '1px solid var(--accent)' : 'none',
                    borderRadius: '10px', padding: '0.85rem',
                    color: cat.submitting ? 'var(--text-secondary)' : cat.submitted ? 'var(--accent)' : 'var(--bg)',
                    fontWeight: 700, cursor: cat.submitting ? 'not-allowed' : 'pointer',
                    fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem',
                    letterSpacing: '0.04em', opacity: cat.submitting ? 0.7 : 1,
                  }}>
                  {cat.submitting
                    ? t('Υποβολή...', 'Submitting...')
                    : cat.submitted
                      ? t('🔄 Επανυποβολή', '🔄 Resubmit')
                      : t('📤 Υποβολή Αποτελεσμάτων', '📤 Submit Results')}
                </button>
              )}
            </div>
          )
        })}

      </div>
    </main>
  )
}
