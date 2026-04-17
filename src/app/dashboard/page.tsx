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

  const displayRoles = roles.filter(r => r !== 'participant' && r !== 'admin')
  const isAdmin = roles.includes('admin')
  const isTeamLeader = team && team.created_by === profile?.id

  return (
    <div style={{ minHeight: '90vh', padding: '2rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
      <DashboardDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* No-show warning banner */}
      {profile?.no_show_count > 0 && (
        <div style={{
          background: 'rgba(247,126,126,0.1)',
          border: '1px solid #f77e7e44',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>⚠️</span>
          <p style={{ margin: 0, color: '#f77e7e', fontSize: '0.88rem', fontWeight: 600 }}>
            {t(
              `Έχεις ${profile.no_show_count} καταγεγραμμένη απουσία${profile.no_show_count > 1 ? 'ες' : ''} από αγώνες. Παρακαλούμε να ακυρώνεις έγκαιρα αν δεν μπορείς να παραστείς.`,
              `You have ${profile.no_show_count} recorded no-show${profile.no_show_count > 1 ? 's' : ''} from events. Please cancel in advance if you cannot attend.`
            )}
          </p>
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', paddingTop: '1rem' }}>
        <h1 style={{
          fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
          fontFamily: 'Bebas Neue, sans-serif',
          letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '0.25rem',
        }}>
          {profile?.full_name || t('Χρήστης', 'User')}
        </h1>
        {isAdmin && (
          <p style={{ color: '#f77e7e', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            ● Admin
          </p>
        )}
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
          Member ID: {profile?.member_id || '—'}
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
          {profile?.display_email || profile?.email}
        </p>
        {profile?.show_phone && profile?.phone && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{profile.phone}</p>
        )}
      </div>

      {/* Circle layout — desktop */}
      <div className="circles-desktop" style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr 120px',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2.5rem',
        minHeight: '220px',
      }}>
        {/* Left — team */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <TeamBadge team={team} isLeader={isTeamLeader} />
        </div>

        {/* Center — profile + role arc */}
        <div style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '220px',
        }}>
          <RoleBadges roles={displayRoles} />
          <ProfileCircle profile={profile} onUpload={() => loadDashboard()} />
          <DogCircles dogs={dogs} />
        </div>

        {/* Right — spacer (dogs are absolutely positioned in center) */}
        <div />
      </div>

      {/* Mobile layout */}
      <div className="circles-mobile" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <ProfileCircle profile={profile} onUpload={() => loadDashboard()} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <TeamBadge team={team} isLeader={isTeamLeader} />
          <RoleBadges roles={displayRoles} />
          <DogCircles dogs={dogs} />
        </div>
      </div>

      <StatsCircles dogCount={dogs.length} eventCount={results.length} dogs={dogs} results={results} />
      <EventsList results={results} profile={profile} />

      <style>{`
        .circles-desktop { display: grid !important; }
        .circles-mobile { display: none !important; }
        @media (max-width: 600px) {
          .circles-desktop { display: none !important; }
          .circles-mobile { display: block !important; }
        }
      `}</style>
    </div>
  )
}