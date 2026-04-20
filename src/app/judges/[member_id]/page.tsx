'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import RoleProfilePage, { RoleEvent, SportStat, JudgeQualification } from '@/components/RoleProfilePage'

export default function JudgePage() {
  const { member_id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<any>(null)
  const [totalEvents, setTotalEvents] = useState(0)
  const [sportStats, setSportStats] = useState<SportStat[]>([])
  const [events, setEvents] = useState<RoleEvent[]>([])
  const [qualifications, setQualifications] = useState<JudgeQualification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (member_id) load(member_id as string)
  }, [member_id])

  async function load(memberId: string) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, full_name, member_id, email, display_email, phone, show_phone, avatar_url')
      .eq('member_id', memberId)
      .single()

    if (!prof) { router.push('/judges'); return }

    const { data: roleCheck } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', prof.id)
      .eq('role', 'judge')
      .maybeSingle()

    if (!roleCheck) { router.push('/judges'); return }

    setProfile(prof)

    // Fetch assignments, qualifications in parallel
    const [assignRes, qualRes] = await Promise.all([
      supabase
        .from('event_assignments')
        .select(`
          event_id,
          event_categories(sports(name_el, name_en)),
          events(id, title_el, title_en, event_date, location, status)
        `)
        .eq('user_id', prof.id)
        .eq('role', 'judge')
        .eq('status', 'accepted'),
      supabase
        .from('judge_qualifications')
        .select('sport_id, max_sublevel, sports(id, name_el, name_en, is_foundation)')
        .eq('judge_user_id', prof.id)
    ])

    // ── Qualifications ──
    const quals: JudgeQualification[] = (qualRes.data || []).map((q: any) => ({
      sport_id: q.sport_id,
      sport_name_el: q.sports?.name_el || '',
      sport_name_en: q.sports?.name_en || '',
      is_foundation: q.sports?.is_foundation ?? true,
      max_sublevel: q.max_sublevel ?? null,
    }))
    // Foundation first, then disciplines sorted by name
    quals.sort((a, b) => {
      if (a.is_foundation !== b.is_foundation) return a.is_foundation ? -1 : 1
      return a.sport_name_el.localeCompare(b.sport_name_el)
    })
    setQualifications(quals)

    const assignments = assignRes.data
    if (!assignments) { setLoading(false); return }

    // ── Total events (distinct) ──
    const distinctEventIds = [...new Set(assignments.map((a: any) => a.event_id))]
    setTotalEvents(distinctEventIds.length)

    // ── Sport breakdown ──
    const sportMap: Record<string, SportStat> = {}
    for (const a of assignments) {
      const sport = (a.event_categories as any)?.sports
      if (!sport) continue
      const key = sport.name_el
      if (!sportMap[key]) sportMap[key] = { sport_name_el: sport.name_el, sport_name_en: sport.name_en, count: 0 }
      sportMap[key].count++
    }
    setSportStats(Object.values(sportMap).sort((a, b) => b.count - a.count))

    // ── Event list — completed or results_approved ──
    const seenIds = new Set<string>()
    const eventList: RoleEvent[] = []
    for (const a of assignments) {
      const ev = a.events as any
      if (!ev || seenIds.has(ev.id)) continue
      if (ev.status !== 'completed' && ev.status !== 'results_approved') continue
      seenIds.add(ev.id)
      eventList.push({
        id: ev.id,
        title_el: ev.title_el,
        title_en: ev.title_en,
        event_date: ev.event_date,
        location: ev.location,
      })
    }
    eventList.sort((a, b) => new Date(b.event_date || 0).getTime() - new Date(a.event_date || 0).getTime())
    setEvents(eventList)
    setLoading(false)
  }

  if (!profile && !loading) return null

  return (
    <RoleProfilePage
      role="judge"
      profile={profile || {}}
      totalEvents={totalEvents}
      sportStats={sportStats}
      events={events}
      qualifications={qualifications}
      loading={loading}
    />
  )
}
