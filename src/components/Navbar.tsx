'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  const [profileName, setProfileName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [roles, setRoles] = useState<string[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [communityOpen, setCommunityOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [myProfileOpen, setMyProfileOpen] = useState(false)
  const pathname = usePathname()
  const supabase = createClient()

  const aboutRef = useRef<HTMLDivElement>(null)
  const communityRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (aboutRef.current && !aboutRef.current.contains(e.target as Node)) setAboutOpen(false)
      if (communityRef.current && !communityRef.current.contains(e.target as Node)) setCommunityOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close drawer + refresh unread on route change
  useEffect(() => {
    setDrawerOpen(false)
    if (user) fetchUnreadCount(user.id)
  }, [pathname])

  // Session + auth state
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/auth/session')
        const data = await res.json()
        if (data.user) {
          setUser(data.user)
          setProfileName(data.profile?.full_name || '')
          setIsAdmin(data.isAdmin)
          setRoles(data.roles || [])
          fetchUnreadCount(data.user.id)
        }
      } catch (err) {
        console.error('session fetch error:', err)
      }
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setUser(null)
        setProfileName('')
        setIsAdmin(false)
        setRoles([])
        setUnreadCount(0)
      } else {
        try {
          const res = await fetch('/auth/session')
          const data = await res.json()
          setUser(data.user)
          setProfileName(data.profile?.full_name || '')
          setIsAdmin(data.isAdmin)
          setRoles(data.roles || [])
          fetchUnreadCount(data.user.id)
        } catch {}
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Dashboard drawer compat
  useEffect(() => {
    function onDashboardDrawer() { setDrawerOpen(true) }
    window.addEventListener('open-dashboard-drawer', onDashboardDrawer)
    return () => window.removeEventListener('open-dashboard-drawer', onDashboardDrawer)
  }, [])

  async function fetchUnreadCount(userId: string) {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
    setUnreadCount(count || 0)
  }

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const handleLogout = async () => {
    setDrawerOpen(false)
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

  const drawerLinkStyle = (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    color: active ? 'var(--accent)' : 'var(--text-primary)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: active ? 600 : 400,
    background: active ? 'var(--bg)' : 'transparent',
    transition: 'background 0.15s',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif',
    width: '100%',
    textAlign: 'left' as const,
  })

  const sectionLabel = (label: string) => (
    <p style={{
      color: 'var(--text-secondary)', fontSize: '0.68rem',
      fontWeight: 700, letterSpacing: '0.1em',
      textTransform: 'uppercase', padding: '1rem 1rem 0.3rem',
    }}>{label}</p>
  )

  const aboutActive = aboutLinks.some(l => pathname === l.href)
  const communityActive = communityLinks.some(l => pathname === l.href)

  return (
    <>
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

        {/* LEFT — hamburger + logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <button
            onClick={() => setDrawerOpen(true)}
            className={user ? 'hamburger-always' : 'hamburger-mobile'}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-primary)', cursor: 'pointer',
              fontSize: '1.2rem', padding: '0.3rem', borderRadius: '6px',
            }}
          >☰</button>
          <Link href="/" style={{
            fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.4rem',
            letterSpacing: '0.06em', color: 'var(--accent)',
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}>
            <span>🐾</span>
            <span className="logo-text">DOG OLYMPIC GAMES</span>
          </Link>
        </div>

        {/* CENTER — desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="desktop-nav">
          <div ref={aboutRef} style={{ position: 'relative' }}>
            <button style={navBtnStyle(aboutActive)} onClick={() => { setAboutOpen(!aboutOpen); setCommunityOpen(false) }}>
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
            <button style={navBtnStyle(communityActive)} onClick={() => { setCommunityOpen(!communityOpen); setAboutOpen(false) }}>
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

        {/* RIGHT — lang + bell + login */}
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
            <Link href="/notifications" style={{
              position: 'relative', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '6px', padding: '0.3rem 0.6rem',
              color: 'var(--text-secondary)', textDecoration: 'none',
              fontSize: '1rem',
            }}>
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  background: 'var(--accent)', color: 'var(--bg)',
                  borderRadius: '50%', width: '18px', height: '18px',
                  fontSize: '0.65rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          ) : (
            <button onClick={handleLogin} style={{
              background: 'var(--accent)', border: 'none', borderRadius: '6px',
              padding: '0.4rem 1rem', color: 'var(--bg)', fontSize: '0.85rem',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
            }}>
              {t('Σύνδεση', 'Login')}
            </button>
          )}
        </div>
      </nav>

      {/* GLOBAL DRAWER */}
      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 500, backdropFilter: 'blur(4px)',
          }} />
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: '300px', maxWidth: '85vw',
            background: 'var(--bg-card)',
            borderRight: '1px solid var(--border)',
            zIndex: 600, display: 'flex', flexDirection: 'column',
            overflowY: 'auto',
          }}>
            {/* Drawer header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', color: 'var(--accent)', letterSpacing: '0.05em' }}>
                🐾 DOG OLYMPIC GAMES
              </span>
              <button onClick={() => setDrawerOpen(false)} style={{
                background: 'none', border: 'none',
                color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer',
              }}>✕</button>
            </div>

            {/* Drawer body */}
            <div style={{ flex: 1, padding: '0.5rem 0.75rem', overflowY: 'auto' }}>

              {/* About */}
              {sectionLabel(t('Σχετικά', 'About'))}
              {aboutLinks.map(link => (
                <Link key={link.href} href={link.href} style={drawerLinkStyle(pathname === link.href)}>
                  {t(link.el, link.en)}
                </Link>
              ))}

              {/* Community */}
              {sectionLabel(t('Κοινότητα', 'Community'))}
              {communityLinks.map(link => (
                <Link key={link.href} href={link.href} style={drawerLinkStyle(pathname === link.href)}>
                  {t(link.el, link.en)}
                </Link>
              ))}

              {/* Account — logged in only */}
              {user && (
                <>
                  {sectionLabel(firstName || t('Λογαριασμός', 'Account'))}

                  <Link href="/dashboard" style={drawerLinkStyle(pathname === '/dashboard')}>
                    🏠 {t('Dashboard', 'Dashboard')}
                  </Link>

                  <Link href="/notifications" style={drawerLinkStyle(pathname === '/notifications')} onClick={() => setUnreadCount(0)}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      🔔 {t('Ειδοποιήσεις', 'Notifications')}
                    </span>
                    {unreadCount > 0 && (
                      <span style={{
                        background: 'var(--accent)', color: 'var(--bg)',
                        borderRadius: '50%', width: '20px', height: '20px',
                        fontSize: '0.7rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>

                  {/* Admin */}
                  {isAdmin && (
                    <Link href="/admin" style={drawerLinkStyle(pathname === '/admin')}>
                      ⚙️ Admin Panel
                    </Link>
                  )}

                  {/* Role placeholders */}
                  {roles.includes('judge') && (
                    <button style={{ ...drawerLinkStyle(false), opacity: 0.5, cursor: 'not-allowed' }} disabled>
                      ⚖️ {t('Πίνακας Κριτή', 'Judge Panel')}
                      <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>soon</span>
                    </button>
                  )}
                  {roles.includes('organizer') && (
                    <button style={{ ...drawerLinkStyle(false), opacity: 0.5, cursor: 'not-allowed' }} disabled>
                      📋 {t('Πίνακας Διοργανωτή', 'Organizer Panel')}
                      <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>soon</span>
                    </button>
                  )}
                  {roles.includes('decoy') && (
                    <button style={{ ...drawerLinkStyle(false), opacity: 0.5, cursor: 'not-allowed' }} disabled>
                      🎯 {t('Πίνακας Decoy', 'Decoy Panel')}
                      <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>soon</span>
                    </button>
                  )}

                  {/* My Profile collapsible */}
                  <button
                    onClick={() => setMyProfileOpen(!myProfileOpen)}
                    style={{ ...drawerLinkStyle(false), justifyContent: 'space-between' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      👤 {t('Το Προφίλ μου', 'My Profile')}
                    </span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{myProfileOpen ? '▲' : '▼'}</span>
                  </button>

                  {myProfileOpen && (
                    <div style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--border)', marginLeft: '1rem', marginBottom: '0.25rem' }}>
                      <Link href="/profile/edit" style={drawerLinkStyle(pathname === '/profile/edit')}>
                        ✏️ {t('Επεξεργασία Προφίλ', 'Edit Profile')}
                      </Link>
                      <Link href="/profile/dogs" style={drawerLinkStyle(pathname === '/profile/dogs')}>
                        🐕 {t('Οι Σκύλοι μου', 'My Dogs')}
                      </Link>
                      <Link href="/profile/team" style={drawerLinkStyle(pathname === '/profile/team')}>
                        👥 {t('Η Ομάδα μου', 'My Team')}
                      </Link>
                    </div>
                  )}

                  {/* Logout */}
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                    <button onClick={handleLogout} style={{ ...drawerLinkStyle(false), color: '#f77e7e' }}>
                      🚪 {t('Αποσύνδεση', 'Logout')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .hamburger-always { display: flex !important; }
        .hamburger-mobile { display: none; }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger-mobile { display: flex !important; }
          .logo-text { display: none; }
        }
      `}</style>
    </>
  )
}