'use client'

import { useEffect, useState } from 'react'
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
    loadDashboard()
  }, [])

  async function loadDashboard() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const [profileRes, rolesRes, teamMemberRes, dogsRes, resultsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_roles').select('role').eq('user_id', user.id),
      supabase.from('team_members').select('*, teams(*)').eq('user_id', user.id).eq('status', 'accepted').maybeSingle(),
      supabase.from('dogs').select('*').eq('owner_id', user.id),
      supabase.from('competition_results').select('*, events(*), dogs(name)').eq('owner_id', user.id).eq('status', 'approved').order('created_at', { ascending: false }),
    ])

    console.log('profileRes:', profileRes)
    console.log('rolesRes:', rolesRes)
    console.log('teamMemberRes:', teamMemberRes)
    console.log('dogsRes:', dogsRes)
    console.log('resultsRes:', resultsRes)

    setProfile(profileRes.data)
    setRoles(rolesRes.data?.map((r: any) => r.role) || [])
    setTeam(teamMemberRes.data?.teams || null)
    setDogs(dogsRes.data || [])
    setResults(resultsRes.data || [])
    setLoading(false)
  } catch (err) {
    console.error('loadDashboard error:', err)
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

      {/* Drawer */}
      <DashboardDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRefresh={loadDashboard}
        profile={profile}
        dogs={dogs}
        team={team}
      />

      {/* Top — User Info */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', paddingTop: '1rem' }}>
        <h1 style={{
          fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
          fontFamily: 'Bebas Neue, sans-serif',
          letterSpacing: '0.05em',
          color: 'var(--text-primary)',
          marginBottom: '0.25rem',
        }}>
          {profile?.full_name || t('Χρήστης', 'User')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
          Member ID: {profile?.member_id || '—'}
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
          {profile?.email}
        </p>
        {profile?.show_phone && profile?.phone && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {profile.phone}
          </p>
        )}
      </div>

      {/* Middle Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr 1fr',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2.5rem',
      }} className="dashboard-middle">

        {/* Left — Team */}
        <TeamBadge team={team} isLeader={isTeamLeader} />

        {/* Center — Profile picture + role badges */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RoleBadges roles={displayRoles} isTeamLeader={isTeamLeader} />
          <ProfileCircle
            profile={profile}
            onUpload={loadDashboard}
          />
        </div>

        {/* Right — Dogs */}
        <DogCircles dogs={dogs} />
      </div>

      {/* Stats Row */}
      <StatsCircles
        dogCount={dogs.length}
        eventCount={results.length}
        dogs={dogs}
        results={results}
      />

      {/* Events List */}
      <EventsList results={results} profile={profile} />

      <style>{`
        @media (max-width: 600px) {
          .dashboard-middle {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
