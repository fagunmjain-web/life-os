import { useState, useRef } from 'react'
import { toDateStr, isFriday, isToday, startOfWeek, addDays, DAY_LABELS } from '../utils.js'
import Section from '../components/Section.jsx'
import { useIsMobile } from '../hooks/useIsMobile.js'

export default function WeekView({
  currentDate, setCurrentDate, setActiveView,
  getTasksForDate, isCompleted, getEventsForDate,
  getWeightTarget, getWeightEntry, hasOverdue,
  toggleCompletion, saveWeight, deleteTask, deleteEvent,
  onEditTask, onAddTask, onAddEvent, onEditEvent,
  sections, getEventTypeStyle, moveTask,
}) {
  const isMobile = useIsMobile()
  const weekStart = startOfWeek(currentDate)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const [tappedEvent, setTappedEvent] = useState(null)
  const [editingWeightDate, setEditingWeightDate] = useState(null)
  const [weightVal, setWeightVal] = useState('')
  const [dragOver, setDragOver] = useState(null)
  const dragRef = useRef(null)  // { task, fromDateStr }

  const todayStr = toDateStr(new Date())

  function goToDay(date) {
    setCurrentDate(date)
    setActiveView('Day')
  }

  function handleWeightBlur(ds) {
    setEditingWeightDate(null)
    if (weightVal !== '' && !isNaN(weightVal)) saveWeight(ds, parseFloat(weightVal))
  }

  return (
    <div style={{ paddingTop: 10 }}>
      <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : undefined, gridTemplateColumns: 'repeat(7, minmax(140px, 1fr))', gap: 8, overflowX: isMobile ? undefined : 'auto' }}>
        {days.map(day => {
          const dateStr = toDateStr(day)
          const dayTasks = getTasksForDate(day)
          const dayEvents = getEventsForDate(day)
          const weightTarget = getWeightTarget(dateStr)
          const weightEntry = getWeightEntry(dateStr)
          const today = isToday(day)
          const overdue = hasOverdue(day)
          const isPast = dateStr < todayStr
          const tasksBySection = {}
          sections.forEach(s => { tasksBySection[s.key] = dayTasks.filter(t => t.section === s.key) })
          const singleDayEvents = dayEvents
          const isDropTarget = dragOver === dateStr

          return (
            <div
              key={dateStr}
              onDragOver={e => { e.preventDefault(); setDragOver(dateStr) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => {
                e.preventDefault()
                setDragOver(null)
                if (!dragRef.current) return
                const { task, fromDateStr } = dragRef.current
                if (fromDateStr !== dateStr && moveTask) moveTask(task, dateStr)
                dragRef.current = null
              }}
              style={{
                background: '#fff', borderRadius: 14, padding: '12px 10px',
                border: today ? '1.5px solid #aaa' : isDropTarget ? '1.5px dashed #5B8ED6' : '1px solid #EBEBEB',
                minHeight: isMobile ? 'auto' : 400, display: 'flex', flexDirection: 'column',
                transition: 'border-color .15s',
              }}
            >
              <div
                onClick={() => goToDay(day)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0, cursor: 'pointer' }}
              >
                <span style={{ fontSize: 16, fontWeight: 700, color: '#2C2C2C' }}>{DAY_LABELS[day.getDay()]}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#2C2C2C' }}>{day.getDate()}</span>
                  {overdue && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F9A825' }} title="Overdue tasks" />}
                </div>
              </div>

              {isFriday(day) && weightTarget && (
                <div style={{ fontSize: 11, fontWeight: 700, color: '#4A8C40', marginBottom: 5, flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span>Wt: {weightTarget.target_weight}kg</span>
                  {editingWeightDate === dateStr ? (
                    <input
                      autoFocus type="number" step="0.1" value={weightVal}
                      onChange={e => setWeightVal(e.target.value)}
                      onBlur={() => handleWeightBlur(dateStr)}
                      style={{ fontSize: 11, fontWeight: 700, color: '#2C2C2C', border: 'none', borderBottom: '1.5px solid #aaa', background: 'transparent', outline: 'none', width: 32, fontFamily: 'inherit' }}
                    />
                  ) : (
                    <span
                      onClick={() => { setEditingWeightDate(dateStr); setWeightVal(weightEntry?.actual_weight ?? '') }}
                      style={{ borderBottom: '1.5px solid #aaa', display: 'inline-block', minWidth: 28, cursor: 'text', color: '#2C2C2C' }}
                    >{weightEntry?.actual_weight ?? ''}</span>
                  )}
                </div>
              )}

              {singleDayEvents.length > 0 && (
                <div style={{ flexShrink: 0, marginBottom: 4 }}>
                  {singleDayEvents.map(e => {
                    const s = getEventTypeStyle(e.event_type)
                    return (
                      <div
                        key={e.id}
                        draggable
                        onDragStart={ev => {
                          ev.dataTransfer.effectAllowed = 'move'
                          dragRef.current = { task: null, event: e, fromDateStr: dateStr }
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3, cursor: 'grab' }}
                      >
                        <span
                          onClick={() => setTappedEvent(tappedEvent === e.id ? null : e.id)}
                          style={{ background: s.bg, color: s.textColor, fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 5, cursor: 'pointer', flex: 1 }}
                        >{e.title}</span>
                        {tappedEvent === e.id && (
                          <div style={{ display: 'flex', gap: 2 }}>
                            <button onClick={() => { onEditEvent(e); setTappedEvent(null) }} style={evActBtn('#E8F5E4','#2C4A24','#C8E6C0')}>✎</button>
                            <button onClick={() => { deleteEvent(e.id); setTappedEvent(null) }} style={evActBtn('#FFEBEE','#C62828','#FFCDD2')}>✕</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div onClick={() => onAddEvent(day)} style={{ fontSize: 11, color: '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, marginBottom: 6, flexShrink: 0 }}>
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#aaa" strokeWidth="2"><path d="M6 2v8M2 6h8"/></svg>
                Add event
              </div>

              <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
                {sections.map(sec => (
                  <Section
                    key={sec.key}
                    sec={sec}
                    tasks={tasksBySection[sec.key] || []}
                    dateStr={dateStr}
                    isCompleted={isCompleted}
                    toggleCompletion={toggleCompletion}
                    onEditTask={onEditTask}
                    onDeleteTask={deleteTask}
                    onAddTask={(key) => onAddTask(key, dateStr)}
                    isPast={isPast}
                    onDragTask={(task) => { dragRef.current = { task, fromDateStr: dateStr } }}
                    compact
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function evActBtn(bg, color, border) {
  return { width: 14, height: 14, borderRadius: 3, border: `1px solid ${border}`, background: bg, color, cursor: 'pointer', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }
}
