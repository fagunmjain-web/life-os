import { useState } from 'react'
import { toDateStr, startOfWeek, addDays } from '../utils.js'

const DOW_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DOW_KEYS    = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const ET_PRESET_COLORS = [
  { color: '#E57373', bg: '#FFEBEB', textColor: '#C62828' },
  { color: '#5B8ED6', bg: '#E6F1FB', textColor: '#185FA5' },
  { color: '#E65100', bg: '#FFF3E0', textColor: '#E65100' },
  { color: '#4A8C40', bg: '#E8F5E4', textColor: '#2C4A24' },
  { color: '#7B1FA2', bg: '#F3E5F5', textColor: '#3A1245' },
  { color: '#00796B', bg: '#E0F2F1', textColor: '#004D40' },
]

function Panel({ title, open, onToggle, children }) {
  return (
    <div style={{ borderBottom: '1px solid #f0ece6' }}>
      <div
        onClick={onToggle}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', userSelect: 'none' }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.07em' }}>{title}</span>
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#bbb" strokeWidth="1.8"
          style={{ flexShrink: 0, transition: 'transform .2s', transform: open ? 'rotate(-90deg)' : 'rotate(90deg)' }}>
          <path d="M3 2L7 5L3 8" />
        </svg>
      </div>
      {open && children}
    </div>
  )
}

export default function Sidebar({
  open, isMobile, onClose,
  tasks, completions, sections, eventTypes,
  currentDate, toggleCompletion, createTask,
  setDeleteConfirm, setSectionModal, setEventTypes,
}) {
  const [panelOpen, setPanelOpen] = useState({ todo: true, habits: true, taskSections: false, eventTypes: false })
  const [addingTodo, setAddingTodo]     = useState(false)
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [newEventType, setNewEventType] = useState(null)

  const weekStart = startOfWeek(currentDate)
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const unassigned = tasks.filter(t => {
    const hasDays = Array.isArray(t.days_of_week) && t.days_of_week.length > 0
    return !t.specific_date && !t.is_recurring && !hasDays
  })

  const recurring = tasks.filter(t => {
    const hasDays = Array.isArray(t.days_of_week) && t.days_of_week.length > 0
    return t.is_recurring || hasDays
  })

  function toggle(key) { setPanelOpen(p => ({ ...p, [key]: !p[key] })) }

  function isTaskDone(taskId, dateStr) {
    return completions.some(c => String(c.task_id) === String(taskId) && c.completed_date === dateStr)
  }

  function getSectionColor(sectionKey) {
    return sections.find(s => s.key === sectionKey)?.cb || '#aaa'
  }

  async function submitTodo() {
    if (!newTodoTitle.trim()) { setAddingTodo(false); return }
    await createTask({
      title: newTodoTitle.trim(),
      section: sections[0]?.key || null,
      is_recurring: false, days_of_week: [], specific_date: null, time_of_day: null,
    })
    setNewTodoTitle('')
    setAddingTodo(false)
  }

  function addEventType() {
    if (!newEventType?.name?.trim()) return
    const colors = ET_PRESET_COLORS[newEventType.colorIdx ?? 0]
    setEventTypes(prev => [...prev, {
      key: newEventType.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
      label: newEventType.name.trim(), ...colors,
    }])
    setNewEventType(null)
  }

  // 55px = header height (8px pad-top + 38px inner + 8px pad-bottom + 1px border)
  const sidebarStyle = isMobile
    ? {
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 200,
        width: open ? 190 : 0, overflow: 'hidden', transition: 'width .25s ease',
        background: '#fff', borderRight: '1.5px solid #cfc9c0',
      }
    : {
        position: 'sticky', top: 55, height: 'calc(100vh - 55px)', flexShrink: 0,
        width: open ? 190 : 0, overflow: 'hidden', transition: 'width .25s ease',
        background: '#fff', borderRight: open ? '1.5px solid #cfc9c0' : 'none',
      }

  return (
    <>
      {isMobile && open && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 199 }} />
      )}
      <div style={sidebarStyle}>
        <div style={{ width: 190, height: '100%', overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none' }}>

          {/* TO DO */}
          <Panel title="To Do" open={panelOpen.todo} onToggle={() => toggle('todo')}>
            <div style={{ paddingBottom: 6 }}>
              {unassigned.map(task => (
                <div key={task.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, fromSidebar: true }))
                  }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '4px 12px', cursor: 'grab' }}
                >
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: getSectionColor(task.section), flexShrink: 0, marginTop: 3 }} />
                  <span style={{ fontSize: 12, color: '#2C2C2C', lineHeight: 1.4, wordBreak: 'break-word' }}>{task.title}</span>
                </div>
              ))}
              {unassigned.length === 0 && !addingTodo && (
                <div style={{ fontSize: 11, color: '#ccc', padding: '2px 12px' }}>Nothing here</div>
              )}
              {addingTodo ? (
                <div style={{ padding: '4px 12px' }}>
                  <input autoFocus value={newTodoTitle}
                    onChange={e => setNewTodoTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitTodo(); if (e.key === 'Escape') { setAddingTodo(false); setNewTodoTitle('') } }}
                    onBlur={submitTodo}
                    placeholder="Task name…"
                    style={{ width: '100%', fontSize: 12, border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', outline: 'none', fontFamily: 'inherit', color: '#2C2C2C', padding: '2px 0', boxSizing: 'border-box' }}
                  />
                </div>
              ) : (
                <div onClick={() => setAddingTodo(true)} style={{ padding: '4px 12px', fontSize: 12, color: '#bbb', cursor: 'pointer' }}>
                  + Add new
                </div>
              )}
            </div>
          </Panel>

          {/* HABIT TRACKER */}
          <Panel title="Habit Tracker" open={panelOpen.habits} onToggle={() => toggle('habits')}>
            <div style={{ padding: '0 8px 8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(7, 16px)', gap: 1, padding: '0 4px 3px', alignItems: 'center' }}>
                <div />
                {DOW_LETTERS.map((l, i) => (
                  <div key={i} style={{ fontSize: 9, fontWeight: 700, color: '#bbb', textAlign: 'center' }}>{l}</div>
                ))}
              </div>
              {recurring.map(task => {
                const hasDays = Array.isArray(task.days_of_week) && task.days_of_week.length > 0
                const color   = getSectionColor(task.section)
                return (
                  <div key={task.id} style={{ display: 'grid', gridTemplateColumns: '1fr repeat(7, 16px)', gap: 1, padding: '2px 4px', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: '#2C2C2C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 2 }} title={task.title}>{task.title}</span>
                    {weekDays.map((day, di) => {
                      const ds = toDateStr(day)
                      const applicable = !hasDays || task.days_of_week.includes(DOW_KEYS[di])
                      const checked    = isTaskDone(task.id, ds)
                      return (
                        <div key={di}
                          onClick={() => applicable && toggleCompletion(task.id, ds)}
                          style={{
                            width: 12, height: 12, borderRadius: 2,
                            border: `1.5px solid ${applicable ? color : '#e0e0e0'}`,
                            background: checked && applicable ? color : 'transparent',
                            cursor: applicable ? 'pointer' : 'default',
                            opacity: applicable ? 1 : 0.25, justifySelf: 'center',
                            transition: 'background .1s',
                          }}
                        />
                      )
                    })}
                  </div>
                )
              })}
              {recurring.length === 0 && (
                <div style={{ fontSize: 11, color: '#ccc', padding: '2px 4px' }}>No habits yet</div>
              )}
            </div>
          </Panel>

          {/* TASK SECTIONS */}
          <Panel title="Task Sections" open={panelOpen.taskSections} onToggle={() => toggle('taskSections')}>
            <div style={{ paddingBottom: 6 }}>
              {sections.map(s => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: s.cb, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#2C2C2C', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                  <span onClick={() => setDeleteConfirm({ type: 'section', key: s.key, name: s.label })}
                    style={{ fontSize: 16, color: '#C62828', cursor: 'pointer', lineHeight: 1, flexShrink: 0, opacity: 0.6 }}>×</span>
                </div>
              ))}
              <div onClick={() => { if (isMobile) onClose(); setSectionModal(true) }}
                style={{ padding: '4px 12px', fontSize: 12, color: '#bbb', cursor: 'pointer' }}>
                + Add section
              </div>
            </div>
          </Panel>

          {/* EVENT TYPES */}
          <Panel title="Event Types" open={panelOpen.eventTypes} onToggle={() => toggle('eventTypes')}>
            <div style={{ paddingBottom: 6 }}>
              {eventTypes.map(et => (
                <div key={et.key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: et.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#2C2C2C', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{et.label}</span>
                  <span onClick={() => setDeleteConfirm({ type: 'eventType', key: et.key, name: et.label })}
                    style={{ fontSize: 16, color: '#C62828', cursor: 'pointer', lineHeight: 1, flexShrink: 0, opacity: 0.6 }}>×</span>
                </div>
              ))}
              {newEventType ? (
                <div style={{ margin: '4px 10px 6px', padding: '8px 10px', background: '#f9f9f6', borderRadius: 8 }}>
                  <input autoFocus placeholder="Type name"
                    value={newEventType.name}
                    onChange={e => setNewEventType(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addEventType()}
                    style={{ width: '100%', fontSize: 12, border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', outline: 'none', fontFamily: 'inherit', marginBottom: 7, color: '#2C2C2C', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 7 }}>
                    {ET_PRESET_COLORS.map((c, i) => (
                      <div key={i} onClick={() => setNewEventType(p => ({ ...p, colorIdx: i }))}
                        style={{ width: 14, height: 14, borderRadius: 3, background: c.color, cursor: 'pointer',
                          border: newEventType.colorIdx === i ? '2px solid #2C2C2C' : '2px solid transparent' }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={addEventType} style={{ fontSize: 11, padding: '3px 8px', background: '#2C2C2C', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                    <button onClick={() => setNewEventType(null)} style={{ fontSize: 11, padding: '3px 8px', background: '#f0f0f0', color: '#888', border: 'none', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => setNewEventType({ name: '', colorIdx: 0 })}
                  style={{ padding: '4px 12px', fontSize: 12, color: '#bbb', cursor: 'pointer' }}>
                  + Add event type
                </div>
              )}
            </div>
          </Panel>

        </div>
      </div>
    </>
  )
}
