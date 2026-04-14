'use client'

import { useLang } from '@/context/LanguageContext'

const roleConfig: Record<string, { icon: string; el: string; en: string; color: string }> = {
  judge:     { icon: '⚖️', el: 'Κριτής',       en: 'Judge',     color: '#7eb8f7' },
  organizer: { icon: '📋', el: 'Διοργανωτής',  en: 'Organizer', color: '#7ef7a0' },
  decoy:     { icon: '🎯', el: 'Decoy',         en: 'Decoy',     color: '#f77e7e' },
}

const ARC_RADIUS = 148
function degToRad(deg: number) { return (deg * Math.PI) / 180 }

export default function RoleBadges({ roles }: { roles: string[] }) {
  const { t } = useLang()
  const filtered = roles.filter(r => roleConfig[r]).slice(0, 3)

  function getAngles(count: number): number[] {
    if (count === 1) return [180]
    if (count === 2) return [210, 150]
    return [220, 180, 140]
  }
  const angles = getAngles(filtered.length)

  return (
    <>
      {/* Desktop arc — pointerEvents none on wrapper so clicks pass through to ProfileCircle */}
      <div className="role-badges-desktop" style={{ pointerEvents: 'none' }}>
        {filtered.map((role, i) => {
          const cfg = roleConfig[role]
          const angle = degToRad(angles[i])
          const x = ARC_RADIUS * Math.cos(angle)
          const y = ARC_RADIUS * Math.sin(angle)
          return (
            <div key={role} style={{
              position: 'absolute',
              left: `calc(50% + ${x}px - 32px)`,
              top: `calc(50% + ${y}px - 32px)`,
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--bg-card)',
              border: `2px solid ${cfg.color}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1px',
              zIndex: 2,
              boxShadow: `0 0 12px ${cfg.color}44`,
              flexShrink: 0,
              pointerEvents: 'auto',
            }}>
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{cfg.icon}</span>
              <span style={{
                fontSize: '0.52rem', fontWeight: 600, color: cfg.color,
                textAlign: 'center', padding: '0 4px', lineHeight: 1.2,
                maxWidth: '60px', overflow: 'hidden',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {t(cfg.el, cfg.en)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Mobile row */}
      <div className="role-badges-mobile">
        {filtered.map(role => {
          const cfg = roleConfig[role]
          return (
            <div key={role} style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'var(--bg-card)', border: `2px solid ${cfg.color}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: '1px', flexShrink: 0,
              boxShadow: `0 0 12px ${cfg.color}44`,
            }}>
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{cfg.icon}</span>
              <span style={{
                fontSize: '0.48rem', fontWeight: 600, color: cfg.color,
                textAlign: 'center', padding: '0 3px', lineHeight: 1.2,
                maxWidth: '52px', overflow: 'hidden',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {t(cfg.el, cfg.en)}
              </span>
            </div>
          )
        })}
      </div>

      <style>{`
        .role-badges-desktop { display: contents; }
        .role-badges-mobile  { display: none; }
        @media (max-width: 600px) {
          .role-badges-desktop { display: none !important; }
          .role-badges-mobile  {
            display: flex !important;
            flex-direction: row;
            gap: 0.75rem;
            justify-content: center;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </>
  )
}
