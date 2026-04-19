'use client'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'

export interface RoleEvent {
  id: string
  title_el: string
  title_en?: string
  event_date?: string
  location?: string
  is_online?: boolean
}

export interface SportStat {
  sport_name_el: string
  sport_name_en: string
  count: number
}

interface RoleProfilePageProps {
  role: 'judge' | 'organizer' | 'decoy'
  profile: {
    full_name: string
    member_id: string
    email?: string
    display_email?: string
    phone?: string
    show_phone?: boolean
    avatar_url?: string
  }
  totalEvents: number
  totalSeminars?: number      // organizer only
  sportStats: SportStat[]
  events: RoleEvent[]
  seminars?: RoleEvent[]      // organizer only
  loading: boolean
}

const ROLE_CONFIG = {
  judge:     { icon: '⚖️', el: 'Κριτής',       en: 'Judge',     color: '#7eb8f7' },
  organizer: { icon: '📋', el: 'Διοργανωτής',  en: 'Organizer', color: '#7ef7a0' },
  decoy:     { icon: '🎯', el: 'Decoy',         en: 'Decoy',     color: '#f77e7e' },
}

export default function RoleProfilePage({
  role, profile, totalEvents, totalSeminars = 0,
  sportStats, events, seminars = [], loading,
}: RoleProfilePageProps) {
  const { t } = useLang()
  const router = useRouter()
  const cfg = ROLE_CONFIG[role]

  if (loading) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )

  const displayEmail = profile.display_email || profile.email

  const statPill = (count: number, labelEl: string, labelEn: string) => (
    <div style={{ background: 'var(--bg-card)', border: `1px solid ${cfg.color}44`, borderRadius: '99px', padding: '0.65rem 2rem', textAlign: 'center', boxShadow: `0 0 16px ${cfg.color}22` }}>
      <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.8rem', color: cfg.color, letterSpacing: '0.05em', margin: 0, lineHeight: 1 }}>
        {count}
      </p>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {t(labelEl, labelEn)}
      </p>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1.5rem' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ color: cfg.color, fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            {cfg.icon} {t(cfg.el, cfg.en)}
          </p>
          <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {profile.full_name}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '0.1rem' }}>
            Member ID: {profile.member_id}
          </p>
          {displayEmail && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '0.1rem' }}>
              {displayEmail}
            </p>
          )}
          {profile.show_phone && profile.phone && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              {profile.phone}
            </p>
          )}
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '180px', height: '180px', borderRadius: '50%', border: `3px solid ${cfg.color}`, background: 'var(--bg-card)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 30px ${cfg.color}22` }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
              : <span style={{ fontSize: '4.5rem' }}>🐾</span>}
          </div>
        </div>

        {/* Stat pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {statPill(
            totalEvents,
            role === 'judge' ? 'Αγώνες ως Κριτής' : role === 'organizer' ? 'Αγώνες ως Διοργανωτής' : 'Αγώνες ως Decoy',
            role === 'judge' ? 'Events as Judge' : role === 'organizer' ? 'Events as Organizer' : 'Events as Decoy',
          )}
          {role === 'organizer' && totalSeminars > 0 && statPill(
            totalSeminars,
            'Σεμινάρια ως Διοργανωτής',
            'Seminars as Organizer',
          )}
        </div>

        {/* Sport breakdown */}
        {sportStats.length > 0 && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: cfg.color, letterSpacing: '0.05em', margin: '0 0 1rem' }}>
              {t('Ανάλυση ανά Αγώνισμα', 'Breakdown by Sport')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sportStats.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < sportStats.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.88rem', margin: 0 }}>
                    {t(s.sport_name_el, s.sport_name_en)}
                  </p>
                  <span style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}44`, borderRadius: '99px', padding: '0.15rem 0.75rem', fontSize: '0.82rem', fontWeight: 700, color: cfg.color }}>
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events list */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: cfg.color, letterSpacing: '0.05em', margin: 0 }}>
              🏆 {t('Λίστα Αγώνων', 'Event List')}
            </p>
          </div>
          {events.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              {t('Δεν υπάρχουν αγώνες ακόμα', 'No events yet')}
            </div>
          ) : (
            events.map((event, i) => (
              <div
                key={event.id}
                onClick={() => router.push(`/events/${event.id}`)}
                style={{ padding: '0.9rem 1.25rem', borderBottom: i < events.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
                    {t(event.title_el, event.title_en || event.title_el)}
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '0.15rem 0 0' }}>
                    {event.location || '—'} · {event.event_date ? new Date(event.event_date).toLocaleDateString('el-GR') : '—'}
                  </p>
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', flexShrink: 0 }}>→</span>
              </div>
            ))
          )}
        </div>

        {/* Seminars list — organizer only */}
        {role === 'organizer' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: cfg.color, letterSpacing: '0.05em', margin: 0 }}>
                📚 {t('Λίστα Σεμιναρίων', 'Seminar List')}
              </p>
            </div>
            {seminars.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                {t('Δεν υπάρχουν σεμινάρια ακόμα', 'No seminars yet')}
              </div>
            ) : (
              seminars.map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => router.push(`/seminars/${s.id}`)}
                  style={{ padding: '0.9rem 1.25rem', borderBottom: i < seminars.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {t(s.title_el, s.title_en || s.title_el)}
                      {s.is_online && (
                        <span style={{ fontSize: '0.65rem', color: '#7eb8f7', background: '#7eb8f711', border: '1px solid #7eb8f733', borderRadius: '99px', padding: '0.1rem 0.4rem', fontWeight: 700 }}>
                          Online
                        </span>
                      )}
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '0.15rem 0 0' }}>
                      {s.is_online ? t('Διαδικτυακό', 'Online') : (s.location || '—')} · {s.event_date ? new Date(s.event_date).toLocaleDateString('el-GR') : '—'}
                    </p>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', flexShrink: 0 }}>→</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Back to profile */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={() => router.push(`/profile/${profile.member_id}`)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 1.25rem', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.82rem' }}
          >
            ← {t('Προφίλ', 'Profile')}
          </button>
        </div>

      </div>
    </main>
  )
}
