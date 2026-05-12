import { useState } from 'react'
import { toDateStr, isFriday, isToday, startOfWeek, addDays } from '../utils.js'
import { useIsMobile } from '../hooks/useIsMobile.js'

const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function Chevron({ open }) {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8"
      style={{ flexShrink: 0, transition: 'transform .2s', transform: open ? 'rotate(-90deg)' : 'rotate(90deg)' }}>
      <path d="M3 2L7 5L3 8" />
    </svg>
  )
}

export default function WeekView({
  currentDate, setCurrentDate, setActiveView,
  tasks, getTasksForDate, isCompleted, getEventsForDate,
  getWeightTarget, getWeightEntry,
  toggleCompletion, saveWeight, deleteTask, deleteEvent,
  onEditTask, onAddTask, onAddEvent, onEditEvent,
  sections, getEventTypeStyle, moveTask, createEventFromTask,
}) {
  const isMobile = useIsMobile()
  const weekStart = startOfWeek(currentDate)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const [tappedEvent, setTappedEvent]           = useState(null)
  const [editingWeightDate, setEditingWeightDate] = useState(null)
  const [weightVal, setWeightVal]               = useState('')
  const [dragOver, setDragOver]                 = useState(null)
  const [openSections, setOpenSections]         = useState({})
  const [hoveredTask, setHoveredTask]           = useState(null)

  const todayStr = toDateStr(new Date())

  function secIsOpen(dateStr, sectionKey) {
    const k = `${dateStr}_${sectionKey}`
    return k in openSections ? openSections[k] : true
  }
  function toggleSec(dateStr, sectionKey) {
    const k = `${dateStr}_${sectionKey}`
    setOpenSections(p => ({ ...p, [k]: !secIsOpen(dateStr, sectionKey) }))
  }

  function handleWeightBlur(ds) {
    setEditingWeightDate(null)
    if (weightVal !== '' && !isNaN(weightVal)) saveWeight(ds, parseFloat(weightVal))
  }

  function parseDrag(e) {
    try { return JSON.parse(e.dataTransfer.getData('application/json')) } catch { return null }
  }

  function handleDrop(e, targetDateStr, area) {
    e.preventDefault()
    setDragOver(null)
    const data = parseDrag(e)
    if (!data) return
    const task = tasks?.find(t => String(t.id) === String(data.taskId))
    if (!task) return
    if (area === 'events' && data.fromSidebar) {
      createEventFromTask(task, targetDateStr)
      return
    }
    if (data.fromSidebar || data.fromDateStr !== targetDateStr) {
      moveTask(task, targetDateStr)
    }
  }

  const isOver = (dateStr, area) => dragOver?.dateStr === dateStr && dragOver?.area === area

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{
        display: isMobile ? 'flex' : 'grid',
        flexDirection: isMobile ? 'column' : undefined,
        gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))',
        gap: 0,
        overflowX: isMobile ? undefined : 'auto',
      }}>
        {days.map((day, di) => {
          const dateStr     = toDateStr(day)
          const dayTasks    = getTasksForDate(day)
          const dayEvents   = getEventsForDate(day)
          const wtTarget    = getWeightTarget(dateStr)
          const wtEntry     = getWeightEntry(dateStr)
          const today       = isToday(day)
          const isPast      = dateStr < todayStr

          const tasksBySection = {}
          sections.forEach(s => { tasksBySection[s.key] = dayTasks.filter(t => t.section === s.key) })

          const headerBg = today ? '#f5f0e8' : (isPast ? '#e0ddd8' : '#ede5d8')
          const colBg    = isPast && !today ? '#faf8f4' : '#fff'
          const dimmed   = { filter: 'grayscale(0.9)', opacity: 0.55 }

          return (
            <div key={dateStr} style={{
              background: colBg,
              display: 'flex', flexDirection: 'column',
              minHeight: isMobile ? 'auto' : 360,
              borderRight: di < 6 ? '1px solid #e0d9d0' : 'none',
            }}>

              {/* DAY HEADER */}
              <div
                onClick={() => { setCurrentDate(day); setActiveView('Day') }}
                style={{
                  background: headerBg,
                  borderBottom: '1.5px solid #c0b8ae',
                  padding: '6px 10px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', flexShrink: 0,
                  ...(isPast ? dimmed : {}),
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 400, color: '#2C2C2C' }}>{DAY_ABBREV[day.getDay()]}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2C2C2C' }}>{day.getDate()}</span>
              </div>

              {/* WEIGHT ROW (Fridays only) */}
              {isFriday(day) && wtTarget && (
                <div style={{ padding: '4px 10px 0', flexShrink: 0, ...(isPast ? dimmed : {}) }}>
                  <span style={{ fontSize: 11, color: '#4A8C40', fontWeight: 600 }}>
                    Wt: {wtTarget.target_weight}kg{' '}
                  </span>
                  {editingWeightDate === dateStr ? (
                    <input
                      autoFocus type="number" step="0.1" value={weightVal}
                      onChange={e => setWeightVal(e.target.value)}
                      onBlur={() => handleWeightBlur(dateStr)}
                      style={{ fontSize: 11, color: '#2C2C2C', border: 'none', borderBottom: '1px solid #aaa', background: 'transparent', outline: 'none', width: 36, fontFamily: 'inherit', fontWeight: 600 }}
                    />
                  ) : (
                    <span
                      onClick={() => { setEditingWeightDate(dateStr); setWeightVal(wtEntry?.actual_weight ?? '') }}
                      style={{ fontSize: 11, color: '#2C2C2C', borderBottom: '1px solid #aaa', minWidth: 28, display: 'inline-block', cursor: 'text', fontWeight: 600 }}
                    >{wtEntry?.actual_weight ?? ''}</span>
                  )}
                </div>
              )}

              {/* EVENTS AREA */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver({ dateStr, area: 'events' }) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => handleDrop(e, dateStr, 'events')}
                style={{
                  padding: '6px 10px 4px', flexShrink: 0,
                  background: isOver(dateStr, 'events') ? '#eef4ff' : 'transparent',
                  transition: 'background .1s',
                  ...(isPast ? dimmed : {}),
                }}
              >
                {dayEvents.map(ev => {
                  const s = getEventTypeStyle(ev.event_type)
                  return (
                    <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.bg, flexShrink: 0 }} />
                      <span
                        onClick={() => setTappedEvent(tappedEvent === ev.id ? null : ev.id)}
                        style={{ fontSize: 11, color: s.labelColor, fontWeight: 500, flex: 1, cursor: 'pointer', lineHeight: 1.3 }}
                      >{ev.title}</span>
                      {tappedEvent === ev.id && (
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                          <button onClick={() => { onEditEvent(ev); setTappedEvent(null) }} style={evBtn}>✎</button>
                          <button onClick={() => { deleteEvent(ev.id); setTappedEvent(null) }} style={{ ...evBtn, color: '#C62828' }}>✕</button>
                        </div>
                      )}
                    </div>
                  )
                })}
                <div onClick={() => onAddEvent(day)} style={{ fontSize: 11, color: '#bbb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, paddingTop: 1 }}>
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#bbb" strokeWidth="2"><path d="M6 2v8M2 6h8" /></svg>
                  Add event
                </div>
              </div>

              {/* TASK SECTIONS */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver({ dateStr, area: 'tasks' }) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => handleDrop(e, dateStr, 'tasks')}
                style={{
                  flex: 1, overflowY: 'auto', scrollbarWidth: 'none',
                  padding: '4px 0 8px',
                  background: isOver(dateStr, 'tasks') ? '#f5f9f0' : 'transparent',
                  transition: 'background .1s',
                }}
              >
                {sections.map(sec => {
                  const secTasks      = tasksBySection[sec.key] || []
                  const hasIncomplete = secTasks.some(t => !isCompleted(t.id, dateStr))
                  const secGrey       = isPast && !hasIncomplete
                  const isOpen        = secIsOpen(dateStr, sec.key)

                  return (
                    <div key={sec.key} style={{
                      marginBottom: 5,
                      filter: secGrey ? 'grayscale(0.9)' : 'none',
                      opacity: secGrey ? 0.5 : 1,
                      transition: 'filter .2s, opacity .2s',
                    }}>
                      {/* Section header */}
                      <div
                        onClick={() => toggleSec(dateStr, sec.key)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '3px 10px',
                          borderBottom: `1.5px solid ${sec.sh}`,
                          cursor: 'pointer', userSelect: 'none',
                          color: sec.cb,
                        }}
                      >
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{sec.label}</span>
                        <Chevron open={isOpen} />
                      </div>

                      {isOpen && (
                        <div>
                          {secTasks.map(task => (
                            <div key={task.id}
                              draggable
                              onDragStart={e => {
                                e.dataTransfer.effectAllowed = 'move'
                                e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, fromDateStr: dateStr }))
                              }}
                              onMouseEnter={() => setHoveredTask(task.id)}
                              onMouseLeave={() => setHoveredTask(null)}
                              style={{
                                display: 'flex', alignItems: 'flex-start', gap: 6,
                                padding: '4px 10px',
                                borderBottom: '1px dotted rgba(0,0,0,0.12)',
                                cursor: 'grab',
                              }}
                            >
                              <div
                                onClick={() => toggleCompletion(task.id, dateStr)}
                                style={{
                                  width: 12, height: 12, borderRadius: 3,
                                  border: `1.5px solid ${sec.cb}`,
                                  flexShrink: 0, cursor: 'pointer', marginTop: 1,
                                  background: isCompleted(task.id, dateStr) ? sec.cb : 'transparent',
                                  transition: 'background .1s',
                                }}
                              />
                              <span style={{
                                fontSize: 12, color: '#2C2C2C', flex: 1, lineHeight: 1.4,
                                textDecoration: isCompleted(task.id, dateStr) ? 'line-through' : 'none',
                                opacity: isCompleted(task.id, dateStr) ? 0.4 : 1,
                                wordBreak: 'break-word',
                              }}>{task.title}</span>
                              {task.time_of_day && hoveredTask !== task.id && (
                                <span style={{ fontSize: 10, color: '#bbb', flexShrink: 0, alignSelf: 'center', whiteSpace: 'nowrap' }}>
                                  {task.time_of_day.slice(0, 5)}
                                </span>
                              )}
                              {hoveredTask === task.id && (
                                <div style={{ display: 'flex', gap: 2, flexShrink: 0, alignSelf: 'center' }}>
                                  <button onClick={() => onEditTask(task)} style={taskBtn}>✎</button>
                                  <button onClick={() => deleteTask(task.id)} style={{ ...taskBtn, color: '#C62828' }}>✕</button>
                                </div>
                              )}
                            </div>
                          ))}
                          <div
                            onClick={() => onAddTask(sec.key, dateStr)}
                            style={{ padding: '4px 10px', fontSize: 11, color: sec.cb, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, opacity: 0.75 }}
                          >
                            <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2v8M2 6h8" /></svg>
                            Add task
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}

const evBtn = {
  width: 16, height: 16, borderRadius: 3, border: 'none', background: '#f0f0f0',
  color: '#555', cursor: 'pointer', fontSize: 9,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0,
}

const taskBtn = {
  width: 16, height: 16, borderRadius: 3, border: 'none', background: '#f0f0f0',
  color: '#555', cursor: 'pointer', fontSize: 9,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0,
}
