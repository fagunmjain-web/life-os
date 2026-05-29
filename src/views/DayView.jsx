import { useState } from 'react'
import { toDateStr } from '../utils.js'
import { useIsMobile } from '../hooks/useIsMobile.js'

export default function DayView({
  currentDate, getTasksForDate, isCompleted, getEventsForDate,
  toggleCompletion, deleteTask, deleteEvent, onEditTask, onAddTask, onAddEvent, onEditEvent,
  sections, getEventTypeStyle,
}) {
  const isMobile = useIsMobile()
  const dateStr = toDateStr(currentDate)
  const dayTasks = getTasksForDate(currentDate)
  const dayEvents = getEventsForDate(currentDate)
  const singleDayEvents = dayEvents.filter(e => !e.end_date || e.start_date === dateStr)
  const [tappedEvent, setTappedEvent] = useState(null)
  const [hoveredTask, setHoveredTask] = useState(null)

  const tasksBySection = {}
  sections.forEach(s => { tasksBySection[s.key] = dayTasks.filter(t => t.section === s.key) })
  const knownKeys = new Set(sections.map(s => s.key))
  const unassignedTasks = dayTasks.filter(t => !t.section || !knownKeys.has(t.section))

  return (
    <div style={{ paddingTop: 10 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: '1px solid #EBEBEB' }}>
        <div style={{ display: 'flex', gap: 20, flexDirection: isMobile ? 'column' : 'row' }}>

          {/* ── EVENTS column ── */}
          <div style={{ width: isMobile ? '100%' : 190, flexShrink: 0 }}>
            <div style={colLabel}>Events</div>
            {singleDayEvents.length === 0 && (
              <div style={{ fontSize: 13, color: '#ddd', marginBottom: 8, fontStyle: 'italic' }}>Nothing scheduled</div>
            )}
            {singleDayEvents.map(e => {
              const s = getEventTypeStyle(e.event_type)
              return (
                <div key={e.id}
                  onClick={() => setTappedEvent(tappedEvent === e.id ? null : e.id)}
                  style={{ background: s.lightBg, borderLeft: `3px solid ${s.bg}`, borderRadius: 8, padding: '8px 10px', marginBottom: 6, cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: s.labelColor }}>{e.title}</div>
                  {e.event_time && (
                    <div style={{ fontSize: 12, color: s.bg, marginTop: 2 }}>
                      {e.event_time}{e.end_time ? ` – ${e.end_time}` : ''}
                    </div>
                  )}
                  {tappedEvent === e.id && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      <button onClick={ev => { ev.stopPropagation(); onEditEvent(e); setTappedEvent(null) }} style={evActBtn('#EEF3EE','#2C3D2D','#C8D9C8')}>✎</button>
                      <button onClick={ev => { ev.stopPropagation(); deleteEvent(e.id); setTappedEvent(null) }} style={evActBtn('#FFEBEE','#C62828','#FFCDD2')}>✕</button>
                    </div>
                  )}
                </div>
              )
            })}
            <button onClick={() => onAddEvent(currentDate)}
              style={{ fontSize: 13, color: '#bbb', background: 'none', border: '1px dashed #e8e4de', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
            >+ Add event</button>
          </div>

          {/* Divider */}
          {isMobile
            ? <div style={{ height: 1, background: '#f0ece6' }} />
            : <div style={{ width: 1, background: '#f0ece6', flexShrink: 0 }} />
          }

          {/* ── TASKS column ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={colLabel}>Tasks</div>
            {sections.map(sec => {
              const secTasks = tasksBySection[sec.key] || []
              return (
                <div key={sec.key} style={{ marginBottom: 16 }}>
                  {/* Section header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <div style={{ width: 3, height: 14, borderRadius: 2, background: sec.cb, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: sec.cb }}>{sec.label}</span>
                  </div>
                  {/* Task rows */}
                  {secTasks.length === 0 ? (
                    <div style={{ paddingLeft: 10, fontSize: 13, color: '#ddd', paddingBottom: 4, fontStyle: 'italic' }}>Nothing here</div>
                  ) : secTasks.map(task => {
                    const done = isCompleted(task.id, dateStr)
                    return (
                      <div key={task.id}
                        onMouseEnter={() => setHoveredTask(task.id)}
                        onMouseLeave={() => setHoveredTask(null)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0 5px 10px', borderBottom: '1px solid #f5f2ec' }}
                      >
                        <div onClick={() => toggleCompletion(task.id, dateStr)} style={{
                          width: 15, height: 15, borderRadius: 4, border: `1.5px solid ${sec.cb}`,
                          flexShrink: 0, cursor: 'pointer',
                          background: done ? sec.cb : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all .15s',
                        }}>
                          {done && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 15, color: sec.ct, flex: 1, lineHeight: 1.4,
                          textDecoration: done ? 'line-through' : 'none',
                          opacity: done ? .4 : 1,
                        }}>{task.title}</span>
                        {task.time_of_day && <span style={{ fontSize: 12, color: '#bbb', flexShrink: 0 }}>{task.time_of_day}</span>}
                        {hoveredTask === task.id && (
                          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                            <button onClick={() => onEditTask(task)} style={evActBtn('#f5f5f5','#666','#e0e0e0')}>✎</button>
                            <button onClick={() => deleteTask(task.id)} style={evActBtn('#FFEBEE','#C62828','#FFCDD2')}>✕</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {onAddTask && (
                    <div onClick={() => onAddTask(sec.key, dateStr)}
                      style={{ paddingLeft: 10, paddingTop: 6, fontSize: 13, color: sec.cb, opacity: .6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2v8M2 6h8"/></svg>
                      Add task
                    </div>
                  )}
                </div>
              )
            })}
            {unassignedTasks.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                  <div style={{ width: 3, height: 14, borderRadius: 2, background: '#bbb', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#bbb' }}>Unassigned</span>
                </div>
                {unassignedTasks.map(task => {
                  const done = isCompleted(task.id, dateStr)
                  return (
                    <div key={task.id}
                      onMouseEnter={() => setHoveredTask(task.id)}
                      onMouseLeave={() => setHoveredTask(null)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0 5px 10px', borderBottom: '1px solid #f5f2ec' }}
                    >
                      <div onClick={() => toggleCompletion(task.id, dateStr)} style={{
                        width: 15, height: 15, borderRadius: 4, border: '1.5px solid #bbb',
                        flexShrink: 0, cursor: 'pointer', background: done ? '#bbb' : 'transparent',
                        transition: 'all .15s',
                      }} />
                      <span style={{ fontSize: 15, color: '#666', flex: 1, textDecoration: done ? 'line-through' : 'none', opacity: done ? .4 : 1 }}>{task.title}</span>
                      {task.time_of_day && <span style={{ fontSize: 12, color: '#bbb', flexShrink: 0 }}>{task.time_of_day}</span>}
                      {hoveredTask === task.id && (
                        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                          <button onClick={() => onEditTask(task)} style={evActBtn('#f5f5f5','#666','#e0e0e0')}>✎</button>
                          <button onClick={() => deleteTask(task.id)} style={evActBtn('#FFEBEE','#C62828','#FFCDD2')}>✕</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

const colLabel = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#aaa', marginBottom: 10 }

function evActBtn(bg, color, border) {
  return {
    width: 22, height: 22, borderRadius: 5,
    border: `1px solid ${border}`, background: bg, color,
    cursor: 'pointer', fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}
