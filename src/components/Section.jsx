import { useState } from 'react'

function Chevron({ open }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', transition: 'transform .2s', transform: open ? 'rotate(0deg)' : 'rotate(180deg)', opacity: 0.5 }}>
      <path d="M2 8L6 4L10 8" />
    </svg>
  )
}

export default function Section({
  sec, tasks, dateStr, isCompleted, toggleCompletion,
  onEditTask, onDeleteTask, onAddTask,
  onDragTask,   // optional: (task) => void, enables drag on tasks
  isPast,       // optional: true when this day is before today
  compact = false,
}) {
  const [open, setOpen] = useState(true)
  const [hoveredTask, setHoveredTask] = useState(null)

  const pad = compact ? '6px 8px' : '9px 12px'
  const fontSize = compact ? 12 : 16
  const taskFontSize = compact ? 12 : 16

  // Section greyscale: only grey when past AND no incomplete tasks
  const hasIncomplete = tasks.some(t => !isCompleted(t.id, dateStr))
  const shouldGrey = isPast && !hasIncomplete

  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden', marginBottom: compact ? 4 : 6,
      filter: shouldGrey ? 'grayscale(0.85)' : 'none',
      opacity: shouldGrey ? 0.55 : 1,
      transition: 'filter .2s, opacity .2s',
    }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: pad, cursor: 'pointer', fontSize, fontWeight: 700,
        background: sec.sh, color: sec.ct,
        borderRadius: open ? '12px 12px 0 0' : 12, userSelect: 'none',
      }}>
        <span>{sec.label}</span>
        <Chevron open={open} />
      </div>

      {open && (
        <div style={{ background: sec.sb, padding: compact ? '4px 8px 6px' : '8px 12px 10px', borderRadius: '0 0 12px 12px' }}>
          {tasks.length === 0 ? (
            <div style={{ fontSize: taskFontSize, opacity: .35, padding: '2px 0', color: sec.ct }}>—</div>
          ) : tasks.map(task => (
            <div
              key={task.id}
              draggable={!!onDragTask}
              onDragStart={onDragTask ? (e) => {
                e.dataTransfer.effectAllowed = 'move'
                onDragTask(task)
              } : undefined}
              onMouseEnter={() => setHoveredTask(task.id)}
              onMouseLeave={() => setHoveredTask(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0',
                borderBottom: '0.5px solid rgba(0,0,0,0.04)',
                cursor: onDragTask ? 'grab' : 'default',
              }}
            >
              <div onClick={() => toggleCompletion(task.id, dateStr)} style={{
                width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${sec.cb}`,
                flexShrink: 0, cursor: 'pointer',
                background: isCompleted(task.id, dateStr) ? sec.cb : 'transparent',
                transition: 'all .15s',
              }} />
              <span style={{
                fontSize: taskFontSize, color: sec.ct, flex: 1, lineHeight: 1.4,
                textDecoration: isCompleted(task.id, dateStr) ? 'line-through' : 'none',
                opacity: isCompleted(task.id, dateStr) ? .4 : 1,
                whiteSpace: 'normal', overflow: 'visible', textOverflow: 'unset',
              }}>{task.title}</span>
              {task.time_of_day && (
                <span style={{ fontSize: 13, color: sec.cb, opacity: .7, flexShrink: 0 }}>{task.time_of_day}</span>
              )}
              {hoveredTask === task.id && (
                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                  <button onClick={() => onEditTask(task)} style={{
                    width: 20, height: 20, borderRadius: 4, border: `1px solid ${sec.sh}`,
                    background: sec.sb, color: sec.ct, cursor: 'pointer', fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>✎</button>
                  <button onClick={() => onDeleteTask(task.id)} style={{
                    width: 20, height: 20, borderRadius: 4, border: '1px solid #F5C6C6',
                    background: '#FFF0F0', color: '#C62828', cursor: 'pointer', fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>✕</button>
                </div>
              )}
            </div>
          ))}

          {onAddTask && (
            <div onClick={() => onAddTask(sec.key, dateStr)} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 0 2px',
              fontSize: compact ? 12 : 13, color: sec.cb, cursor: 'pointer', opacity: .7,
            }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2v8M2 6h8"/>
              </svg>
              Add task
            </div>
          )}
        </div>
      )}
    </div>
  )
}
