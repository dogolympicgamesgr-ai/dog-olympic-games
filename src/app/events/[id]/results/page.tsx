'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'

const ENTRY_SPORT_ID = 'eed3995d-6e70-42c9-994d-4c684c7e9286'
const BASIC_SPORT_ID = '72b6e4ff-3ef5-4f85-bcba-9385ead2b37f'

interface ResultRow {
  id: string
  dogId: string
  dogName: string
  dogDisplayId: string
  ownerName: string
  ownerMemberId: string
  ownerId: string
  levelAtTime: string
  score: string
  passed: boolean | null
  status: string
  // foundation context
  entryParticipations: number
  entryTitle: boolean
  entryPoints: number
  basicParticipations: number
  basicTitle: boolean
  basicPoints: number
  willGetTitle: boolean
  nextLevel: string
}

interface CategoryResult {
  categoryId: string
  titleEl: string
  titleEn: string
  sportName: string
  sportId: string
  isFoundation: boolean
  isEntry: boolean  // true = entry level, false = basic level (for foundation sports)
  rows: ResultRow[]
}

export default function ResultsPage() {
  const { t } = useLang()
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [event, setEvent] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<CategoryResult[]>([])
  const [approving, setApproving] = useState(false)
  const [approveMsg, setApproveMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [alreadyApproved, setAlreadyApproved] = useState(false)

  useEffect(() => { if (id) load(id as string) }, [id])

  async function load(eventId: string) {
    const [eventRes, sessionRes] = await Promise.all([
      supabase.from('events').select('id, title_el, title_en, status').eq('id', eventId).single(),
      fetch('/auth/session').then(r => r.json())
    ])

    if (!eventRes.data) { router.push('/events'); return }
    if (!sessionRes?.isAdmin) { router.push(`/events/${eventId}`); return }
    if (eventRes.data.status !== 'completed') { router.push(`/events/${eventId}`); return }

    setEvent(eventRes.data)
    setSession(sessionRes)

    const { data: results } = await supabase
      .from('competition_results')
      .select(`
        id, dog_id, owner_id, category_id, score, passed, status, level_at_time,
        dogs!competition_results_dog_id_fkey(id, name, dog_id),
        profiles!competition_results_owner_id_fkey(id, full_name, member_id),
        event_categories!competition_results_category_id_fkey(
          id, title_el, title_en,
          sports(id, name_el, name_en, is_foundation)
        )
      `)
      .eq('event_id', eventId)

    if (!results || results.length === 0) { setLoading(false); return }

    const allApproved = results.every((r: any) => r.status === 'approved')
    setAlreadyApproved(allApproved)

    const dogIds = [...new Set(results.map((r: any) => r.dog_id))]
    const { data: rankings } = await supabase
      .from('foundation_ranking')
      .select('dog_id, entry_participations, entry_title, entry_points, basic_participations, basic_title, basic_points')
      .in('dog_id', dogIds)

    const rankMap: Record<string, any> = {}
    ;(rankings || []).forEach((r: any) => { rankMap[r.dog_id] = r })

    const catMap: Record<string, CategoryResult> = {}

    for (const r of results) {
      const cat = r.event_categories as any
      if (!cat) continue

      const sportId = cat.sports?.id
      const isFoundation = cat.sports?.is_foundation ?? true
      const isEntry = sportId === ENTRY_SPORT_ID

      if (!catMap[cat.id]) {
        catMap[cat.id] = {
          categoryId: cat.id,
          titleEl: cat.title_el,
          titleEn: cat.title_en,
          sportName: t(cat.sports?.name_el, cat.sports?.name_en || cat.sports?.name_el),
          sportId,
          isFoundation,
          isEntry,
          rows: [],
        }
      }

      const rank = rankMap[r.dog_id] || {
        entry_participations: 0, entry_title: false, entry_points: 0,
        basic_participations: 0, basic_title: false, basic_points: 0,
      }

      // Determine title prediction — branch on actual sport, not title chain
      let willGetTitle = false
      let nextLevel = ''

      if (r.passed && isFoundation) {
        if (isEntry && !rank.entry_title) {
          if (rank.entry_participations + 1 >= 2) {
            willGetTitle = true
            nextLevel = t('Εισαγωγικό Επίπεδο', 'Entry Level')
          }
        } else if (!isEntry && !rank.basic_title) {
          if (rank.basic_participations + 1 >= 2) {
            willGetTitle = true
            nextLevel = t('Βασικό Επίπεδο', 'Basic Level')
          }
        }
      }

      catMap[cat.id].rows.push({
        id: r.id,
        dogId: r.dog_id,
        dogName: (r.dogs as any)?.name || '—',
        dogDisplayId: (r.dogs as any)?.dog_id || '—',
        ownerName: (r.profiles as any)?.full_name || '—',
        ownerMemberId: (r.profiles as any)?.member_id || '—',
        ownerId: r.owner_id,
        levelAtTime: r.level_at_time || 'none',
        score: r.score?.toString() || '',
        passed: r.passed,
        status: r.status,
        entryParticipations: rank.entry_participations,
        entryTitle: rank.entry_title,
        entryPoints: rank.entry_points,
        basicParticipations: rank.basic_participations,
        basicTitle: rank.basic_title,
        basicPoints: rank.basic_points,
        willGetTitle,
        nextLevel,
      })
    }

    setCategories(Object.values(catMap))
    setLoading(false)
  }

  function updateRow(catIndex: number, rowIndex: number, field: 'score' | 'passed', value: any) {
    setCategories(prev => prev.map((cat, ci) => {
      if (ci !== catIndex) return cat
      return {
        ...cat,
        rows: cat.rows.map((row, ri) => {
          if (ri !== rowIndex) return row
          let updated = { ...row, [field]: value }

          if (field === 'passed' && cat.isFoundation) {
            let willGetTitle = false
            let nextLevel = ''
            if (value === true) {
              if (cat.isEntry && !row.entryTitle) {
                if (row.entryParticipations + 1 >= 2) {
                  willGetTitle = true
                  nextLevel = t('Εισαγωγικό Επίπεδο', 'Entry Level')
                }
              } else if (!cat.isEntry && !row.basicTitle) {
                if (row.basicParticipations + 1 >= 2) {
                  willGetTitle = true
                  nextLevel = t('Βασικό Επίπεδο', 'Basic Level')
                }
              }
            }
            updated = { ...updated, willGetTitle, nextLevel }
          }
          return updated
        })
      }
    }))
  }

  async function handleApproveAll() {
    setApproving(true)
    setApproveMsg(null)

    for (const cat of categories) {
      for (const row of cat.rows) {
        if (row.score === '' || row.passed === null) {
          setApproveMsg({ type: 'error', text: t('Συμπλήρωσε βαθμολογία και αποτέλεσμα για όλες τις εγγραφές', 'Fill score and result for all entries') })
          setApproving(false)
          return
        }
      }
    }

    try {
      // 1. Update competition_results
      for (const cat of categories) {
        for (const row of cat.rows) {
          await supabase
            .from('competition_results')
            .update({ score: parseFloat(row.score), passed: row.passed, status: 'approved', approved_by: session.user.id })
            .eq('id', row.id)
        }
      }

      // 2. Update rankings
      for (const cat of categories) {
        for (const row of cat.rows) {
          if (!row.passed) continue
          const scoreVal = parseFloat(row.score)

          if (cat.isFoundation) {
            // ── FOUNDATION: branch on actual sport_id ──
            const { data: existing } = await supabase
              .from('foundation_ranking')
              .select('id, entry_participations, entry_title, entry_points, basic_participations, basic_title, basic_points')
              .eq('dog_id', row.dogId)
              .maybeSingle()

            if (cat.isEntry) {
              // Entry Level run
              if (!existing) {
                await supabase.from('foundation_ranking').insert({
                  dog_id: row.dogId,
                  owner_id: row.ownerId,
                  entry_participations: 1,
                  entry_points: scoreVal,
                  entry_title: false,
                  basic_participations: 0,
                  basic_points: 0,
                  basic_title: false,
                })
              } else if (!existing.entry_title) {
                const newCount = existing.entry_participations + 1
                const newPoints = existing.entry_points + scoreVal
                const getsTitle = newCount >= 2
                await supabase
                  .from('foundation_ranking')
                  .update({
                    entry_participations: getsTitle ? 0 : newCount,
                    entry_points: newPoints, // points never reset
                    entry_title: getsTitle,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existing.id)
              }
              // If entry_title already true: dog should have been blocked from registering
            } else {
              // Basic Level run
              if (!existing) {
                await supabase.from('foundation_ranking').insert({
                  dog_id: row.dogId,
                  owner_id: row.ownerId,
                  entry_participations: 0,
                  entry_points: 0,
                  entry_title: false,
                  basic_participations: 1,
                  basic_points: scoreVal,
                  basic_title: false,
                })
              } else if (!existing.basic_title) {
                const newCount = existing.basic_participations + 1
                const newPoints = existing.basic_points + scoreVal
                const getsTitle = newCount >= 2
                await supabase
                  .from('foundation_ranking')
                  .update({
                    basic_participations: getsTitle ? 0 : newCount,
                    basic_points: newPoints, // points never reset
                    basic_title: getsTitle,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existing.id)
              }
              // If basic_title already true: dog should have been blocked from registering
            }
          } else {
            // ── DISCIPLINE: update dog_sport_ranking ──
            const { data: sportRank } = await supabase
              .from('dog_sport_ranking')
              .select('id, participations, current_sublevel, title, total_points')
              .eq('dog_id', row.dogId)
              .eq('sport_id', cat.sportId)
              .maybeSingle()

            if (!sportRank) {
              await supabase.from('dog_sport_ranking').insert({
                dog_id: row.dogId,
                owner_id: row.ownerId,
                sport_id: cat.sportId,
                participations: 1,
                current_sublevel: 1,
                title: false,
                total_points: scoreVal,
                updated_at: new Date().toISOString(),
              })
            } else {
              const newParticipations = sportRank.participations + 1
              const newPoints = sportRank.total_points + scoreVal
              const getsTitle = newParticipations >= 2
              const newSublevel = getsTitle && sportRank.current_sublevel < 3
                ? sportRank.current_sublevel + 1
                : sportRank.current_sublevel
              const earnedFinalTitle = getsTitle && sportRank.current_sublevel >= 3

              await supabase
                .from('dog_sport_ranking')
                .update({
                  participations: getsTitle ? 0 : newParticipations,
                  current_sublevel: newSublevel,
                  title: earnedFinalTitle,
                  total_points: newPoints,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', sportRank.id)
            }
          }
        }
      }

      // 3. Notify owners
      for (const cat of categories) {
        for (const row of cat.rows) {
          await supabase.from('notifications').insert({
            user_id: row.ownerId,
            type: 'result_approved',
            title_el: 'Αποτελέσματα Αγώνα',
            title_en: 'Competition Results',
            message_el: `Τα αποτελέσματα για τον/την ${row.dogName} στην κατηγορία "${cat.titleEl}" έχουν εγκριθεί. ${row.passed ? `✅ Επιτυχία με ${row.score} πόντους!` : '❌ Αποτυχία.'}${row.willGetTitle ? ` 🏅 Νέος τίτλος: ${row.nextLevel}!` : ''}`,
            message_en: `Results for ${row.dogName} in "${cat.titleEl}" have been approved. ${row.passed ? `✅ Pass with ${row.score} points!` : '❌ Fail.'}${row.willGetTitle ? ` 🏅 New title: ${row.nextLevel}!` : ''}`,
            metadata: { event_id: id, dog_id: row.dogId, category_id: cat.categoryId },
          })
        }
      }

      // 4. Lock event
      await supabase.from('events').update({ status: 'results_approved' }).eq('id', id)

      setAlreadyApproved(true)
      setApproveMsg({ type: 'success', text: t('Όλα τα αποτελέσματα εγκρίθηκαν και οι κατατάξεις ενημερώθηκαν!', 'All results approved and rankings updated!') })
    } catch (err) {
      console.error(err)
      setApproveMsg({ type: 'error', text: t('Σφάλμα κατά την έγκριση', 'Error during approval') })
    }

    setApproving(false)
  }

  if (loading) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )

  const cardStyle: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' }
  const inputStyle: React.CSSProperties = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', fontSize: '1rem', fontFamily: 'Bebas Neue, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }

  const totalDogs = categories.reduce((sum, cat) => sum + cat.rows.length, 0)
  const titleAlerts = categories.reduce((sum, cat) => sum + cat.rows.filter(r => r.willGetTitle).length, 0)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '650px', margin: '0 auto', padding: '0 1.5rem' }}>
        <button onClick={() => router.push(`/events/${id}`)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', marginBottom: '1.5rem', padding: 0 }}>←</button>

        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem', letterSpacing: '0.05em', color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
          ✅ {t('Έγκριση Αποτελεσμάτων', 'Approve Results')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {t(event?.title_el, event?.title_en || event?.title_el)}
        </p>

        {/* Summary counters */}
        {totalDogs > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { value: totalDogs, label: t('Σκύλοι', 'Dogs'), color: 'var(--accent)' },
              { value: categories.reduce((s, c) => s + c.rows.filter(r => r.passed === true).length, 0), label: 'Pass', color: '#7ef7a0' },
              { value: categories.reduce((s, c) => s + c.rows.filter(r => r.passed === false).length, 0), label: 'Fail', color: '#f77e7e' },
            ].map(({ value, label, color }) => (
              <div key={label} style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                <p style={{ margin: 0, fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.6rem', color }}>{value}</p>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{label}</p>
              </div>
            ))}
            {titleAlerts > 0 && (
              <div style={{ flex: 1, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                <p style={{ margin: 0, fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.6rem', color: 'var(--accent)' }}>{titleAlerts}</p>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--accent)' }}>🏅 {t('Νέοι Τίτλοι', 'New Titles')}</p>
              </div>
            )}
          </div>
        )}

        {categories.length === 0 && (
          <div style={cardStyle}>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: 0, fontSize: '0.9rem' }}>
              {t('Δεν έχουν υποβληθεί αποτελέσματα ακόμα', 'No results submitted yet')}
            </p>
          </div>
        )}

        {categories.map((cat, catIndex) => (
          <div key={cat.categoryId} style={cardStyle}>
            <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', color: 'var(--accent)', margin: '0 0 1rem', letterSpacing: '0.04em' }}>
              {t(cat.titleEl, cat.titleEn || cat.titleEl)}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'Outfit, sans-serif', marginLeft: '0.5rem', fontWeight: 400, letterSpacing: 0 }}>
                · {cat.sportName}
                {!cat.isFoundation && <span style={{ color: '#7eb8f7', marginLeft: '0.35rem' }}>· Discipline</span>}
                {cat.isFoundation && <span style={{ color: '#a0a0ff', marginLeft: '0.35rem' }}>· {cat.isEntry ? 'Entry' : 'Basic'}</span>}
              </span>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {cat.rows.map((row, rowIndex) => (
                <div key={row.id} style={{ background: 'var(--bg)', border: `1px solid ${row.willGetTitle ? 'rgba(212,175,55,0.4)' : row.passed === true ? '#7ef7a033' : row.passed === false ? '#f77e7e33' : 'var(--border)'}`, borderRadius: '10px', padding: '0.85rem 1rem' }}>
                  <div style={{ marginBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.35rem' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          🐕 {row.dogName}
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '0.75rem' }}> · {row.dogDisplayId}</span>
                        </p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          👤 {row.ownerName} (#{row.ownerMemberId})
                        </p>
                      </div>
                      {row.willGetTitle && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '99px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.5)', color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                          🏅 {t('Νέος Τίτλος', 'New Title')}: {row.nextLevel}
                        </span>
                      )}
                    </div>
                    {/* Ranking context */}
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {cat.isFoundation ? (
                        cat.isEntry
                          ? `Entry: ${row.entryParticipations}/2 runs · ${row.entryPoints} pts${row.entryTitle ? ' · 🏅 Title earned' : ''}`
                          : `Basic: ${row.basicParticipations}/2 runs · ${row.basicPoints} pts${row.basicTitle ? ' · 🏅 Title earned' : ''}`
                      ) : (
                        <span style={{ color: '#7eb8f7' }}>
                          {t('Αγώνισμα πειθαρχίας', 'Discipline')} · {t('Συνολικοί πόντοι', 'Total points')}: {row.entryPoints}
                        </span>
                      )}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '110px' }}>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                        {t('Βαθμολογία (0-100)', 'Score (0-100)')}
                      </label>
                      <input
                        type="number" min="0" max="100" step="0.1"
                        disabled={alreadyApproved}
                        value={row.score}
                        onChange={e => updateRow(catIndex, rowIndex, 'score', e.target.value)}
                        style={{ ...inputStyle, opacity: alreadyApproved ? 0.6 : 1 }}
                        placeholder="0 — 100"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                        {t('Αποτέλεσμα', 'Result')}
                      </label>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {[{ val: true, label: '✓ Pass', active: '#7ef7a0' }, { val: false, label: '✗ Fail', active: '#f77e7e' }].map(btn => (
                          <button
                            key={String(btn.val)}
                            disabled={alreadyApproved}
                            onClick={() => updateRow(catIndex, rowIndex, 'passed', btn.val)}
                            style={{ background: row.passed === btn.val ? btn.active : 'transparent', border: `1px solid ${row.passed === btn.val ? btn.active : 'var(--border)'}`, borderRadius: '8px', padding: '0.5rem 1rem', color: row.passed === btn.val ? 'var(--bg)' : 'var(--text-secondary)', cursor: alreadyApproved ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700, transition: 'all 0.15s', opacity: alreadyApproved ? 0.6 : 1 }}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {row.status === 'approved' && (
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: '#7ef7a0', fontWeight: 600 }}>✓ {t('Εγκρίθηκε', 'Approved')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {approveMsg && (
          <div style={{ background: approveMsg.type === 'success' ? 'rgba(0,200,100,0.1)' : 'rgba(220,50,50,0.1)', border: `1px solid ${approveMsg.type === 'success' ? 'rgba(0,200,100,0.3)' : 'rgba(220,50,50,0.3)'}`, borderRadius: '10px', padding: '0.85rem', marginBottom: '1rem', color: approveMsg.type === 'success' ? '#00c864' : '#dc3232', fontSize: '0.88rem', fontWeight: 600 }}>
            {approveMsg.text}
          </div>
        )}

        {categories.length > 0 && !alreadyApproved && (
          <button onClick={handleApproveAll} disabled={approving} style={{ width: '100%', background: approving ? 'var(--bg-card)' : 'var(--accent)', border: 'none', borderRadius: '12px', padding: '1rem', color: approving ? 'var(--text-secondary)' : 'var(--bg)', fontWeight: 700, cursor: approving ? 'not-allowed' : 'pointer', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.2rem', letterSpacing: '0.05em', opacity: approving ? 0.7 : 1 }}>
            {approving ? t('Επεξεργασία...', 'Processing...') : t('✅ Έγκριση Όλων των Αποτελεσμάτων', '✅ Approve All Results')}
          </button>
        )}

        {alreadyApproved && (
          <div style={{ background: 'rgba(120,120,255,0.1)', border: '1px solid #a0a0ff44', borderRadius: '12px', padding: '1rem', textAlign: 'center', color: '#a0a0ff', fontWeight: 700, fontSize: '0.9rem' }}>
            🔒 {t('Τα αποτελέσματα έχουν εγκριθεί και κλειδωθεί', 'Results have been approved and locked')}
          </div>
        )}
      </div>
    </main>
  )
}
