import { useState } from 'react'
import { isToday, getDaysInMonth, getFirstDayOfMonth, MONTH_NAMES } from '../utils.js'

export default function YearView({
  currentDate, setCurrentDate, setActiveView,
  events,
  // accepted but unused in this view:
  weightTargets, weightEntries, hasOverdue, getEventTypeStyle,
}) {
  const year = currentDate.getFullYear()
  const [tooltip, setTooltip] = useState(null) // { lines, x, y }

  function goToMonth(mi) {
    setCurrentDate(new Date(year, mi, 1))
    setActiveView('Month')
  }

  function fmtDate(ds) {
    if (!ds) return ''
    const [, m, d] = ds.split('-')
    return `${parseInt(d)} ${MONTH_NAMES[parseInt(m) - 1].slice(0, 3)}`
  }

  return (
    <div style={{ paddingTop: 10, height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>

      {/* Cursor-following tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 14, top: tooltip.y + 14, zIndex: 1000,
          background: '#2C2C2C', color: '#fff', fontSize: 11, borderRadius: 6,
          padding: '5px 10px', pointerEvents: 'none',
          boxShadow: '0 2px 10px rgba(0,0,0,0.25)', lineHeight: 1.6,
        }}>
          {tooltip.lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(4, 1fr)',
        gap: 10, flex: 1, overflow: 'hidden',
      }}>
        {Array.from({ length: 12 }, (_, mi) => {
          const totalDays = getDaysInMonth(year, mi)
          const firstDay = getFirstDayOfMonth(year, mi)
          const monthPrefix = `${year}-${String(mi + 1).padStart(2, '0')}`

          // Travel range map: day -> 'start' | 'mid' | 'end'
          const rc = {}
          // Events per day (for dots + tooltip)
          const dayEvs = {}

          events.forEach(e => {
            if (e.event_type === 'travel' && e.end_date) {
              for (let d = 1; d <= totalDays; d++) {
                const ds = `${monthPrefix}-${String(d).padStart(2, '0')}`
                if (ds >= e.start_date && ds <= e.end_date) {
                  if (!rc[d]) rc[d] = ds === e.start_date ? 'start' : ds === e.end_date ? 'end' : 'mid'
                  if (!dayEvs[d]) dayEvs[d] = []
                  if (!dayEvs[d].find(x => x.id === e.id)) dayEvs[d].push(e)
                }
              }
            } else if (e.start_date.startsWith(monthPrefix)) {
              const d = parseInt(e.start_date.split('-')[2])
              if (!dayEvs[d]) dayEvs[d] = []
              dayEvs[d].push(e)
            }
          })

          return (
            <div
              key={mi}
              onClick={() => goToMonth(mi)}
              style={{
                background: '#fff', borderRadius: 12, padding: '8px 10px 6px',
                border: '1px solid #EBEBEB', cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden', minWidth: 0,
              }}
            >
              {/* Month name */}
              <div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2C', marginBottom: 4, flexShrink: 0 }}>
                {MONTH_NAMES[mi]}
              </div>

              {/* DOW headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, marginBottom: 2, flexShrink: 0 }}>
                {['M','T','W','T','F','S','S'].map((d, i) => (
                  <div key={i} style={{ fontSize: 9, color: '#ccc', textAlign: 'center', fontWeight: 600 }}>{d}</div>
                ))}
              </div>

              {/* Day grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, flex: 1 }}>
                {/* Leading empty cells */}
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}

                {Array.from({ length: totalDays }, (_, i) => i + 1).map(d => {
                  const range = rc[d]
                  const evs = dayEvs[d] || []
                  const today = isToday(new Date(year, mi, d))
                  const hasCelebration = evs.some(e => e.event_type === 'celebration')
                  const hasImportant   = evs.some(e => e.event_type === 'important')
                  const hasAnyEvent    = evs.length > 0

                  let bg = '#fff', br = '2px', border = '1px solid #f0f0f0'
                  if (range === 'start') { bg = '#F7F0E0'; br = '2px 0 0 2px'; border = '1px solid #D8902F' }
                  if (range === 'mid')   { bg = '#F7F0E0'; br = '0';            border = '1px solid #f0f0f0' }
                  if (range === 'end')   { bg = '#F7F0E0'; br = '0 2px 2px 0'; border = '1px solid #D8902F' }

                  const tooltipLines = evs.map(e =>
                    e.end_date
                      ? `${e.title} (${fmtDate(e.start_date)}–${fmtDate(e.end_date)})`
                      : e.title
                  )

                  return (
                    <div
                      key={d}
                      onMouseEnter={ev => hasAnyEvent && setTooltip({ lines: tooltipLines, x: ev.clientX, y: ev.clientY })}
                      onMouseMove={ev  => hasAnyEvent && setTooltip(prev => prev ? { ...prev, x: ev.clientX, y: ev.clientY } : null)}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        background: bg, borderRadius: br, border,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '2px 0', minHeight: 18,
                      }}
                    >
                      {today ? (
                        <div style={{
                          width: 17, height: 17, borderRadius: '50%',
                          background: '#4F7DB3', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700, lineHeight: 1,
                        }}>{d}</div>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 500, color: range ? '#573A12' : '#2C2C2C', lineHeight: 1 }}>{d}</span>
                      )}
                      {(hasCelebration || hasImportant) && (
                        <div style={{ display: 'flex', gap: 2, marginTop: 1 }}>
                          {hasCelebration && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#A06C86', flexShrink: 0 }} />}
                          {hasImportant   && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F7DB3', flexShrink: 0 }} />}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Trailing empty cells */}
                {(() => {
                  const rem = (firstDay + totalDays) % 7
                  return rem === 0 ? null : Array.from({ length: 7 - rem }).map((_, i) => <div key={`r${i}`} />)
                })()}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
