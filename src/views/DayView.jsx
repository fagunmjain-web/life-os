import { useState } from 'react'
import { toDateStr } from '../utils.js'
import Section from '../components/Section.jsx'
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

  const tasksBySection = {}
  sections.forEach(s => { tasksBySection[s.key] = dayTasks.filter(t => t.section === s.key) })
  const knownKeys = new Set(sections.map(s => s.key))
  const unassignedTasks = dayTasks.filter(t => !t.section || !knownKeys.has(t.section))

  return (
    <div style={{ paddingTop: 10 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: '1px solid #EBEBEB' }}>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          {singleDayEvents.map(e => {
            const s = getEventTypeStyle(e.event_type)
            return (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span
                  onClick={() => setTappedEvent(tappedEvent === e.id ? null : e.id)}
                  style={{ background: s.bg, color: s.textColor, fontSize: 16, fontWeight: 600, padding: '6px 14px', borderRadius: 10, cursor: 'pointer' }}
                >{e.title}</span>
                {tappedEvent === e.id && (
                  <div style={{ display: 'flex', gap: 3 }}>
                    <button onClick={() => { onEditEvent(e); setTappedEvent(null) }} style={evActBtn('#EEF3EE','#2C3D2D','#C8D9C8')}>✎</button>
                    <button onClick={() => { deleteEvent(e.id); setTappedEvent(null) }} style={evActBtn('#FFEBEE','#C62828','#FFCDD2')}>✕</button>
                  </div>
                )}
              </div>
            )
          })}
          <button onClick={() => onAddEvent(currentDate)} style={{
            width: 28, height: 28, border: '1px solid #ddd', borderRadius: 8,
            background: '#fff', cursor: 'pointer', fontSize: 19, color: '#aaa',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>+</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 10 }}>
          {sections.map((sec, i) => {
            const isLast = i === sections.length - 1
            const isOdd = sections.length % 2 !== 0
            return (
              <div key={sec.key} style={isLast && isOdd && !isMobile ? { gridColumn: '1 / -1' } : {}}>
                <Section
                  sec={sec}
                  tasks={tasksBySection[sec.key] || []}
                  dateStr={dateStr}
                  isCompleted={isCompleted}
                  toggleCompletion={toggleCompletion}
                  onEditTask={onEditTask}
                  onDeleteTask={deleteTask}
                  onAddTask={onAddTask}
                />
              </div>
            )
          })}
          {unassignedTasks.length > 0 && (
            <div style={sections.length % 2 !== 0 && !isMobile ? { gridColumn: '1 / -1' } : {}}>
              <Section
                sec={{ key: '__unassigned', label: 'Unassigned', sh: '#f0f0f0', sb: '#fafafa', cb: '#aaa', ct: '#666' }}
                tasks={unassignedTasks}
                dateStr={dateStr}
                isCompleted={isCompleted}
                toggleCompletion={toggleCompletion}
                onEditTask={onEditTask}
                onDeleteTask={deleteTask}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function evActBtn(bg, color, border) {
  return {
    width: 22, height: 22, borderRadius: 5,
    border: `1px solid ${border}`, background: bg, color,
    cursor: 'pointer', fontSize: 15,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}
