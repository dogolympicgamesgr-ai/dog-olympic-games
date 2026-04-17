'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import RoleProfilePage, { RoleEvent, SportStat } from '@/components/RoleProfilePage'

export default function OrganizerPage() {
  const { member_id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<any>(null)
  const [totalEvents, setTotalEvents] = useState(0)
  const [sportStats, setSportStats] = useState<SportStat[]>([])
  const [events, setEvents] = useState<RoleEvent[]>([])
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

    if (!prof) { router.push('/organizers'); return }

    const { data: roleCheck } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', prof.id)
      .eq('role', 'organizer')
      .maybeSingle()

    if (!roleCheck) { router.push('/organizers'); return }

    setProfile(prof)

    // Get completed events created by this organizer with categories + sports
    const { data: eventsData } = await supabase
      .from('events')
      .select(`
        id, title_el, title_en, event_date, location, status,
        event_categories(sports(name_el, name_en))
      `)
      .eq('created_by', prof.id)
      .eq('status', 'completed')
      .order('event_date', { ascending: false })

    if (!eventsData) { setLoading(false); return }

    setTotalEvents(eventsData.length)

    // Sport breakdown
    const sportMap: Record<string, { name_el: string; name_en: string; count: number }> = {}
    for (const ev of eventsData) {
      const cats = ev.event_categories as any[]
      for (const cat of (cats || [])) {
        const sport = cat?.sports
        if (!sport) continue
        const key = sport.name_el
        if (!sportMap[key]) sportMap[key] = { name_el: sport.name_el, name_en: sport.name_en, count: 0 }
        sportMap[key].count++
      }
    }
    setSportStats(Object.values(sportMap).sort((a, b) => b.count - a.count))

    setEvents(eventsData.map(ev => ({
      id: ev.id,
      title_el: ev.title_el,
      title_en: ev.title_en,
      event_date: ev.event_date,
      location: ev.location,
    })))

    setLoading(false)
  }

  if (!profile && !loading) return null

  return (
    <RoleProfilePage
      role="organizer"
      profile={profile || {}}
      totalEvents={totalEvents}
      sportStats={sportStats}
      events={events}
      loading={loading}
    />
  )
}
