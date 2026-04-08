'use client'

import { useLang } from '@/context/LanguageContext'

const roleConfig: Record<string, { icon: string; el: string; en: string; color: string }> = {
  admin:     { icon: '👑', el: 'Admin',      en: 'Admin',      color: '#e8b94f' },
  judge:     { icon: '⚖️', el: 'Κριτής',    en: 'Judge',      color: '#7eb8f7' },
  organizer: { icon: '📋', el: 'Διοργανωτής', en: 'Organizer', color: '#7ef7a0' },
  decoy:     { icon: '🎯', el: 'Decoy',      en: 'Decoy',      color: '#f77e7e' },
}

const positions = [
  { top: '-60px', left: '-80px' },
  { top: '20px',  left: '-100px' },
  { top: '100px', left: '-70px' },
  { top: '-60px', right: '-80px' },
]

export default function RoleBadges({ roles, isTeamLeader }: { roles: string[], isTeamLeader: boolean }) {
  const { t } = useLang()
  const allRoles = [...roles]
  if (isTeamLeader && !allRoles.includes('team_leader')) allRoles.push('team_leader')

  const teamLeaderConfig = { icon: '🏅', el: 'Αρχηγός', en: 'Team Leader', color: '#f7c77e' }

  return (
    <>
      {allRoles.slice(0, 4).map((role, i) => {
        const cfg = role === 'team_leader' ? teamLeaderConfig : roleConfig[role]
        if (!cfg) return null
        const pos = positions[i]
        return (
          <div key={role} style={{
            position: 'absolute',
            ...pos,
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'var(--bg-card)',
            border: `2px solid ${cfg.color}`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '0.6rem', fontWeight: 600,
            color: cfg.color, gap: '2px',
            zIndex: 2, boxShadow: `0 0 12px ${cfg.color}33`,
          }}>
            <span style={{ fontSize: '1.2rem' }}>{cfg.icon}</span>
            <span>{t(cfg.el, cfg.en)}</span>
          </div>
        )
      })}
    </>
  )
}
