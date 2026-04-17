'use client'
import { useRouter } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'

const roleConfig: Record<string, { icon: string; el: string; en: string; color: string; path: string }> = {
  judge:     { icon: '⚖️', el: 'Κριτής',        en: 'Judge',     color: '#7eb8f7', path: 'judges' },
  organizer: { icon: '📋', el: 'Διοργανωτής',   en: 'Organizer', color: '#7ef7a0', path: 'organizers' },
  decoy:     { icon: '🎯', el: 'Decoy',          en: 'Decoy',     color: '#f77e7e', path: 'decoys' },
}

const ARC_RADIUS = 148

function degToRad(deg: number) { return (deg * Math.PI) / 180 }

export default function RoleBadges({ roles, member_id }: { roles: string[]; member_id?: string }) {
  const { t } = useLang()
  const router = useRouter()
  const filtered = roles.filter(r => roleConfig[r]).slice(0, 3)

  function getAngles(count: number): number[] {
    if (count === 1) return [180]
    if (count === 2) return [210, 150]
    return [220, 180, 140]
  }

  const angles = getAngles(filtered.length)

  const badgeStyle = (color: string, clickable: boolean) => ({
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'var(--bg-card)',
    border: `2px solid ${color}`,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1px',
    zIndex: 1,
    boxShadow: `0 0 12px ${color}44`,
    flexShrink: 0,
    cursor: clickable ? 'pointer' : 'default',
    transition: clickable ? 'transform 0.15s, box-shadow 0.15s' : undefined,
  })

  const mobileBadgeStyle = (color: string, clickable: boolean) => ({
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'var(--bg-card)',
    border: `2px solid ${color}`,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1px',
    flexShrink: 0,
    boxShadow: `0 0 12px ${color}44`,
    cursor: clickable ? 'pointer' : 'default',
    transition: clickable ? 'transform 0.15s, box-shadow 0.15s' : undefined,
  })

  function handleClick(role: string) {
    if (!member_id) return
    const cfg = roleConfig[role]
    router.push(`/${cfg.path}/${member_id}`)
  }

  return (
    <>
      {/* Desktop arc */}
      <div className="role-badges-desktop">
        {filtered.map((role, i) => {
          const cfg = roleConfig[role]
          const angle = degToRad(angles[i])
          const x = ARC_RADIUS * Math.cos(angle)
          const y = ARC_RADIUS * Math.sin(angle)
          const clickable = !!member_id
          return (
            <div
              key={role}
              onClick={() => handleClick(role)}
              style={{
                position: 'absolute',
                left: `calc(50% + ${x}px - 32px)`,
                top: `calc(50% + ${y}px - 32px)`,
                ...badgeStyle(cfg.color, clickable),
              }}
              onMouseEnter={e => {
                if (!clickable) return
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'scale(1.12)'
                el.style.boxShadow = `0 0 20px ${cfg.color}88`
              }}
              onMouseLeave={e => {
                if (!clickable) return
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'scale(1)'
                el.style.boxShadow = `0 0 12px ${cfg.color}44`
              }}
            >
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
          const clickable = !!member_id
          return (
            <div
              key={role}
              onClick={() => handleClick(role)}
              style={mobileBadgeStyle(cfg.color, clickable)}
            >
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
        .role-badges-mobile { display: none; }
        @media (max-width: 600px) {
          .role-badges-desktop { display: none !important; }
          .role-badges-mobile {
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