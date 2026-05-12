import { useState, useRef, useEffect } from 'react'
import { toDateStr, startOfWeek, addDays } from '../utils.js'

const DOW_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DOW_KEYS    = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DEFAULT_WIDTH = 220
const MIN_WIDTH     = 160
const MAX_WIDTH     = 360

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
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.07em' }}>{title}</span>
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
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem('sidebarWidth')
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH
  })
  const [isResizing, setIsResizing] = useState(false)
  const resizeStartRef = useRef(null) // { startX, startW }

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

  // ── Resize drag ─────────────────────────────────────────────────────────────
  function startResize(e) {
    e.preventDefault()
    resizeStartRef.current = { startX: e.clientX, startW: sidebarWidth }
    setIsResizing(true)

    function onMove(e) {
      const { startX, startW } = resizeStartRef.current
      const newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + (e.clientX - startX)))
      setSidebarWidth(newW)
    }

    function onUp(e) {
      const { startX, startW } = resizeStartRef.current
      const finalW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + (e.clientX - startX)))
      localStorage.setItem('sidebarWidth', String(finalW))
      setIsResizing(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }
  // ────────────────────────────────────────────────────────────────────────────

  // 55px = header height (8px top-pad + 38px inner + 8px bottom-pad + 1px border)
  const outerStyle = isMobile
    ? {
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 200,
        width: open ? sidebarWidth : 0,
        overflow: 'hidden',
        transition: isResizing ? 'none' : 'width .25s ease',
        background: '#fff', borderRight: '1.5px solid #cfc9c0',
        flexShrink: 0,
      }
    : {
        position: 'sticky', top: 55, height: 'calc(100vh - 55px)', flexShrink: 0,
        width: open ? sidebarWidth : 0,
        overflow: 'hidden',
        transition: isResizing ? 'none' : 'width .25s ease',
        background: '#fff', borderRight: open ? '1.5px solid #cfc9c0' : 'none',
      }

  return (
    <>
      {/* Full-screen overlay during resize keeps cursor and prevents selection */}
      {isResizing && (
        <div style={{ position: 'fixed', inset: 0, cursor: 'col-resize', zIndex: 9999, userSelect: 'none' }} />
      )}

      {isMobile && open && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 199 }} />
      )}

      <div style={outerStyle}>
        {/* Scrollable content — fixed width so it clips correctly during open/close */}
        <div style={{ width: sidebarWidth, height: '100%', overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none' }}>

          {/* TO DO */}
          <Panel title="To Do" open={panelOpen.todo} onToggle={() => toggle('todo')}>
            <div style={{ padding: '0 14px 12px' }}>
              {unassigned.map(task => (
                <div key={task.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, fromSidebar: true }))
                  }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', cursor: 'grab', borderBottom: '1px solid #f5f2ee' }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: getSectionColor(task.section), flexShrink: 0, marginTop: 4 }} />
                  <span style={{ fontSize: 13, color: '#2C2C2C', lineHeight: 1.4, wordBreak: 'break-word' }}>{task.title}</span>
                </div>
              ))}
              {unassigned.length === 0 && !addingTodo && (
                <div style={{ fontSize: 12, color: '#ccc', paddingTop: 4 }}>Nothing here</div>
              )}
              {addingTodo ? (
                <div style={{ paddingTop: 6 }}>
                  <input autoFocus value={newTodoTitle}
                    onChange={e => setNewTodoTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitTodo(); if (e.key === 'Escape') { setAddingTodo(false); setNewTodoTitle('') } }}
                    onBlur={submitTodo}
                    placeholder="Task name…"
                    style={{ width: '100%', fontSize: 13, border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', outline: 'none', fontFamily: 'inherit', color: '#2C2C2C', padding: '2px 0', boxSizing: 'border-box' }}
                  />
                </div>
              ) : (
                <div onClick={() => setAddingTodo(true)} style={{ paddingTop: 8, fontSize: 12, color: '#bbb', cursor: 'pointer' }}>
                  + Add new
                </div>
              )}
            </div>
          </Panel>

          {/* HABIT TRACKER */}
          <Panel title="Habit Tracker" open={panelOpen.habits} onToggle={() => toggle('habits')}>
            <div style={{ padding: '0 14px 12px' }}>
              {/* Day-letter header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(7, 18px)', columnGap: 3, marginBottom: 2, alignItems: 'center' }}>
                <div />
                {DOW_LETTERS.map((l, i) => (
                  <div key={i} style={{ fontSize: 11, fontWeight: 700, color: '#bbb', textAlign: 'center' }}>{l}</div>
                ))}
              </div>
              {recurring.map(task => {
                const hasDays = Array.isArray(task.days_of_week) && task.days_of_week.length > 0
                const color   = getSectionColor(task.section)
                return (
                  <div key={task.id} style={{ display: 'grid', gridTemplateColumns: '1fr repeat(7, 18px)', columnGap: 3, padding: '6px 0', alignItems: 'center', borderBottom: '1px solid #f5f2ee' }}>
                    <span style={{ fontSize: 13, color: '#2C2C2C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6 }} title={task.title}>{task.title}</span>
                    {weekDays.map((day, di) => {
                      const ds = toDateStr(day)
                      const applicable = !hasDays || task.days_of_week.includes(DOW_KEYS[di])
                      const checked    = applicable && isTaskDone(task.id, ds)

                      // Non-applicable days: empty cell, no checkbox shown
                      if (!applicable) return <div key={di} />

                      return (
                        <div key={di}
                          onClick={() => toggleCompletion(task.id, ds)}
                          style={{
                            width: 16, height: 16, borderRadius: 3,
                            border: `1.5px solid ${color}`,
                            background: checked ? color : 'transparent',
                            cursor: 'pointer', justifySelf: 'center',
                            transition: 'background .1s',
                            flexShrink: 0,
                          }}
                        />
                      )
                    })}
                  </div>
                )
              })}
              {recurring.length === 0 && (
                <div style={{ fontSize: 12, color: '#ccc', paddingTop: 4 }}>No habits yet</div>
              )}
            </div>
          </Panel>

          {/* TASK SECTIONS */}
          <Panel title="Task Sections" open={panelOpen.taskSections} onToggle={() => toggle('taskSections')}>
            <div style={{ padding: '0 14px 12px' }}>
              {sections.map(s => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #f5f2ee' }}>
                  <div style={{ width: 11, height: 11, borderRadius: 2, background: s.cb, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#2C2C2C', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                  <span onClick={() => setDeleteConfirm({ type: 'section', key: s.key, name: s.label })}
                    style={{ fontSize: 16, color: '#C62828', cursor: 'pointer', lineHeight: 1, flexShrink: 0, opacity: 0.55 }}>×</span>
                </div>
              ))}
              <div onClick={() => { if (isMobile) onClose(); setSectionModal(true) }}
                style={{ paddingTop: 8, fontSize: 12, color: '#bbb', cursor: 'pointer' }}>
                + Add section
              </div>
            </div>
          </Panel>

          {/* EVENT TYPES */}
          <Panel title="Event Types" open={panelOpen.eventTypes} onToggle={() => toggle('eventTypes')}>
            <div style={{ padding: '0 14px 12px' }}>
              {eventTypes.map(et => (
                <div key={et.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #f5f2ee' }}>
                  <div style={{ width: 11, height: 11, borderRadius: 2, background: et.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#2C2C2C', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{et.label}</span>
                  <span onClick={() => setDeleteConfirm({ type: 'eventType', key: et.key, name: et.label })}
                    style={{ fontSize: 16, color: '#C62828', cursor: 'pointer', lineHeight: 1, flexShrink: 0, opacity: 0.55 }}>×</span>
                </div>
              ))}
              {newEventType ? (
                <div style={{ marginTop: 8, padding: '10px 12px', background: '#f9f9f6', borderRadius: 8 }}>
                  <input autoFocus placeholder="Type name"
                    value={newEventType.name}
                    onChange={e => setNewEventType(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addEventType()}
                    style={{ width: '100%', fontSize: 13, border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', outline: 'none', fontFamily: 'inherit', marginBottom: 8, color: '#2C2C2C', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                    {ET_PRESET_COLORS.map((c, i) => (
                      <div key={i} onClick={() => setNewEventType(p => ({ ...p, colorIdx: i }))}
                        style={{ width: 15, height: 15, borderRadius: 3, background: c.color, cursor: 'pointer',
                          border: newEventType.colorIdx === i ? '2px solid #2C2C2C' : '2px solid transparent' }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={addEventType} style={{ fontSize: 12, padding: '4px 10px', background: '#2C2C2C', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                    <button onClick={() => setNewEventType(null)} style={{ fontSize: 12, padding: '4px 10px', background: '#f0f0f0', color: '#888', border: 'none', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => setNewEventType({ name: '', colorIdx: 0 })}
                  style={{ paddingTop: 8, fontSize: 12, color: '#bbb', cursor: 'pointer' }}>
                  + Add event type
                </div>
              )}
            </div>
          </Panel>

        </div>

        {/* Drag-resize handle — rightmost 4px, only on desktop */}
        {!isMobile && open && (
          <div
            onMouseDown={startResize}
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 4,
              cursor: 'col-resize', zIndex: 10,
            }}
          />
        )}
      </div>
    </>
  )
}
