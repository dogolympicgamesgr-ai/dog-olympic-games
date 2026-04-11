'use client'
import { useLang } from '@/context/LanguageContext'
import Link from 'next/link'

export default function TeamBadge({ team, isLeader }: { team: any, isLeader: boolean }) {
  const { t } = useLang()

  if (!team) return (
    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '50%',
        border: '2px dashed var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 0.5rem', fontSize: '1.5rem', opacity: 0.4,
      }}>🛡️</div>
      <span style={{ fontSize: '0.75rem' }}>{t('Χωρίς ομάδα', 'No team')}</span>
    </div>
  )

  return (
    <div style={{ textAlign: 'center' }}>
      <Link href={`/teams/${team.id}`} style={{ textDecoration: 'none' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          border: '2px solid var(--accent)',
          background: 'var(--bg-card)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 0.5rem', fontSize: '2rem',
          boxShadow: '0 0 15px rgba(232,185,79,0.2)',
          cursor: 'pointer', transition: 'transform 0.15s',
        }}>🛡️</div>
      </Link>
      <p style={{
        color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif',
        fontSize: '0.9rem', letterSpacing: '0.05em',
        maxWidth: '90px', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        margin: '0 auto',
      }}>
        {team.name}
      </p>
      {isLeader && (
        <p style={{ color: '#f7c77e', fontSize: '0.68rem', marginTop: '0.2rem' }}>
          👑 {t('Αρχηγός', 'Leader')}
        </p>
      )}
    </div>
  )
}