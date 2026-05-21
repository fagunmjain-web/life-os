import { useState } from 'react'
import { isToday, getDaysInMonth, getFirstDayOfMonth, getFridaysInMonth } from '../utils.js'

const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function MonthView({
  currentDate, setCurrentDate, setActiveView,
  events, weightTargets, weightEntries, sections,
  getTasksForDate, isCompleted, hasOverdue, isFullyDone,
  getWeightTarget, getWeightEntry,
  saveWeight, onAddEvent, onAddTask, getEventTypeStyle,
}) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const totalDays = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const fridays = getFridaysInMonth(year, month)
  const numRows = Math.ceil((firstDay + totalDays) / 7)

  const [openAddRow, setOpenAddRow] = useState(null)
  const [editingWeight, setEditingWeight] = useState(null)
  const [weightVal, setWeightVal] = useState('')
  const [hoveredDay, setHoveredDay] = useState(null)

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

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
    return events.filter(e => {
      if (e.end_date && e.event_type === 'travel') return ds >= e.start_date && ds <= e.end_date
      return e.start_date === ds && !e.end_date
    })
  }

  function getTaskBoxes(day) {
    const date = new Date(year, month, day)
    const dayTasks = getTasksForDate(date)
    const dateStr = getDateStr(day)
    return sections
      .map(sec => ({
        sec,
        tasks: dayTasks.filter(t => t.section === sec.key && !isCompleted(t.id, dateStr)),
      }))
      .filter(({ tasks }) => tasks.length > 0)
  }

  function goToDay(day) {
    setCurrentDate(new Date(year, month, day))
    setActiveView('Day')
  }

  function handleWeightBlur(ds) {
    setEditingWeight(null)
    if (weightVal !== '' && !isNaN(weightVal)) saveWeight(ds, parseFloat(weightVal))
  }

  const rangeBg = '#F7F0E0'

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Day-of-week header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4, padding: '0 4px' }}>
        {DOW.map(d => (
          <div key={d} style={{ fontSize: 14, fontWeight: 600, color: d === 'Fri' ? '#6F8F72' : '#aaa', textAlign: 'center', padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid — fills viewport, rows stretch equally */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gridTemplateRows: `repeat(${numRows}, 1fr)`,
        gap: 4,
        height: 'calc(100vh - 160px)',
        padding: '0 4px 4px',
      }}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e${i}`} />
        ))}

        {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
          const ds = getDateStr(day)
          const range = getRangeInfo(day)
          const dayEvents = getDayEvents(day)
          const today = isToday(new Date(year, month, day))
          const overdue = hasOverdue(new Date(year, month, day))
          const fullyDone = isFullyDone ? isFullyDone(new Date(year, month, day)) : false
          const wTarget = getWeightTarget(ds)
          const wEntry = getWeightEntry(ds)
          const showWt = fridays.includes(day)
          const boxes = getTaskBoxes(day)
          const addOpen = openAddRow === day
          const isPast = ds < todayStr
          const expanded = hoveredDay === day

          let bg = '#fff', br = '8px', border = '1px solid #f0f0f0', shadow = 'none'
          if (range === 'start') { bg = rangeBg; br = '8px 0 0 8px'; border = 'none' }
          if (range === 'mid')   { bg = rangeBg; br = '0';            border = 'none' }
          if (range === 'end')   { bg = rangeBg; br = '0 8px 8px 0'; border = 'none' }
          if (today)             { border = 'none'; shadow = '0 2px 10px rgba(0,0,0,0.1)' }

          return (
            <div
              key={day}
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              onClick={() => setHoveredDay(prev => prev === day ? null : day)}
              style={{
                background: bg, borderRadius: br, border, boxShadow: shadow,
                padding: '4px 3px',
                display: 'flex', flexDirection: 'column', gap: 2,
                overflow: 'hidden',
                filter: fullyDone ? 'grayscale(1)' : 'none',
                opacity: fullyDone ? 0.55 : 1,
                cursor: 'default',
              }}
            >
              {/* Header row: + toggle | date number */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                  {overdue && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F9A825', flexShrink: 0 }} />}
                  <div
                    onClick={e => { e.stopPropagation(); setOpenAddRow(addOpen ? null : day) }}
                    style={{ width: 13, height: 13, border: '1px solid #ccc', borderRadius: 3, background: addOpen ? '#2C2C2C' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: addOpen ? '#fff' : '#aaa', cursor: 'pointer', flexShrink: 0 }}
                  >+</div>
                  {addOpen && (
                    <div style={{ display: 'flex', gap: 2, flex: 1, minWidth: 0 }}>
                      <div onClick={e => { e.stopPropagation(); onAddTask(null, ds); setOpenAddRow(null) }}
                        style={{ fontSize: 6, padding: '1px 3px', background: '#2C2C2C', color: '#fff', borderRadius: 3, cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}>Task</div>
                      <div onClick={e => { e.stopPropagation(); onAddEvent(new Date(year, month, day)); setOpenAddRow(null) }}
                        style={{ fontSize: 6, padding: '1px 3px', background: '#4F7DB3', color: '#fff', borderRadius: 3, cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}>Event</div>
                    </div>
                  )}
                </div>
                {today ? (
                  <div onClick={e => { e.stopPropagation(); goToDay(day) }} style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: '#4F7DB3', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                  }}>{day}</div>
                ) : (
                  <span onClick={e => { e.stopPropagation(); goToDay(day) }} style={{ fontSize: 15, fontWeight: 700, color: range ? '#573A12' : '#2C2C2C', cursor: 'pointer', flexShrink: 0 }}>{day}</span>
                )}
              </div>

              {/* Scrollable content area */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayEvents.map(e => {
                  const s = getEventTypeStyle(e.event_type)
                  return (
                    <div key={e.id} style={{
                      fontSize: 11, fontWeight: 600, padding: '1px 4px', borderRadius: 4,
                      background: s.bg, color: s.textColor, flexShrink: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{e.title}</div>
                  )
                })}

                {boxes.map(({ sec, tasks }) => (
                  <div key={sec.key} style={{
                    background: sec.sb, borderRadius: 6, padding: '4px 8px', flexShrink: 0,
                    width: '100%', boxSizing: 'border-box',
                  }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: sec.ct }}>
                      {isPast ? `${tasks.length} pending` : `${tasks.length} tasks`}
                    </div>
                    {expanded && tasks.map(t => (
                      <div key={t.id} style={{ fontSize: 7, color: sec.ct, lineHeight: 1.4, marginTop: 1 }}>{t.title}</div>
                    ))}
                  </div>
                ))}

                {showWt && wTarget && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 'auto' }} onClick={e => e.stopPropagation()}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: '#6F8F72' }}>Wt:{wTarget.target_weight}kg</span>
                    {editingWeight === ds ? (
                      <input autoFocus type="number" step="0.1" value={weightVal}
                        onChange={e => setWeightVal(e.target.value)}
                        onBlur={() => handleWeightBlur(ds)}
                        style={{ fontSize: 8, fontWeight: 700, color: '#2C2C2C', border: 'none', borderBottom: '1px solid #aaa', background: 'transparent', outline: 'none', width: 26, fontFamily: 'inherit' }}
                      />
                    ) : (
                      <span onClick={() => { setEditingWeight(ds); setWeightVal(wEntry?.actual_weight ?? '') }}
                        style={{ fontSize: 8, fontWeight: 700, color: '#2C2C2C', borderBottom: '1px solid #aaa', minWidth: 16, cursor: 'text', display: 'inline-block' }}
                      >{wEntry?.actual_weight ?? ''}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
