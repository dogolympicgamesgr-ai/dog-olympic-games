'use client'
import { useLang } from '@/context/LanguageContext'

export default function TeamBadge({ team, isLeader }: { team: any, isLeader: boolean }) {
  const { t } = useLang()
  if (!team) return (
    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
      <div style={{
        width: '70px', height: '70px', borderRadius: '50%',
        border: '2px dashed var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 0.5rem', fontSize: '1.5rem', opacity: 0.4,
      }}>🛡️</div>
      <span>{t('Χωρίς ομάδα', 'No team')}</span>
    </div>
  )

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '70px', height: '70px', borderRadius: '50%',
        border: '2px solid var(--accent)',
        background: 'var(--bg-card)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 0.5rem', fontSize: '2rem',
        boxShadow: '0 0 15px rgba(232,185,79,0.2)',
      }}>🛡️</div>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', letterSpacing: '0.05em' }}>
        {team.name}
      </p>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
        ID: {team.id?.slice(0, 8)}
      </p>
      {isLeader && (
        <p style={{ color: '#f7c77e', fontSize: '0.72rem', marginTop: '0.2rem' }}>
          {t('Αρχηγός', 'Leader')}
        </p>
      )}
    </div>
  )
}
