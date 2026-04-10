'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AdminUsers from '@/components/admin/AdminUsers'
import AdminRoles from '@/components/admin/AdminRoles'
import AdminEvents from '@/components/admin/AdminEvents'
import AdminSeminars from '@/components/admin/AdminSeminars'
import AdminResults from '@/components/admin/AdminResults'
import AdminTeams from '@/components/admin/AdminTeams'
import AdminDogs from '@/components/admin/AdminDogs'

type Section = 'users' | 'roles' | 'events' | 'seminars' | 'results' | 'teams' | 'dogs'

const sections: { id: Section; icon: string; label: string }[] = [
  { id: 'users',    icon: '👥', label: 'Users' },
  { id: 'roles',    icon: '🎖️', label: 'Roles' },
  { id: 'events',   icon: '🏆', label: 'Events' },
  { id: 'seminars', icon: '📚', label: 'Seminars' },
  { id: 'results',  icon: '📊', label: 'Results' },
  { id: 'teams',    icon: '🛡️', label: 'Teams' },
  { id: 'dogs',     icon: '🐕', label: 'Dogs' },
]

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [checking, setChecking] = useState(true)
  const [active, setActive] = useState<Section>('users')
  const [sidebarOpen, setSidebarOpen] = useState(true)

 useEffect(() => {
  async function init() {
    try {
      const res = await fetch('/api/auth/session')
      const { user } = await res.json()
      if (!user) { router.push('/'); return }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle()
      if (!data) { router.push('/dashboard'); return }
      setChecking(false)
    } catch (err) {
      router.push('/')
    }
  }
  init()

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') router.push('/')
  })
  return () => subscription.unsubscribe()
}, [])

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>CHECKING ACCESS...</p>
    </div>
  )

  const renderSection = () => {
    switch (active) {
      case 'users':    return <AdminUsers />
      case 'roles':    return <AdminRoles />
      case 'events':   return <AdminEvents />
      case 'seminars': return <AdminSeminars />
      case 'results':  return <AdminResults />
      case 'teams':    return <AdminTeams />
      case 'dogs':     return <AdminDogs />
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', paddingTop: 'var(--nav-height)' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '200px' : '60px',
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s',
        flexShrink: 0,
        position: 'sticky', top: 'var(--nav-height)',
        height: 'calc(100vh - var(--nav-height))',
        overflow: 'hidden',
      }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
          background: 'none', border: 'none', borderBottom: '1px solid var(--border)',
          color: 'var(--text-secondary)', padding: '1rem', cursor: 'pointer',
          fontSize: '1rem', textAlign: 'right',
        }}>
          {sidebarOpen ? '◀' : '▶'}
        </button>

        {sections.map(s => (
          <button key={s.id} onClick={() => setActive(s.id)} style={{
            background: active === s.id ? 'var(--bg)' : 'none',
            border: 'none',
            borderLeft: active === s.id ? '3px solid var(--accent)' : '3px solid transparent',
            padding: '0.9rem 1rem',
            color: active === s.id ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem',
            fontSize: '0.9rem', fontWeight: active === s.id ? 600 : 400,
            fontFamily: 'Outfit, sans-serif',
            whiteSpace: 'nowrap', overflow: 'hidden',
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{s.icon}</span>
            {sidebarOpen && s.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />
        <button onClick={() => router.push('/dashboard')} style={{
          background: 'none', border: 'none', borderTop: '1px solid var(--border)',
          color: 'var(--text-secondary)', padding: '1rem', cursor: 'pointer',
          fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          whiteSpace: 'nowrap', overflow: 'hidden',
        }}>
          <span>🏠</span>{sidebarOpen && 'Back to site'}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <h1 style={{
          fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem',
          color: 'var(--accent)', letterSpacing: '0.05em', marginBottom: '1.5rem',
        }}>
          {sections.find(s => s.id === active)?.icon} {sections.find(s => s.id === active)?.label}
        </h1>
        {renderSection()}
      </div>
    </div>
  )
}