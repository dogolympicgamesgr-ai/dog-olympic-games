'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import DashboardDrawer from '@/components/dashboard/DashboardDrawer'
import ProfileCircle from '@/components/dashboard/ProfileCircle'
import RoleBadges from '@/components/dashboard/RoleBadges'
import TeamBadge from '@/components/dashboard/TeamBadge'
import DogCircles from '@/components/dashboard/DogCircles'
import StatsCircles from '@/components/dashboard/StatsCircles'
import EventsList from '@/components/dashboard/EventsList'

export default function DashboardPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const loadedRef = useRef(false)

  useEffect(() => {
    const handler = () => setDrawerOpen(true)
    window.addEventListener('open-dashboard-drawer', handler)
    return () => window.removeEventListener('open-dashboard-drawer', handler)
  }, [])

  const [profile, setProfile] = useState<any>(null)
  const [roles, setRoles] = useState<string[]>([])
  const [team, setTeam] = useState<any>(null)
  const [dogs, setDogs] = useState<any[]>([])
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

useEffect(() => {
  async function init() {
    try {
      const res = await fetch('/auth/session')
      const { user } = await res.json()
      if (!user) { setLoading(false); router.push('/'); return }
      await loadDashboard(user.id)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }
  init()

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') router.push('/')
    if (event === 'SIGNED_IN') init()
  })
  return () => subscription.unsubscribe()
}, [])

  async function loadDashboard(userId?: string) {
    try {
      let uid = userId
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/'); return }
        uid = user.id
      }

      const [profileRes, rolesRes, teamMemberRes, dogsRes, resultsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('user_roles').select('role').eq('user_id', uid),
        supabase.from('team_members').select('*, teams(*)').eq('user_id', uid).eq('status', 'accepted').maybeSingle(),
        supabase.from('dogs').select('*').eq('owner_id', uid),
        supabase.from('competition_results').select('*, events(*), dogs(name)').eq('owner_id', uid).eq('status', 'approved').order('created_at', { ascending: false }),
      ])

      setProfile(profileRes.data)
      setRoles(rolesRes.data?.map((r: any) => r.role) || [])
      setTeam(teamMemberRes.data?.teams || null)
      setDogs(dogsRes.data || [])
      setResults(resultsRes.data || [])
    } catch (err) {
      console.error('loadDashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem', letterSpacing: '0.1em' }}>
        {t('Φόρτωση...', 'Loading...')}
      </div>
    </div>
  )

  const displayRoles = roles.filter(r => r !== 'participant')
  const isTeamLeader = team && team.created_by === profile?.id

  return (
    <div style={{ minHeight: '90vh', padding: '2rem 1rem', maxWidth: '900px', margin: '0 auto', position: 'relative' }}>
      <DashboardDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRefresh={() => loadDashboard()}
        profile={profile}
        dogs={dogs}
        team={team}
      />
      <div style={{ textAlign: 'center', marginBottom: '2rem', paddingTop: '1rem' }}>
        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          {profile?.full_name || t('Χρήστης', 'User')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
          Member ID: {profile?.member_id || '—'}
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
          {profile?.email}
        </p>
        {profile?.show_phone && profile?.phone && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{profile.phone}</p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }} className="dashboard-middle">
        <TeamBadge team={team} isLeader={isTeamLeader} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RoleBadges roles={displayRoles} isTeamLeader={isTeamLeader} />
          <ProfileCircle profile={profile} onUpload={() => loadDashboard()} />
        </div>
        <DogCircles dogs={dogs} />
      </div>

      <StatsCircles dogCount={dogs.length} eventCount={results.length} dogs={dogs} results={results} />
      <EventsList results={results} profile={profile} />

      <style>{`
        @media (max-width: 600px) {
          .dashboard-middle { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}