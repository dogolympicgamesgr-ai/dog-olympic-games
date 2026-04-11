'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import ProfileCircle from '@/components/dashboard/ProfileCircle'
import RoleBadges from '@/components/dashboard/RoleBadges'
import TeamBadge from '@/components/dashboard/TeamBadge'
import DogCircles from '@/components/dashboard/DogCircles'
import StatsCircles from '@/components/dashboard/StatsCircles'
import EventsList from '@/components/dashboard/EventsList'

export default function PublicProfilePage() {
  const { t } = useLang()
  const { member_id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [roles, setRoles] = useState<string[]>([])
  const [team, setTeam] = useState<any>(null)
  const [dogs, setDogs] = useState<any[]>([])
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (member_id) loadProfile(member_id as string)
  }, [member_id])

  async function loadProfile(memberId: string) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('member_id', memberId)
      .single()

    if (!prof) { router.push('/'); return }

    if (!prof.profile_public) {
      setProfile({ ...prof, private: true })
      setLoading(false)
      return
    }

    const [rolesRes, teamRes, dogsRes, resultsRes] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', prof.id),
      supabase.from('team_members').select('*, teams(*)').eq('user_id', prof.id).eq('status', 'accepted').maybeSingle(),
      supabase.from('dogs').select('*').eq('owner_id', prof.id).eq('status', 'active'),
      supabase.from('competition_results').select('*, events(*), dogs(name)').eq('owner_id', prof.id).eq('status', 'approved').order('created_at', { ascending: false }),
    ])

    setProfile(prof)
    const allRoles = rolesRes.data?.map((r: any) => r.role) || []
    setIsAdmin(allRoles.includes('admin'))
    setRoles(allRoles.filter((r: string) => r !== 'participant' && r !== 'admin'))
    setTeam(teamRes.data?.teams || null)
    setDogs(dogsRes.data || [])
    setResults(resultsRes.data || [])
    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem', letterSpacing: '0.1em' }}>
        {t('Φόρτωση...', 'Loading...')}
      </div>
    </div>
  )

  if (profile?.private) return (
    <main style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</p>
        <p style={{ fontSize: '1.1rem' }}>{t('Αυτό το προφίλ είναι ιδιωτικό', 'This profile is private')}</p>
      </div>
    </main>
  )

  const isTeamLeader = team && team.created_by === profile?.id

  return (
    <main style={{ minHeight: '90vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
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
            Member ID: {profile?.member_id}
          </p>
          {(profile?.display_email || profile?.email) && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
              {profile?.display_email || profile?.email}
            </p>
          )}
          {profile?.show_phone && profile?.phone && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{profile.phone}</p>
          )}
          {profile?.city && profile?.country && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {profile.city}, {profile.country}
            </p>
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
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <TeamBadge team={team} isLeader={isTeamLeader} />
          </div>
          <div style={{
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '220px',
          }}>
            <RoleBadges roles={roles} />
            <ProfileCircle profile={profile} readOnly />
            <DogCircles dogs={dogs} />
          </div>
          <div />
        </div>

        {/* Mobile layout */}
        <div className="circles-mobile" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <ProfileCircle profile={profile} readOnly />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <TeamBadge team={team} isLeader={isTeamLeader} />
            <RoleBadges roles={roles} />
            <DogCircles dogs={dogs} />
          </div>
        </div>

        <StatsCircles dogCount={dogs.length} eventCount={results.length} dogs={dogs} results={results} />
        <EventsList results={results} profile={profile} />
      </div>

      <style>{`
        .circles-desktop { display: grid !important; }
        .circles-mobile { display: none !important; }
        @media (max-width: 600px) {
          .circles-desktop { display: none !important; }
          .circles-mobile { display: block !important; }
        }
      `}</style>
    </main>
  )
}