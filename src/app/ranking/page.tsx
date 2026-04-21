'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'

const DISCIPLINE_SPORTS = [
  { id: '7fb8f0e4-b196-4bbf-adfc-a242388834a2', name_en: 'Obedience', name_el: 'Υπακοή', icon: '🎯' },
  { id: '8b541fbf-5677-4511-8c30-cb0b45285352', name_en: 'Protection', name_el: 'Προστασία', icon: '🛡️' },
  { id: '6d4d3351-b297-4fcf-8eb1-53f01abc2ded', name_en: 'Detection', name_el: 'Ανίχνευση', icon: '🔍' },
  { id: '28b101f4-c34d-48d9-a003-c47ea51009e9', name_en: 'Agility', name_el: 'Ευκινησία', icon: '⚡' },
]

type MainTab = 'foundation' | 'discipline'
type FoundationTab = 'entry' | 'basic'

export default function RankingPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()

  const [mainTab, setMainTab] = useState<MainTab>('foundation')
  const [foundationTab, setFoundationTab] = useState<FoundationTab>('entry')
  const [disciplineSport, setDisciplineSport] = useState(DISCIPLINE_SPORTS[0].id)

  const [foundationData, setFoundationData] = useState<any[]>([])
  const [disciplineData, setDisciplineData] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)

    const [foundationRes, disciplineRes] = await Promise.all([
      supabase
        .from('foundation_ranking')
        .select(`
          dog_id, entry_participations, entry_title, entry_points,
          basic_participations, basic_title, basic_points,
         dogs!ranking_dog_id_fkey(id, name, dog_id, breeds(name)),
         profiles!ranking_owner_id_fkey(id, full_name, member_id, avatar_url)
        `)
        .or('entry_participations.gt.0,entry_title.eq.true,basic_participations.gt.0,basic_title.eq.true'),
      supabase
        .from('dog_sport_ranking')
        .select(`
          dog_id, sport_id, current_sublevel, participations, title, total_points,
          dogs!dog_sport_ranking_dog_id_fkey(id, name, dog_id, breeds(name)),
          profiles!dog_sport_ranking_owner_id_fkey(id, full_name, member_id, avatar_url)
        `)
        .or('participations.gt.0,title.eq.true'),
    ])

    setFoundationData(foundationRes.data || [])

    // Group discipline by sport_id
    const grouped: Record<string, any[]> = {}
    for (const sport of DISCIPLINE_SPORTS) grouped[sport.id] = []
    for (const row of (disciplineRes.data || [])) {
      if (grouped[row.sport_id]) grouped[row.sport_id].push(row)
    }
    // Sort each sport: sublevel desc, then points desc
    for (const sportId of Object.keys(grouped)) {
      grouped[sportId].sort((a, b) =>
        b.current_sublevel !== a.current_sublevel
          ? b.current_sublevel - a.current_sublevel
          : b.total_points - a.total_points
      )
    }
    setDisciplineData(grouped)
    setLoading(false)
  }

  const entryRanking = [...foundationData]
    .filter(r => r.entry_participations > 0 || r.entry_title)
    .sort((a, b) => {
      if (a.entry_title !== b.entry_title) return a.entry_title ? -1 : 1
      return b.entry_points - a.entry_points
    })

  const basicRanking = [...foundationData]
    .filter(r => r.basic_participations > 0 || r.basic_title)
    .sort((a, b) => {
      if (a.basic_title !== b.basic_title) return a.basic_title ? -1 : 1
      return b.basic_points - a.basic_points
    })

  const currentDiscipline = DISCIPLINE_SPORTS.find(s => s.id === disciplineSport)!
  const currentDisciplineRanking = disciplineData[disciplineSport] || []

  const tabBtn = (active: boolean, onClick: () => void, children: React.ReactNode) => (
    <button
      onClick={onClick}
      style={{ background: active ? 'var(--accent)' : 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 1.25rem', color: active ? 'var(--bg)' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: active ? 700 : 400, fontSize: '0.88rem', whiteSpace: 'nowrap' as const }}
    >
      {children}
    </button>
  )

  const rankRow = (rank: number, dog: any, owner: any, badge: React.ReactNode, sub: React.ReactNode) => (
    <div
      key={dog?.id}
      onClick={() => router.push(`/dogs/${dog?.id}`)}
      style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Rank number */}
      <div style={{ width: '32px', textAlign: 'center', flexShrink: 0 }}>
        {rank <= 3 ? (
          <span style={{ fontSize: '1.2rem' }}>{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</span>
        ) : (
          <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: 'var(--text-secondary)' }}>{rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
       {dog?.photo_url ? <img src={dog.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🐕'}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {dog?.name}
        </p>
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {owner?.full_name} · #{owner?.member_id}
        </p>
        <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
          {dog?.breeds?.name || '—'} · {dog?.dog_id}
        </p>
        {sub}
      </div>

      {/* Badge */}
      <div style={{ flexShrink: 0, textAlign: 'right' }}>{badge}</div>
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1.5rem' }}>

        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.5rem', letterSpacing: '0.05em', color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
          📊 {t('Κατάταξη', 'Ranking')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          {t('Επίσημη κατάταξη αθλητών και σκύλων', 'Official athlete and dog rankings')}
        </p>

        {/* Main tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {tabBtn(mainTab === 'foundation', () => setMainTab('foundation'), `⭐ ${t('Θεμέλια', 'Foundation')}`)}
          {tabBtn(mainTab === 'discipline', () => setMainTab('discipline'), `🏅 ${t('Αγωνίσματα', 'Disciplines')}`)}
        </div>

        {/* ── FOUNDATION ── */}
        {mainTab === 'foundation' && (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {tabBtn(foundationTab === 'entry', () => setFoundationTab('entry'), `⭐ ${t('Εισαγωγικό', 'Entry Level')}`)}
              {tabBtn(foundationTab === 'basic', () => setFoundationTab('basic'), `⭐⭐ ${t('Βασικό', 'Basic Level')}`)}
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              {(foundationTab === 'entry' ? entryRanking : basicRanking).length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem', fontSize: '0.88rem', margin: 0 }}>
                  {t('Δεν υπάρχουν εγγραφές ακόμα', 'No entries yet')}
                </p>
              ) : (
                (foundationTab === 'entry' ? entryRanking : basicRanking).map((r, i) => {
                  const isEntry = foundationTab === 'entry'
                  const hasTitle = isEntry ? r.entry_title : r.basic_title
                  const participations = isEntry ? r.entry_participations : r.basic_participations
                  const points = isEntry ? r.entry_points : r.basic_points

                  const badge = (
                    <div>
                      {hasTitle ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '99px', background: 'rgba(212,175,55,0.15)', border: '1px solid var(--accent)', color: 'var(--accent)', display: 'block', marginBottom: '0.2rem', whiteSpace: 'nowrap' }}>
                          🏅 {t('Τίτλος', 'Title')}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem', whiteSpace: 'nowrap' }}>
                          {participations}/2 {t('αγώνες', 'runs')}
                        </span>
                      )}
                      <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: 'var(--accent)', display: 'block', textAlign: 'right' }}>
                        {points} pts
                      </span>
                    </div>
                  )

                  const sub = hasTitle ? null : (
                    <div style={{ marginTop: '0.2rem', height: '4px', background: 'var(--border)', borderRadius: '2px', maxWidth: '80px' }}>
                      <div style={{ width: `${(participations / 2) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: '2px', transition: 'width 0.3s' }} />
                    </div>
                  )

                  return rankRow(i + 1, r.dogs, r.profiles, badge, sub)
                })
              )}
            </div>
          </>
        )}

        {/* ── DISCIPLINES ── */}
        {mainTab === 'discipline' && (
          <>
            {/* Sport selector */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {DISCIPLINE_SPORTS.map(sport => tabBtn(
                disciplineSport === sport.id,
                () => setDisciplineSport(sport.id),
                `${sport.icon} ${t(sport.name_el, sport.name_en)}`
              ))}
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{currentDiscipline.icon}</span>
                <p style={{ margin: 0, fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.95rem', color: 'var(--accent)', letterSpacing: '0.04em' }}>
                  {t(currentDiscipline.name_el, currentDiscipline.name_en)}
                </p>
              </div>

              {currentDisciplineRanking.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem', fontSize: '0.88rem', margin: 0 }}>
                  {t('Δεν υπάρχουν εγγραφές ακόμα', 'No entries yet')}
                </p>
              ) : (
                currentDisciplineRanking.map((r, i) => {
                  const badge = (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '99px', background: r.title ? 'rgba(212,175,55,0.15)' : 'var(--bg)', border: `1px solid ${r.title ? 'var(--accent)' : 'var(--border)'}`, color: r.title ? 'var(--accent)' : '#7eb8f7', display: 'block', marginBottom: '0.2rem', whiteSpace: 'nowrap' }}>
                        {r.title ? `🏅 ${t('Τίτλος', 'Title')}` : `${t('Επίπεδο', 'Level')} ${r.current_sublevel}`}
                      </span>
                      <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: 'var(--accent)', display: 'block' }}>
                        {r.total_points} pts
                      </span>
                    </div>
                  )

                  const sub = !r.title ? (
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.68rem', color: '#7eb8f7' }}>
                      {t('Επίπεδο', 'Level')} {r.current_sublevel} · {r.participations}/2 {t('αγώνες', 'runs')}
                    </p>
                  ) : null

                  return rankRow(i + 1, r.dogs, r.profiles, badge, sub)
                })
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
