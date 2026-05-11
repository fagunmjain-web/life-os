import { useState } from 'react'
import { isToday, getDaysInMonth, getFirstDayOfMonth, MONTH_NAMES } from '../utils.js'

export default function YearView({
  currentDate, setCurrentDate, setActiveView,
  events, weightTargets, weightEntries,
  hasOverdue, getEventTypeStyle,
}) {
  const year = currentDate.getFullYear()
  const [hoveredInfo, setHoveredInfo] = useState(null) // { mi, d }

  function getWeightTarget(ds) { return weightTargets.find(w => w.target_date === ds) }

  function goToMonth(mi) {
    setCurrentDate(new Date(year, mi, 1))
    setActiveView('Month')
  }

  return (
    <div style={{ paddingTop: 10, height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(4, 1fr)', gap: 10, flex: 1, overflow: 'hidden' }}>
        {Array.from({ length: 12 }, (_, mi) => {
          const totalDays = getDaysInMonth(year, mi)
          const firstDay = getFirstDayOfMonth(year, mi)
          const rc = {}
          events.filter(e => e.event_type === 'travel' && e.end_date).forEach(e => {
            for (let d = 1; d <= totalDays; d++) {
              const ds = `${year}-${String(mi+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
              if (ds >= e.start_date && ds <= e.end_date) {
                if (ds === e.start_date) rc[d] = 'start'
                else if (ds === e.end_date) rc[d] = 'end'
                else if (!rc[d]) rc[d] = 'mid'
              }
            }
          })

          const dayEvents = {}
          const monthPrefix = `${year}-${String(mi+1).padStart(2,'0')}`
          const monthEnd = `${monthPrefix}-${String(totalDays).padStart(2,'0')}`
          events.forEach(e => {
            if (e.end_date && e.event_type === 'travel') {
              // Only show title on the first day of the event visible in this month
              if (e.end_date < `${monthPrefix}-01` || e.start_date > monthEnd) return
              const firstVisible = e.start_date >= `${monthPrefix}-01` ? e.start_date : `${monthPrefix}-01`
              const d = parseInt(firstVisible.split('-')[2])
              if (!dayEvents[d]) dayEvents[d] = []
              dayEvents[d].push(e)
            } else {
              const ds = e.start_date
              if (!e.end_date && ds.startsWith(monthPrefix)) {
                const d = parseInt(ds.split('-')[2])
                if (!dayEvents[d]) dayEvents[d] = []
                dayEvents[d].push(e)
              }
            }
          })

          let lastFridayWt = null
          for (let d = totalDays; d >= 1; d--) {
            if (new Date(year, mi, d).getDay() === 5) {
              const ds = `${year}-${String(mi+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
              const wt = getWeightTarget(ds)
              if (wt) { lastFridayWt = wt.target_weight; break }
            }
          }

          return (
            <div
              key={mi}
              onClick={() => goToMonth(mi)}
              style={{ background: '#fff', borderRadius: 12, padding: 10, border: '1px solid #EBEBEB', cursor: 'pointer', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: '#2C2C2C', marginBottom: 6 }}>{MONTH_NAMES[mi]}</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, marginBottom: 3 }}>
                {['M','T','W','T','F','S','S'].map((d,i) => (
                  <div key={i} style={{ fontSize: 10, color: '#ccc', textAlign: 'center', fontWeight: 600 }}>{d}</div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, flex: 1 }}>
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`e${i}`} style={{ minHeight: 12, opacity: .2 }} />
                ))}
                {Array.from({ length: totalDays }, (_, i) => i+1).map(d => {
                  const ds = `${year}-${String(mi+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                  const range = rc[d]
                  const ev = dayEvents[d] || []
                  const today = isToday(new Date(year, mi, d))
                  const overdue = hasOverdue(new Date(year, mi, d))

                  let bg = '#fff', br = '2px', border = '1px solid #f0f0f0'
                  if (range === 'start') { bg = '#FFE0B2'; br = '2px 0 0 2px'; border = '1px solid #f0f0f0' }
                  if (range === 'mid')   { bg = '#FFE0B2'; br = '0';            border = '1px solid #f0f0f0' }
                  if (range === 'end')   { bg = '#FFE0B2'; br = '0 2px 2px 0'; border = '1px solid #f0f0f0' }

                  const isHovered = hoveredInfo?.mi === mi && hoveredInfo?.d === d

                  return (
                    <div key={d}
                      onMouseEnter={() => ev.length > 0 && setHoveredInfo({ mi, d })}
                      onMouseLeave={() => setHoveredInfo(null)}
                      style={{ position: 'relative', background: bg, borderRadius: br, border, minHeight: 14, padding: '1px', overflow: 'visible', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}
                    >
                      {isHovered && ev.length > 0 && (
                        <div style={{
                          position: 'absolute', zIndex: 100,
                          bottom: 'calc(100% + 3px)', left: '50%', transform: 'translateX(-50%)',
                          background: '#2C2C2C', color: '#fff', fontSize: 10, borderRadius: 6,
                          padding: '4px 8px', whiteSpace: 'nowrap', pointerEvents: 'none',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        }}>
                          {ev.map(e => e.title).join(' · ')}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        {overdue && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#F9A825' }} />}
                        {today ? (
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#5B8ED6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, lineHeight: 1 }}>{d}</div>
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 600, color: range ? '#4E2100' : '#2C2C2C', lineHeight: 1 }}>{d}</span>
                        )}
                      </div>
                      {ev.map(e => {
                        const s = getEventTypeStyle(e.event_type)
                        return (
                          <div key={e.id} style={{
                            fontSize: 7, fontWeight: 600, padding: '0 1px', borderRadius: 1,
                            background: s.bg, color: s.textColor,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', lineHeight: 1.2,
                          }}>{e.title}</div>
                        )
                      })}
                    </div>
                  )
                })}
                {(() => {
                  const total = firstDay + totalDays
                  const rem = total % 7 === 0 ? 0 : 7 - (total % 7)
                  return Array.from({ length: rem }).map((_, i) => <div key={`r${i}`} style={{ minHeight: 12 }} />)
                })()}
              </div>

              {lastFridayWt && (
                <div style={{ marginTop: 5, paddingTop: 4, borderTop: '1px dashed #eee', fontSize: 8, fontWeight: 700, color: '#4A8C40' }}>
                  Wt: {lastFridayWt}kg
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
