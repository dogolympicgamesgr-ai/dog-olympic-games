'use client'

import { useLang } from '@/context/LanguageContext'

export interface TitleCircle {
  icon: string
  label: string
  sublabel?: string   // e.g. "Lvl 2"
  color: string
  earned: boolean
  progress?: string   // e.g. "1/2" shown when not yet earned
}

const ARC_RADIUS = 148
function degToRad(deg: number) { return (deg * Math.PI) / 180 }

function getAngles(count: number): number[] {
  if (count === 1) return [0]
  if (count === 2) return [330, 30]
  if (count === 3) return [320, 0, 40]
  if (count === 4) return [310, 345, 15, 50]
  if (count === 5) return [300, 335, 5, 35, 65]
  return [290, 325, 355, 25, 55, 85]
}

export default function DogTitleCircles({ circles }: { circles: TitleCircle[] }) {
  if (circles.length === 0) return null

  const angles = getAngles(circles.length)

  return (
    <>
      {/* Desktop arc — display:contents so circles anchor to the parent position:relative div */}
      <div className="dog-title-circles-desktop" style={{ display: 'contents' }}>
        {circles.map((circle, i) => {
          const angle = degToRad(angles[i] ?? 0)
          const x = ARC_RADIUS * Math.cos(angle)
          const y = ARC_RADIUS * Math.sin(angle)
          return (
            <div key={i} style={{
              position: 'absolute',
              left: `calc(50% + ${x}px - 32px)`,
              top: `calc(50% + ${y}px - 32px)`,
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--bg-card)',
              border: `2px solid ${circle.earned ? circle.color : 'var(--border)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1px',
              zIndex: 1,
              boxShadow: circle.earned ? `0 0 12px ${circle.color}44` : 'none',
              opacity: circle.earned ? 1 : 0.5,
              flexShrink: 0,
              pointerEvents: 'none',
            }}>
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{circle.icon}</span>
              <span style={{
                fontSize: '0.48rem', fontWeight: 600,
                color: circle.earned ? circle.color : 'var(--text-secondary)',
                textAlign: 'center', padding: '0 3px', lineHeight: 1.2,
                maxWidth: '60px', overflow: 'hidden',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {circle.label}
              </span>
              {circle.sublabel && (
                <span style={{ fontSize: '0.42rem', color: 'var(--text-secondary)', lineHeight: 1 }}>
                  {circle.sublabel}
                </span>
              )}
              {!circle.earned && circle.progress && (
                <span style={{ fontSize: '0.42rem', color: 'var(--text-secondary)', lineHeight: 1 }}>
                  {circle.progress}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile row */}
      <div className="dog-title-circles-mobile">
        {circles.map((circle, i) => (
          <div key={i} style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'var(--bg-card)',
            border: `2px solid ${circle.earned ? circle.color : 'var(--border)'}`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '1px', flexShrink: 0,
            boxShadow: circle.earned ? `0 0 12px ${circle.color}44` : 'none',
            opacity: circle.earned ? 1 : 0.5,
          }}>
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>{circle.icon}</span>
            <span style={{
              fontSize: '0.44rem', fontWeight: 600,
              color: circle.earned ? circle.color : 'var(--text-secondary)',
              textAlign: 'center', padding: '0 3px', lineHeight: 1.2,
              maxWidth: '52px', overflow: 'hidden',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {circle.label}
            </span>
            {circle.sublabel && (
              <span style={{ fontSize: '0.38rem', color: 'var(--text-secondary)', lineHeight: 1 }}>
                {circle.sublabel}
              </span>
            )}
            {!circle.earned && circle.progress && (
              <span style={{ fontSize: '0.38rem', color: 'var(--text-secondary)', lineHeight: 1 }}>
                {circle.progress}
              </span>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .dog-title-circles-desktop { display: contents; }
        .dog-title-circles-mobile  { display: none; }
        @media (max-width: 600px) {
          .dog-title-circles-desktop { display: none !important; }
          .dog-title-circles-mobile  {
            display: flex !important;
            flex-direction: row;
            gap: 0.75rem;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 0.5rem;
          }
        }
      `}</style>
    </>
  )
}
