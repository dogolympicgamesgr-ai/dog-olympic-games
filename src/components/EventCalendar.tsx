'use client'

import { useState, useMemo } from 'react'
import { useLang } from '@/context/LanguageContext'

interface Props {
  dotDates: string[]                          // ISO strings (any time) that have events
  selectedDate: string | null                 // 'YYYY-MM-DD' or null
  onSelectDate: (date: string | null) => void
}

function toYMD(iso: string) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function EventCalendar({ dotDates, selectedDate, onSelectDate }: Props) {
  const { t } = useLang()
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-indexed

  const dotSet = useMemo(() => new Set(dotDates.map(toYMD)), [dotDates])

  const monthNames = t('el', 'en') === 'el'
  ? ['Ιαν','Φεβ','Μαρ','Απρ','Μαΐ','Ιουν','Ιουλ','Αυγ','Σεπ','Οκτ','Νοε','Δεκ']
  : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const dayNames = t('el', 'en') === 'el'
  ? ['Κυ','Δε','Τρ','Τε','Πε','Πα','Σά']
  : ['Su','Mo','Tu','We','Th','Fr','Sa']

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Build grid: days of month padded to start on correct weekday
  const firstDay = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const todayYMD = toYMD(today.toISOString())

  function cellYMD(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function handleDayClick(day: number) {
    const ymd = cellYMD(day)
    if (!dotSet.has(ymd)) return
    onSelectDate(selectedDate === ymd ? null : ymd)
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '14px',
      padding: '1rem',
      marginBottom: '1.5rem',
      userSelect: 'none',
    }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <button
          onClick={prevMonth}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem', padding: '0.2rem 0.5rem', borderRadius: '6px' }}
        >‹</button>
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
          {monthNames[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem', padding: '0.2rem 0.5rem', borderRadius: '6px' }}
        >›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.35rem' }}>
        {dayNames.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.04em', padding: '0.2rem 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.15rem' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />
          const ymd = cellYMD(day)
          const hasDot = dotSet.has(ymd)
          const isToday = ymd === todayYMD
          const isSelected = ymd === selectedDate
          const isPast = new Date(ymd) < new Date(todayYMD)

          return (
            <div
              key={ymd}
              onClick={() => handleDayClick(day)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.35rem 0.2rem',
                borderRadius: '8px',
                cursor: hasDot ? 'pointer' : 'default',
                background: isSelected ? 'var(--accent)' : isToday ? 'rgba(212,175,55,0.1)' : 'transparent',
                border: isToday && !isSelected ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
                transition: 'background 0.12s',
              }}
            >
              <span style={{
                fontSize: '0.8rem',
                fontWeight: isToday || isSelected ? 700 : 400,
                color: isSelected ? 'var(--bg)' : isPast ? 'var(--text-secondary)' : 'var(--text-primary)',
                lineHeight: 1,
              }}>
                {day}
              </span>
              {/* Dot */}
              <div style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                marginTop: '0.2rem',
                background: hasDot
                  ? isSelected ? 'var(--bg)' : 'var(--accent)'
                  : 'transparent',
              }} />
            </div>
          )
        })}
      </div>

      {/* Legend / clear */}
      {selectedDate && (
        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => onSelectDate(null)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '99px', padding: '0.25rem 0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'Outfit, sans-serif' }}
          >
            {t('Εκκαθάριση φίλτρου', 'Clear filter')} ✕
          </button>
        </div>
      )}
    </div>
  )
}
