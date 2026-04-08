'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import type { User } from '@supabase/supabase-js'

const navLinks = [
  { href: '/events', el: 'Αγώνες', en: 'Events' },
  { href: '/judges', el: 'Κριτές', en: 'Judges' },
  { href: '/teams', el: 'Ομάδες', en: 'Teams' },
  { href: '/seminars', el: 'Σεμινάρια', en: 'Seminars' },
  { href: '/ranking', el: 'Κατάταξη', en: 'Ranking' },
]

export default function Navbar() {
  const { lang, setLang, t } = useLang()
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isDashboard = pathname === '/dashboard'

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle()
        setIsAdmin(!!data)
      }
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle()
        setIsAdmin(!!data)
      } else {
        setIsAdmin(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 'var(--nav-height)',
      background: 'rgba(10,15,30,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      zIndex: 1000,
      display: 'flex', alignItems: 'center',
      padding: '0 1.5rem',
      justifyContent: 'space-between',
    }}>

      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {isDashboard && user && (
          <button
            onClick={() => window.dispatchEvent(new Event('open-dashboard-drawer'))}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-primary)', cursor: 'pointer',
              fontSize: '1.3rem', padding: '0.2rem 0.4rem',
              borderRadius: '6px',
            }}
          >☰</button>
        )}
        <Link href="/" style={{
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: '1.5rem', letterSpacing: '0.06em',
          color: 'var(--accent)', textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1.6rem' }}>🐾</span>
          <span className="logo-text">DOG OLYMPIC GAMES</span>
        </Link>
      </div>

      {/* Center */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="desktop-nav">
        {navLinks.map(link => (
          <Link key={link.href} href={link.href} style={{
            padding: '0.4rem 0.85rem', borderRadius: '6px',
            fontSize: '0.85rem', fontWeight: 500,
            color: pathname === link.href ? 'var(--accent)' : 'var(--text-secondary)',
            textDecoration: 'none', transition: 'color 0.2s', letterSpacing: '0.02em',
          }}>
            {t(link.el, link.en)}
          </Link>
        ))}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={() => setLang(lang === 'el' ? 'en' : 'el')}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '6px', padding: '0.3rem 0.65rem',
            color: 'var(--text-secondary)', fontSize: '0.78rem',
            fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em',
          }}
        >
          {lang === 'el' ? 'EN' : 'ΕΛ'}
        </button>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isAdmin && (
              <Link href="/admin" style={{
                color: '#f77e7e', textDecoration: 'none',
                fontSize: '0.82rem', fontWeight: 700,
                border: '1px solid #f77e7e33',
                borderRadius: '6px', padding: '0.3rem 0.65rem',
              }}>
                Admin
              </Link>
            )}
            <Link href="/dashboard" style={{
              color: 'var(--accent)', textDecoration: 'none',
              fontSize: '0.85rem', fontWeight: 600,
            }}>
              {user.user_metadata?.full_name?.split(' ')[0] || t('Προφίλ', 'Profile')}
            </Link>
            <button onClick={handleLogout} style={{
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: '6px', padding: '0.4rem 1rem',
              color: 'var(--text-secondary)', fontSize: '0.85rem',
              fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
            }}>
              {t('Έξοδος', 'Logout')}
            </button>
          </div>
        ) : (
          <button onClick={handleLogin} style={{
            background: 'var(--accent)', border: 'none', borderRadius: '6px',
            padding: '0.4rem 1rem', color: 'var(--bg)', fontSize: '0.85rem',
            fontWeight: 700, cursor: 'pointer', letterSpacing: '0.03em',
            fontFamily: 'Outfit, sans-serif',
          }}>
            {t('Σύνδεση', 'Login')}
          </button>
        )}

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="hamburger"
          style={{
            background: 'none', border: 'none', color: 'var(--text-primary)',
            cursor: 'pointer', fontSize: '1.4rem', display: 'none', padding: '0.2rem',
          }}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          position: 'absolute', top: 'var(--nav-height)', left: 0, right: 0,
          background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
          padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}>
          {navLinks.map(link => (
            <Link key={link.href} href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '0.65rem 0', borderBottom: '1px solid var(--border)',
                color: pathname === link.href ? 'var(--accent)' : 'var(--text-primary)',
                textDecoration: 'none', fontSize: '1rem', fontWeight: 500,
              }}>
              {t(link.el, link.en)}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: block !important; }
          .logo-text { display: none; }
        }
      `}</style>
    </nav>
  )
}
