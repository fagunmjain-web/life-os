import { useState } from 'react'
import { toDateStr, isFriday, isToday, startOfWeek, addDays, DAY_LABELS } from '../utils.js'
import Section from '../components/Section.jsx'

export default function WeekView({
  currentDate, setCurrentDate, setActiveView,
  getTasksForDate, isCompleted, getEventsForDate,
  getWeightTarget, getWeightEntry, hasOverdue,
  toggleCompletion, deleteTask, deleteEvent, onEditTask, onAddTask, onAddEvent, onEditEvent, sections,
}) {
  const weekStart = startOfWeek(currentDate)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const [tappedEvent, setTappedEvent] = useState(null)

  function goToDay(date) {
    setCurrentDate(date)
    setActiveView('Day')
  }

  return (
    <div style={{ paddingTop: 10 }}>
      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, minWidth: 700 }}>
          {days.map(day => {
            const dateStr = toDateStr(day)
            const dayTasks = getTasksForDate(day)
            const dayEvents = getEventsForDate(day)
            const weightTarget = getWeightTarget(dateStr)
            const today = isToday(day)
            const overdue = hasOverdue(day)
            const tasksBySection = {}
            sections.forEach(s => { tasksBySection[s.key] = dayTasks.filter(t => t.section === s.key) })
            const singleDayEvents = dayEvents.filter(e => !e.end_date || e.start_date === dateStr)

            return (
              <div key={dateStr} style={{
                background: '#fff', borderRadius: 14, padding: '12px 10px',
                border: today ? '1.5px solid #aaa' : '1px solid #EBEBEB',
                minHeight: 400, display: 'flex', flexDirection: 'column',
              }}>
                {/* Day header — clickable to go to day view */}
                <div
                  onClick={() => goToDay(day)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0, cursor: 'pointer' }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2C' }}>{DAY_LABELS[day.getDay()]}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2C' }}>{day.getDate()}</span>
                    {overdue && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F9A825' }} title="Overdue tasks" />}
                  </div>
                </div>

                {/* Weight — text only on Fridays */}
                {isFriday(day) && weightTarget && (
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#4A8C40', marginBottom: 5, flexShrink: 0 }}>
                    Wt: {weightTarget.target_weight}kg <span style={{ borderBottom: '1.5px solid #aaa', display: 'inline-block', width: 28, verticalAlign: 'bottom' }}></span>
                  </div>
                )}

                {/* Events — left aligned */}
                {singleDayEvents.length > 0 && (
                  <div style={{ flexShrink: 0, marginBottom: 4 }}>
                    {singleDayEvents.map(e => (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
                        <span
                          onClick={() => setTappedEvent(tappedEvent === e.id ? null : e.id)}
                          style={{
                            background: e.event_type === 'celebration' ? '#E57373' : e.event_type === 'travel' ? '#FFE0B2' : '#5B8ED6',
                            color: e.event_type === 'travel' ? '#4E2100' : '#fff',
                            fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
                            cursor: 'pointer', flex: 1,
                          }}>{e.title}</span>
                        {tappedEvent === e.id && (
                          <div style={{ display: 'flex', gap: 2 }}>
                            <button onClick={() => { onEditEvent(e); setTappedEvent(null) }} style={evActBtn('#E8F5E4','#2C4A24','#C8E6C0')}>✎</button>
                            <button onClick={() => { deleteEvent(e.id); setTappedEvent(null) }} style={evActBtn('#FFEBEE','#C62828','#FFCDD2')}>✕</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* + Add event */}
                <div onClick={() => onAddEvent(day)} style={{ fontSize: 9, color: '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, marginBottom: 6, flexShrink: 0 }}>
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#aaa" strokeWidth="2"><path d="M6 2v8M2 6h8"/></svg>
                  Add event
                </div>

                {/* Sections */}
                <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
                  {sections.map(sec => (
                    <Section key={sec.key} sec={sec}
                      tasks={tasksBySection[sec.key] || []}
                      dateStr={dateStr} isCompleted={isCompleted}
                      toggleCompletion={toggleCompletion}
                      onEditTask={onEditTask} onDeleteTask={deleteTask}
                      onAddTask={(key) => onAddTask(key, dateStr)} compact />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function evActBtn(bg, color, border) {
  return { width: 14, height: 14, borderRadius: 3, border: `1px solid ${border}`, background: bg, color, cursor: 'pointer', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }
}
