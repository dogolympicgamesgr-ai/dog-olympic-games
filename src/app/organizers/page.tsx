'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'

interface RoleMember {
  member_id: string
  full_name: string
  avatar_url?: string
  total_events: number
}

const ROLE_COLOR = '#7ef7a0'

export default function OrganizersPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()
  const [members, setMembers] = useState<RoleMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'organizer')

    if (!roles?.length) { setLoading(false); return }

    const userIds = roles.map(r => r.user_id)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, member_id, avatar_url')
      .in('id', userIds)
      .eq('status', 'active')

    if (!profiles?.length) { setLoading(false); return }

    const result: RoleMember[] = await Promise.all(
      profiles.map(async (p) => {
        const { count } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', p.id)
          .eq('status', 'completed')
        return {
          member_id: p.member_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          total_events: count || 0,
        }
      })
    )

    result.sort((a, b) => b.total_events - a.total_events)
    setMembers(result)
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <p style={{ color: ROLE_COLOR, fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            📋 {t('Κοινότητα', 'Community')}
          </p>
          <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '0.05em', color: 'var(--text-primary)', margin: 0 }}>
            {t('ΔΙΟΡΓΑΝΩΤΕΣ', 'ORGANIZERS')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.5rem' }}>
            {t('Γνωρίστε τους διοργανωτές των αγώνων.', 'Meet the organizers of the games.')}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
            {t('Φόρτωση...', 'Loading...')}
          </div>
        ) : members.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {t('Δεν υπάρχουν διοργανωτές ακόμα.', 'No organizers yet.')}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
            {members.map(m => (
              <div
                key={m.member_id}
                onClick={() => router.push(`/organizers/${m.member_id}`)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '1.5rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, transform 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = ROLE_COLOR; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
              >
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: `2px solid ${ROLE_COLOR}`, overflow: 'hidden', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {m.avatar_url
                    ? <img src={m.avatar_url} alt={m.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                    : <span style={{ fontSize: '2rem' }}>🐾</span>}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{m.full_name}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '0.15rem 0 0' }}>#{m.member_id}</p>
                </div>
                <div style={{ background: `${ROLE_COLOR}15`, border: `1px solid ${ROLE_COLOR}44`, borderRadius: '99px', padding: '0.2rem 0.85rem', textAlign: 'center' }}>
                  <span style={{ color: ROLE_COLOR, fontSize: '0.78rem', fontWeight: 700 }}>
                    {m.total_events} {t('αγώνες', 'events')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}