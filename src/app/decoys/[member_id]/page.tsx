'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import RoleProfilePage, { RoleEvent } from '@/components/RoleProfilePage'

export default function DecoyPage() {
  const { member_id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<any>(null)
  const [totalEvents, setTotalEvents] = useState(0)
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

    if (!prof) { router.push('/decoys'); return }

    const { data: roleCheck } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', prof.id)
      .eq('role', 'decoy')
      .maybeSingle()

    if (!roleCheck) { router.push('/decoys'); return }

    setProfile(prof)

    // Get accepted decoy assignments
    const { data: assignments } = await supabase
      .from('event_assignments')
      .select('event_id, events(id, title_el, title_en, event_date, location, status)')
      .eq('user_id', prof.id)
      .eq('role', 'decoy')
      .eq('status', 'accepted')

    if (!assignments) { setLoading(false); return }

    const seenIds = new Set<string>()
    const eventList: RoleEvent[] = []
    for (const a of assignments) {
      const ev = a.events as any
      if (!ev || seenIds.has(ev.id)) continue
      if (ev.status !== 'completed' && ev.status !== 'results_approved') continue
      seenIds.add(ev.id)
      eventList.push({ id: ev.id, title_el: ev.title_el, title_en: ev.title_en, event_date: ev.event_date, location: ev.location })
    }
    eventList.sort((a, b) => new Date(b.event_date || 0).getTime() - new Date(a.event_date || 0).getTime())

    setTotalEvents(eventList.length)
    setEvents(eventList)
    setLoading(false)
  }

  if (!profile && !loading) return null

  return (
    <RoleProfilePage
      role="decoy"
      profile={profile || {}}
      totalEvents={totalEvents}
      sportStats={[]}
      events={events}
      loading={loading}
    />
  )
}
