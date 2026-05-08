import { isToday, getDaysInMonth, getFirstDayOfMonth, MONTH_NAMES } from '../utils.js'
import { useIsMobile } from '../hooks/useIsMobile.js'

export default function YearView({
  currentDate, setCurrentDate, setActiveView,
  events, weightTargets, weightEntries,
  hasOverdue, getEventTypeStyle,
}) {
  const isMobile = useIsMobile()
  const year = currentDate.getFullYear()

  function getWeightTarget(ds) { return weightTargets.find(w => w.target_date === ds) }

  function goToMonth(mi) {
    setCurrentDate(new Date(year, mi, 1))
    setActiveView('Month')
  }

  return (
    <div style={{ paddingTop: 10, height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 10, flex: 1, gridAutoRows: '1fr', overflow: 'auto' }}>
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
          events.forEach(e => {
            const ds = e.start_date
            if (!e.end_date && ds.startsWith(`${year}-${String(mi+1).padStart(2,'0')}`)) {
              const d = parseInt(ds.split('-')[2])
              if (!dayEvents[d]) dayEvents[d] = []
              dayEvents[d].push(e)
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
              style={{ background: '#fff', borderRadius: 12, padding: 10, border: '1px solid #EBEBEB', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2C', marginBottom: 6 }}>{MONTH_NAMES[mi]}</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, marginBottom: 3 }}>
                {['M','T','W','T','F','S','S'].map((d,i) => (
                  <div key={i} style={{ fontSize: 7, color: '#ccc', textAlign: 'center', fontWeight: 600 }}>{d}</div>
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

                  let bg = 'transparent', br = '2px', border = 'none'
                  if (range === 'start') { bg = '#FFE0B2'; br = '2px 0 0 2px' }
                  if (range === 'mid')   { bg = '#FFE0B2'; br = '0' }
                  if (range === 'end')   { bg = '#FFE0B2'; br = '0 2px 2px 0' }
                  if (today) border = '0.5px solid #aaa'

                  return (
                    <div key={d} style={{ background: bg, borderRadius: br, border, minHeight: 12, padding: '1px', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        {overdue && <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#F9A825' }} />}
                        <span style={{ fontSize: 7, fontWeight: 600, color: range ? '#4E2100' : '#2C2C2C', lineHeight: 1 }}>{d}</span>
                      </div>
                      {ev.map(e => {
                        const s = getEventTypeStyle(e.event_type)
                        return (
                          <div key={e.id} style={{
                            fontSize: 5, fontWeight: 600, padding: '0 2px', borderRadius: 1,
                            background: s.bg, color: s.textColor,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
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
