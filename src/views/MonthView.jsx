import { useState } from 'react'
import { toDateStr, isToday, getDaysInMonth, getFirstDayOfMonth, getFridaysInMonth, MONTH_NAMES } from '../utils.js'

const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function MonthView({
  currentDate, setCurrentDate, setActiveView,
  events, weightTargets, weightEntries, sections,
  getTasksForDate, isCompleted, hasOverdue,
  getWeightTarget, getWeightEntry,
  saveWeight, onAddEvent, onAddTask, getEventTypeStyle,
}) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const totalDays = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const fridays = getFridaysInMonth(year, month)
  const [openAddRow, setOpenAddRow] = useState(null)
  const [editingWeight, setEditingWeight] = useState(null)
  const [weightVal, setWeightVal] = useState('')

  function getDateStr(day) {
    return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }

  function getRangeInfo(day) {
    const ds = getDateStr(day)
    for (const e of events) {
      if (e.event_type === 'travel' && e.end_date) {
        if (ds >= e.start_date && ds <= e.end_date) {
          if (ds === e.start_date) return 'start'
          if (ds === e.end_date) return 'end'
          return 'mid'
        }
      }
    }
    return null
  }

  function getDayEvents(day) {
    const ds = getDateStr(day)
    return events.filter(e => e.start_date === ds && !e.end_date)
  }

  function getTaskDots(day) {
    const date = new Date(year, month, day)
    const dayTasks = getTasksForDate(date)
    const dateStr = getDateStr(day)
    const counts = {}
    dayTasks.forEach(t => {
      if (!isCompleted(t.id, dateStr)) {
        counts[t.section] = (counts[t.section] || 0) + 1
      }
    })
    return Object.entries(counts).map(([key, count]) => {
      const sec = sections.find(s => s.key === key)
      return sec ? { lightColor: sec.sb, darkColor: sec.cb, count } : null
    }).filter(Boolean)
  }

  function goToDay(day) {
    setCurrentDate(new Date(year, month, day))
    setActiveView('Day')
  }

  function handleWeightBlur(ds) {
    setEditingWeight(null)
    if (weightVal !== '' && !isNaN(weightVal)) saveWeight(ds, parseFloat(weightVal))
  }

  const rangeBg = '#FFE0B2'

  return (
    <div style={{ paddingTop: 10, height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '12px 16px 8px', border: '1px solid #EBEBEB', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Day-of-week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4, flexShrink: 0 }}>
          {DOW.map(d => (
            <div key={d} style={{ fontSize: 11, fontWeight: 600, color: d === 'Fri' ? '#4A8C40' : '#aaa', textAlign: 'center', padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid — fills remaining height */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, flex: 1, gridAutoRows: '1fr' }}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} style={{ borderRadius: 8, opacity: .2 }} />
          ))}

          {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
            const ds = getDateStr(day)
            const range = getRangeInfo(day)
            const dayEvents = getDayEvents(day)
            const today = isToday(new Date(year, month, day))
            const overdue = hasOverdue(new Date(year, month, day))
            const wTarget = getWeightTarget(ds)
            const wEntry = getWeightEntry(ds)
            const showWt = fridays.includes(day)
            const dots = getTaskDots(day)

            let bg = '#fff', br = '8px', border = '1px solid #f0f0f0'
            if (range === 'start') { bg = rangeBg; br = '8px 0 0 8px'; border = 'none' }
            if (range === 'mid')   { bg = rangeBg; br = '0'; border = 'none' }
            if (range === 'end')   { bg = rangeBg; br = '0 8px 8px 0'; border = 'none' }
            if (today) border = '1.5px solid #aaa'

            return (
              <div key={day} style={{ background: bg, borderRadius: br, padding: '4px 3px', border, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {overdue && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F9A825' }} />}
                    <div
                      onClick={() => setOpenAddRow(openAddRow === day ? null : day)}
                      style={{ width: 14, height: 14, border: '1px solid #ccc', borderRadius: 3, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#aaa', cursor: 'pointer', flexShrink: 0 }}
                    >+</div>
                  </div>
                  <span
                    onClick={() => goToDay(day)}
                    style={{ fontSize: 11, fontWeight: 700, color: range ? '#4E2100' : '#2C2C2C', cursor: 'pointer' }}
                  >{day}</span>
                </div>

                {dayEvents.map(e => {
                  const s = getEventTypeStyle(e.event_type)
                  return (
                    <div key={e.id} style={{
                      fontSize: 8, fontWeight: 600, padding: '1px 4px', borderRadius: 4,
                      background: s.bg, color: s.textColor,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{e.title}</div>
                  )
                })}

                {/* Task dots — use light (sb) color */}
                {dots.length > 0 && (
                  <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {dots.map((dot, i) => (
                      <div key={i} style={{
                        width: 14, height: 14, borderRadius: '50%',
                        background: dot.lightColor,
                        border: `1px solid ${dot.darkColor}`,
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 7, fontWeight: 700, color: dot.darkColor,
                      }}>{dot.count}</div>
                    ))}
                  </div>
                )}

                {showWt && wTarget && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 'auto' }} onClick={e => e.stopPropagation()}>
                    <span style={{ fontSize: 7, fontWeight: 700, color: '#4A8C40' }}>Wt:{wTarget.target_weight}kg</span>
                    {editingWeight === ds ? (
                      <input autoFocus type="number" step="0.1" value={weightVal}
                        onChange={e => setWeightVal(e.target.value)}
                        onBlur={() => handleWeightBlur(ds)}
                        style={{ fontSize: 7, fontWeight: 700, color: '#2C2C2C', border: 'none', borderBottom: '1px solid #aaa', background: 'transparent', outline: 'none', width: 26, fontFamily: 'inherit' }}
                      />
                    ) : (
                      <span
                        onClick={() => { setEditingWeight(ds); setWeightVal(wEntry?.actual_weight ?? '') }}
                        style={{ fontSize: 7, fontWeight: 700, color: '#2C2C2C', borderBottom: '1px solid #aaa', minWidth: 16, cursor: 'text', display: 'inline-block' }}
                      >{wEntry?.actual_weight ?? ''}</span>
                    )}
                  </div>
                )}

                {openAddRow === day && (
                  <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                    <div onClick={() => { onAddTask(null, ds); setOpenAddRow(null) }} style={addBtn}>+ Task</div>
                    <div onClick={() => { onAddEvent(new Date(year, month, day)); setOpenAddRow(null) }} style={addBtn}>+ Event</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const addBtn = {
  flex: 1, fontSize: 7, padding: '2px 3px', border: '1px solid #ccc',
  borderRadius: 4, background: '#f9f9f9', color: '#666', cursor: 'pointer',
  textAlign: 'center', fontWeight: 600,
}
