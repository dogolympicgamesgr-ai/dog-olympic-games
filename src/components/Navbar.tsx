'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import type { User } from '@supabase/supabase-js'

const aboutLinks = [
  { href: '/about',  el: 'Τι είναι το άθλημα', en: 'About the Sport' },
  { href: '/rules',  el: 'Κανονισμοί',          en: 'Rules' },
  { href: '/videos', el: 'Βίντεο',              en: 'Videos' },
  { href: '/terms',  el: 'Όροι Χρήσης',         en: 'Terms of Use' },
]

const communityLinks = [
  { href: '/events',   el: 'Αγώνες',    en: 'Events' },
  { href: '/judges',   el: 'Κριτές',    en: 'Judges' },
  { href: '/teams',    el: 'Ομάδες',    en: 'Teams' },
  { href: '/seminars', el: 'Σεμινάρια', en: 'Seminars' },
  { href: '/ranking',  el: 'Κατάταξη',  en: 'Ranking' },
]

export default function Navbar() {
  const { lang, setLang, t } = useLang()
  const [user, setUser] = useState<User | null>(null)
  const [profileName, setProfileName] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [communityOpen, setCommunityOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isDashboard = pathname === '/dashboard'

  const aboutRef = useRef<HTMLDivElement>(null)
  const communityRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (aboutRef.current && !aboutRef.current.contains(e.target as Node)) setAboutOpen(false)
      if (communityRef.current && !communityRef.current.contains(e.target as Node)) setCommunityOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [pathname])

useEffect(() => {
  async function init() {
    try {
      const res = await fetch('/auth/session')
      const { user, profile, isAdmin } = await res.json()
      if (user) {
        setUser(user)
        setProfileName(profile?.full_name || '')
        setIsAdmin(isAdmin)
      }
    } catch (err) {
      console.error('session fetch error:', err)
    }
  }
  init()

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
    const currentUser = session?.user ?? null
    setUser(currentUser)
    if (!currentUser) {
      setProfileName('')
      setIsAdmin(false)
    } else {
      // Re-fetch from server on auth change
      try {
        const res = await fetch('/auth/session')
        const { profile, isAdmin } = await res.json()
        setProfileName(profile?.full_name || '')
        setIsAdmin(isAdmin)
      } catch {}
    }
  })
  return () => subscription.unsubscribe()
}, [])

async function loadUserData(userId: string) {
  const [profileRes, adminRes] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).single(),
    supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle(),
  ])
  setProfileName(profileRes.data?.full_name || '')
  setIsAdmin(!!adminRes.data)
}

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const handleLogout = async () => {
  setUserMenuOpen(false)
  setMobileOpen(false)
  await supabase.auth.signOut()
  window.location.href = '/'
}

  const displayName = profileName || user?.email?.split('@')[0] || ''
  const firstName = displayName.split(' ')[0]

  const dropdownStyle = {
    position: 'absolute' as const,
    top: 'calc(100% + 8px)',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '0.5rem',
    minWidth: '200px',
    zIndex: 200,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  }

  const dropdownLinkStyle = (active: boolean) => ({
    display: 'block',
    padding: '0.6rem 1rem',
    borderRadius: '6px',
    color: active ? 'var(--accent)' : 'var(--text-primary)',
    textDecoration: 'none',
    fontSize: '0.88rem',
    fontWeight: active ? 600 : 400,
    background: active ? 'var(--bg)' : 'transparent',
    transition: 'background 0.15s',
    whiteSpace: 'nowrap' as const,
  })

  const navBtnStyle = (active: boolean) => ({
    background: 'none',
    border: 'none',
    padding: '0.4rem 0.75rem',
    borderRadius: '6px',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    fontSize: '0.88rem',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontFamily: 'Outfit, sans-serif',
    letterSpacing: '0.02em',
  })

  const aboutActive = aboutLinks.some(l => pathname === l.href)
  const communityActive = communityLinks.some(l => pathname === l.href)

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 'var(--nav-height)',
      background: 'rgba(10,15,30,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      zIndex: 1000,
      display: 'flex', alignItems: 'center',
      padding: '0 1.5rem',
      justifyContent: 'space-between',
      gap: '1rem',
    }}>

      {/* LEFT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {isDashboard && user && (
          <button
            onClick={() => window.dispatchEvent(new Event('open-dashboard-drawer'))}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1.2rem', padding: '0.3rem', borderRadius: '6px' }}
          >☰</button>
        )}
        <Link href="/" style={{
          fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.4rem',
          letterSpacing: '0.06em', color: 'var(--accent)',
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem',
        }}>
          <span style={{ fontSize: '1.4rem' }}>🐾</span>
          <span className="logo-text">DOG OLYMPIC GAMES</span>
        </Link>
      </div>

      {/* CENTER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="desktop-nav">
        <div ref={aboutRef} style={{ position: 'relative' }}>
          <button style={navBtnStyle(aboutActive)} onClick={() => { setAboutOpen(!aboutOpen); setCommunityOpen(false); setUserMenuOpen(false) }}>
            {t('Σχετικά', 'About')} <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>▼</span>
          </button>
          {aboutOpen && (
            <div style={dropdownStyle}>
              {aboutLinks.map(link => (
                <Link key={link.href} href={link.href} style={dropdownLinkStyle(pathname === link.href)} onClick={() => setAboutOpen(false)}>
                  {t(link.el, link.en)}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div ref={communityRef} style={{ position: 'relative' }}>
          <button style={navBtnStyle(communityActive)} onClick={() => { setCommunityOpen(!communityOpen); setAboutOpen(false); setUserMenuOpen(false) }}>
            {t('Κοινότητα', 'Community')} <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>▼</span>
          </button>
          {communityOpen && (
            <div style={dropdownStyle}>
              {communityLinks.map(link => (
                <Link key={link.href} href={link.href} style={dropdownLinkStyle(pathname === link.href)} onClick={() => setCommunityOpen(false)}>
                  {t(link.el, link.en)}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <button onClick={() => setLang(lang === 'el' ? 'en' : 'el')} style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '6px', padding: '0.3rem 0.6rem',
          color: 'var(--text-secondary)', fontSize: '0.75rem',
          fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em',
        }}>
          {lang === 'el' ? 'EN' : 'ΕΛ'}
        </button>

        {user ? (
          <div ref={userRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setUserMenuOpen(!userMenuOpen); setAboutOpen(false); setCommunityOpen(false) }}
              style={{
                background: 'var(--accent)', border: 'none', borderRadius: '6px',
                padding: '0.4rem 0.85rem', color: 'var(--bg)', fontSize: '0.85rem',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}
            >
              {firstName || t('Προφίλ', 'Profile')}
              <span style={{ fontSize: '0.65rem' }}>▼</span>
            </button>
            {userMenuOpen && (
              <div style={{ ...dropdownStyle, left: 'auto', right: 0, transform: 'none', minWidth: '160px' }}>
                <Link href="/dashboard" style={dropdownLinkStyle(pathname === '/dashboard')} onClick={() => setUserMenuOpen(false)}>
                  🏠 {t('Dashboard', 'Dashboard')}
                </Link>
                {isAdmin && (
                  <Link href="/admin" style={dropdownLinkStyle(pathname === '/admin')} onClick={() => setUserMenuOpen(false)}>
                    ⚙️ Admin Panel
                  </Link>
                )}
                <button onClick={handleLogout} style={{
                  width: '100%', background: 'none', border: 'none',
                  padding: '0.6rem 1rem', borderRadius: '6px',
                  color: '#f77e7e', fontSize: '0.88rem', cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'Outfit, sans-serif',
                  marginTop: '0.25rem', borderTop: '1px solid var(--border)',
                }}>
                  🚪 {t('Αποσύνδεση', 'Logout')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={handleLogin} style={{
            background: 'var(--accent)', border: 'none', borderRadius: '6px',
            padding: '0.4rem 1rem', color: 'var(--bg)', fontSize: '0.85rem',
            fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
          }}>
            {t('Σύνδεση', 'Login')}
          </button>
        )}

        <button onClick={() => setMobileOpen(!mobileOpen)} className="hamburger" style={{
          background: 'none', border: 'none', color: 'var(--text-primary)',
          cursor: 'pointer', fontSize: '1.3rem', display: 'none', padding: '0.2rem',
        }}>
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{
          position: 'absolute', top: 'var(--nav-height)', left: 0, right: 0,
          background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
          padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem',
          maxHeight: '80vh', overflowY: 'auto',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.25rem 0', marginBottom: '0.25rem' }}>
            {t('Σχετικά', 'About')}
          </p>
          {aboutLinks.map(link => (
            <Link key={link.href} href={link.href} style={{ padding: '0.6rem 0', color: pathname === link.href ? 'var(--accent)' : 'var(--text-primary)', textDecoration: 'none', fontSize: '0.95rem', borderBottom: '1px solid var(--border)' }}>
              {t(link.el, link.en)}
            </Link>
          ))}
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.5rem 0 0.25rem', marginTop: '0.5rem' }}>
            {t('Κοινότητα', 'Community')}
          </p>
          {communityLinks.map(link => (
            <Link key={link.href} href={link.href} style={{ padding: '0.6rem 0', color: pathname === link.href ? 'var(--accent)' : 'var(--text-primary)', textDecoration: 'none', fontSize: '0.95rem', borderBottom: '1px solid var(--border)' }}>
              {t(link.el, link.en)}
            </Link>
          ))}
          {user && (
            <>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.5rem 0 0.25rem', marginTop: '0.5rem' }}>
                {firstName}
              </p>
              <Link href="/dashboard" style={{ padding: '0.6rem 0', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.95rem', borderBottom: '1px solid var(--border)' }} onClick={() => setMobileOpen(false)}>
                🏠 Dashboard
              </Link>
              {isAdmin && (
                <Link href="/admin" style={{ padding: '0.6rem 0', color: 'var(--accent)', textDecoration: 'none', fontSize: '0.95rem', borderBottom: '1px solid var(--border)' }} onClick={() => setMobileOpen(false)}>
                  ⚙️ Admin Panel
                </Link>
              )}
              <button onClick={handleLogout} style={{ padding: '0.6rem 0', color: '#f77e7e', background: 'none', border: 'none', textAlign: 'left', fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>
                🚪 {t('Αποσύνδεση', 'Logout')}
              </button>
            </>
          )}
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