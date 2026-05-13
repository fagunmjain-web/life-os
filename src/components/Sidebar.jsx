import { useState, useRef, useEffect } from 'react'
import { toDateStr, startOfWeek, addDays, getDaysInMonth, getFirstDayOfMonth, MONTH_SHORT } from '../utils.js'

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
  saveTask, updateTaskTitle, deleteTask, onEditTask, onAddHabit, moveTask,
  setDeleteConfirm, setSectionModal, setSections, setEventTypes,
}) {
  const [panelOpen, setPanelOpen] = useState({ todo: true, habits: true, taskSections: false, eventTypes: false })

  // To Do state
  const [addingTodo, setAddingTodo]     = useState(false)
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [hoveredTodo, setHoveredTodo]   = useState(null)
  const [editingTodo, setEditingTodo]   = useState(null)
  const [editTodoVal, setEditTodoVal]   = useState('')

  // Section editing + drag state
  const [editingSection, setEditingSection] = useState(null)
  const [editSectionVal, setEditSectionVal] = useState('')
  const [secDragIdx, setSecDragIdx]         = useState(null)
  const [secDragOver, setSecDragOver]       = useState(null)

  function saveSectionName(key) {
    const trimmed = editSectionVal.trim()
    setEditingSection(null)
    if (trimmed) setSections(prev => prev.map(s => s.key === key ? { ...s, label: trimmed } : s))
  }

  function onSecDragStart(idx) { setSecDragIdx(idx) }
  function onSecDragEnter(idx) { setSecDragOver(idx) }
  function onSecDragEnd() {
    if (secDragIdx !== null && secDragOver !== null && secDragIdx !== secDragOver) {
      setSections(prev => {
        const next = [...prev]
        const [item] = next.splice(secDragIdx, 1)
        next.splice(secDragOver, 0, item)
        return next
      })
    }
    setSecDragIdx(null)
    setSecDragOver(null)
  }

  // Habit tracker state
  const [habitView, setHabitView]         = useState('week')
  const [habitNavDate, setHabitNavDate]   = useState(new Date())
  const [hoveredHabit, setHoveredHabit]   = useState(null)
  const [addingHabit, setAddingHabit]     = useState(false)
  const [newHabitTitle, setNewHabitTitle] = useState('')
  const [editingHabit, setEditingHabit]   = useState(null)
  const [editHabitVal, setEditHabitVal]   = useState('')
  const habitInputRef = useRef(null)

  // Focus the input whenever we enter habit-edit mode
  useEffect(() => {
    if (editingHabit !== null && habitInputRef.current) {
      habitInputRef.current.focus()
      // move cursor to end
      const len = habitInputRef.current.value.length
      habitInputRef.current.setSelectionRange(len, len)
    }
  }, [editingHabit])

  // To Do drop zone
  const [todoDropOver, setTodoDropOver] = useState(false)

  // Event type add state
  const [newEventType, setNewEventType] = useState(null)

  // Sidebar resize state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem('sidebarWidth')
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH
  })
  const [isResizing, setIsResizing] = useState(false)
  const resizeStartRef = useRef(null)

  const todayStr   = toDateStr(new Date())

  // Habit tracker week days
  const habitWeekStart = startOfWeek(habitNavDate)
  const habitWeekDays  = Array.from({ length: 7 }, (_, i) => addDays(habitWeekStart, i))

  // Habit tracker month info
  const habitYear        = habitNavDate.getFullYear()
  const habitMonth       = habitNavDate.getMonth()
  const daysInHabitMonth = getDaysInMonth(habitYear, habitMonth)
  const habitFirstDay    = getFirstDayOfMonth(habitYear, habitMonth) // 0=Sun
  const habitMonthOffset = habitFirstDay === 0 ? 6 : habitFirstDay - 1 // Mon-start offset

  const unassigned = tasks.filter(t => {
    const hasDays = Array.isArray(t.days_of_week) && t.days_of_week.length > 0
    return !t.specific_date && !t.is_recurring && !hasDays
  })

  const recurring = tasks.filter(t => t.is_habit === true)

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

  async function saveTodoEdit(task) {
    const trimmed = editTodoVal.trim()
    setEditingTodo(null)
    if (trimmed && trimmed !== task.title) {
      await saveTask({ ...task, title: trimmed })
    }
  }

  async function saveHabitEdit(task) {
    const trimmed = editHabitVal.trim()
    setEditingHabit(null)
    if (trimmed && trimmed !== task.title) {
      await updateTaskTitle(task.id, trimmed)
    }
  }

  async function submitHabit() {
    const trimmed = newHabitTitle.trim()
    setAddingHabit(false)
    setNewHabitTitle('')
    if (!trimmed) return
    await createTask({
      title: trimmed,
      section: sections[0]?.key || null,
      is_habit: true,
      is_recurring: true,
      days_of_week: [],
      specific_date: null,
      time_of_day: null,
    })
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

  // Habit tracker helpers
  function getHabitPct(date) {
    if (!recurring.length) return null
    const dow = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()]
    const applicable = recurring.filter(h => {
      const d = h.days_of_week
      if (!Array.isArray(d) || d.length === 0) return true
      return d.includes(dow)
    })
    if (!applicable.length) return null
    const ds = toDateStr(date)
    const done = applicable.filter(h =>
      completions.some(c => String(c.task_id) === String(h.id) && c.completed_date === ds)
    ).length
    return done / applicable.length
  }

  function getHabitLabel() {
    if (habitView === 'week') {
      const ws = habitWeekStart
      const we = addDays(ws, 6)
      const sm = MONTH_SHORT[ws.getMonth()]
      const em = MONTH_SHORT[we.getMonth()]
      return sm === em ? `${ws.getDate()}–${we.getDate()} ${sm}` : `${ws.getDate()} ${sm}–${we.getDate()} ${em}`
    }
    if (habitView === 'month') return `${MONTH_SHORT[habitMonth]} ${habitYear}`
    return `${habitYear}`
  }

  function navigateHabit(dir) {
    setHabitNavDate(d => {
      if (habitView === 'week') return addDays(d, dir * 7)
      if (habitView === 'month') { const n = new Date(d); n.setMonth(n.getMonth() + dir); return n }
      const n = new Date(d); n.setFullYear(n.getFullYear() + dir); return n
    })
  }

  // Resize drag
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
      {isResizing && (
        <div style={{ position: 'fixed', inset: 0, cursor: 'col-resize', zIndex: 9999, userSelect: 'none' }} />
      )}
      {isMobile && open && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 199 }} />
      )}

      <div style={outerStyle}>
        <div style={{ width: sidebarWidth, height: '100%', overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none' }}>

          {/* ── TO DO ─────────────────────────────────────────────────────── */}
          <Panel title="To Do" open={panelOpen.todo} onToggle={() => toggle('todo')}>
            <div
              style={{ padding: '0 14px 12px', background: todoDropOver ? '#f5f9f0' : 'transparent', transition: 'background .1s' }}
              onDragOver={e => { e.preventDefault(); setTodoDropOver(true) }}
              onDragLeave={() => setTodoDropOver(false)}
              onDrop={e => {
                e.preventDefault(); setTodoDropOver(false)
                try {
                  const data = JSON.parse(e.dataTransfer.getData('application/json'))
                  if (data.taskId && !data.fromSidebar) {
                    const task = tasks.find(t => String(t.id) === String(data.taskId))
                    if (task && task.is_recurring !== true) moveTask(task, null)
                  }
                } catch {}
              }}
            >
              {unassigned.map(task => (
                <div key={task.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, fromSidebar: true }))
                  }}
                  onMouseEnter={() => setHoveredTodo(task.id)}
                  onMouseLeave={() => { setHoveredTodo(null) }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', cursor: 'grab', borderBottom: '1px solid #f5f2ee' }}
                >
                  {/* Checkbox — click marks done (deletes) */}
                  <div
                    onClick={() => setDeleteConfirm({ type: 'task', id: task.id, name: task.title })}
                    style={{ width: 13, height: 13, borderRadius: 3, border: '1.5px solid #ccc', flexShrink: 0, marginTop: 2, cursor: 'pointer' }}
                  />
                  {/* Inline edit or title */}
                  {editingTodo === task.id ? (
                    <input
                      autoFocus
                      value={editTodoVal}
                      onChange={e => setEditTodoVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveTodoEdit(task)
                        if (e.key === 'Escape') setEditingTodo(null)
                      }}
                      onBlur={() => saveTodoEdit(task)}
                      style={{ fontSize: 13, flex: 1, border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', outline: 'none', fontFamily: 'inherit', color: '#2C2C2C', padding: '2px 0' }}
                    />
                  ) : (
                    <span
                      onClick={() => { setEditingTodo(task.id); setEditTodoVal(task.title) }}
                      style={{ fontSize: 13, color: '#2C2C2C', flex: 1, lineHeight: 1.4, wordBreak: 'break-word', cursor: 'text' }}
                    >{task.title}</span>
                  )}
                  {hoveredTodo === task.id && editingTodo !== task.id && (
                    <button
                      onClick={() => setDeleteConfirm({ type: 'task', id: task.id, name: task.title })}
                      style={{ background: 'none', border: 'none', color: '#C62828', cursor: 'pointer', fontSize: 15, lineHeight: 1, flexShrink: 0, padding: '0 2px', outline: 'none', fontFamily: 'inherit', alignSelf: 'center' }}
                    >×</button>
                  )}
                </div>
              ))}
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

          {/* ── HABIT TRACKER ─────────────────────────────────────────────── */}
          <div style={{ borderBottom: '1px solid #f0ece6' }}>
            {/* Custom header with view switcher */}
            <div
              onClick={() => toggle('habits')}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.07em' }}>Habit Tracker</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={e => e.stopPropagation()}>
                {panelOpen.habits && ['week', 'month', 'year'].map(v => (
                  <button key={v}
                    onClick={e => { e.stopPropagation(); setHabitView(v) }}
                    style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                      background: habitView === v ? '#2C2C2C' : '#f0f0f0',
                      color: habitView === v ? '#fff' : '#888',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >{v.charAt(0).toUpperCase() + v.slice(1)}</button>
                ))}
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#bbb" strokeWidth="1.8"
                  style={{ flexShrink: 0, transition: 'transform .2s', transform: panelOpen.habits ? 'rotate(-90deg)' : 'rotate(90deg)', marginLeft: 3 }}>
                  <path d="M3 2L7 5L3 8" />
                </svg>
              </div>
            </div>

            {panelOpen.habits && (
              <div style={{ padding: '0 14px 12px' }}>
                {/* Nav row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                  <button onClick={() => navigateHabit(-1)} style={habitNavBtn}>‹</button>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2C2C2C', minWidth: 80, textAlign: 'center', whiteSpace: 'nowrap' }}>{getHabitLabel()}</span>
                  <button onClick={() => navigateHabit(1)} style={habitNavBtn}>›</button>
                </div>

                {/* ─── WEEK VIEW ─── */}
                {habitView === 'week' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(50px,1fr) repeat(7, 15px)', columnGap: 3, marginBottom: 3, alignItems: 'center' }}>
                      <div />
                      {habitWeekDays.map((day, i) => {
                        const ds = toDateStr(day)
                        return (
                          <div key={i} style={{ fontSize: 10, fontWeight: 700, color: ds === todayStr ? '#5B8ED6' : '#2C2C2C', textAlign: 'center' }}>
                            {DOW_LETTERS[i]}
                          </div>
                        )
                      })}
                    </div>
                    {recurring.map(task => (
                      <div key={task.id}
                        onMouseEnter={() => setHoveredHabit(task.id)}
                        onMouseLeave={() => setHoveredHabit(null)}
                        style={{ display: 'grid', gridTemplateColumns: 'minmax(50px,1fr) repeat(7, 15px)', columnGap: 3, padding: '5px 0', alignItems: 'center', borderBottom: '1px solid #f5f2ee' }}
                      >
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0, cursor: editingHabit === task.id ? 'default' : 'text' }}
                          onMouseDown={e => {
                            if (editingHabit !== task.id) {
                              e.preventDefault()
                              setEditingHabit(task.id)
                              setEditHabitVal(task.title)
                            }
                          }}
                        >
                          {editingHabit === task.id ? (
                            <input
                              ref={habitInputRef}
                              value={editHabitVal}
                              onChange={e => setEditHabitVal(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter')  { e.preventDefault(); saveHabitEdit(task) }
                                if (e.key === 'Escape') { e.preventDefault(); setEditingHabit(null) }
                              }}
                              onBlur={() => saveHabitEdit(task)}
                              style={{ fontSize: 12, flex: 1, border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', outline: 'none', fontFamily: 'inherit', color: '#2C2C2C', padding: '2px 0', minWidth: 0 }}
                            />
                          ) : (
                            <span
                              style={{ fontSize: 12, color: '#2C2C2C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, userSelect: 'none' }}
                              title={task.title}
                            >{task.title}</span>
                          )}
                          {hoveredHabit === task.id && editingHabit !== task.id && (
                            <button
                              onMouseDown={e => e.stopPropagation()}
                              onClick={e => { e.stopPropagation(); setDeleteConfirm({ type: 'task', id: task.id, name: task.title }) }}
                              style={{ ...habitActionBtn, color: '#C62828', flexShrink: 0 }}
                            >×</button>
                          )}
                        </div>
                        {habitWeekDays.map((day, di) => {
                          const ds = toDateStr(day)
                          const applicable = !Array.isArray(task.days_of_week) || task.days_of_week.length === 0 || task.days_of_week.includes(DOW_KEYS[di])
                          const checked    = applicable && isTaskDone(task.id, ds)
                          if (!applicable) return <div key={di} />
                          return (
                            <div key={di}
                              onClick={() => toggleCompletion(task.id, ds)}
                              style={{
                                width: 15, height: 15, borderRadius: 3,
                                border: `1.5px solid ${checked ? '#4A8C40' : '#ccc'}`,
                                background: checked ? '#4A8C40' : 'transparent',
                                cursor: 'pointer', justifySelf: 'center',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all .1s', flexShrink: 0,
                              }}
                            >
                              {checked && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1, fontWeight: 700 }}>✓</span>}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                    {recurring.length === 0 && !addingHabit && (
                      <div style={{ fontSize: 12, color: '#ccc', paddingTop: 4, paddingBottom: 4 }}>No habits yet</div>
                    )}
                    {addingHabit && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', columnGap: 6, padding: '6px 0', alignItems: 'center', borderBottom: '1px solid #f5f2ee' }}>
                        <input
                          autoFocus
                          value={newHabitTitle}
                          onChange={e => setNewHabitTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter')  { e.preventDefault(); submitHabit() }
                            if (e.key === 'Escape') { e.preventDefault(); setAddingHabit(false); setNewHabitTitle('') }
                          }}
                          onBlur={() => { if (newHabitTitle.trim()) submitHabit(); else { setAddingHabit(false); setNewHabitTitle('') } }}
                          placeholder="Habit name…"
                          style={{ fontSize: 12, border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', outline: 'none', fontFamily: 'inherit', color: '#2C2C2C', padding: '2px 0' }}
                        />
                        <button onClick={() => { setAddingHabit(false); setNewHabitTitle('') }} style={{ ...habitActionBtn, color: '#C62828', flexShrink: 0 }}>×</button>
                      </div>
                    )}
                    {!addingHabit && (
                      <div onClick={() => setAddingHabit(true)} style={{ paddingTop: 8, fontSize: 12, color: '#bbb', cursor: 'pointer' }}>+ Add new</div>
                    )}
                  </>
                )}

                {/* ─── MONTH VIEW ─── */}
                {habitView === 'month' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', columnGap: 2, marginBottom: 3 }}>
                      {DOW_LETTERS.map((l, i) => (
                        <div key={i} style={{ fontSize: 10, fontWeight: 700, color: '#2C2C2C', textAlign: 'center' }}>{l}</div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', columnGap: 2, rowGap: 2 }}>
                      {Array.from({ length: habitMonthOffset }, (_, i) => <div key={`off_${i}`} />)}
                      {Array.from({ length: daysInHabitMonth }, (_, i) => {
                        const day  = i + 1
                        const date = new Date(habitYear, habitMonth, day)
                        const pct  = getHabitPct(date)
                        const ds   = toDateStr(date)
                        return (
                          <div key={day} style={{
                            height: 22, borderRadius: 3,
                            position: 'relative', overflow: 'hidden',
                            border: ds === todayStr ? '1px solid #5B8ED6' : '1px solid #e0dbd4',
                            background: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {pct !== null && pct > 0 && (
                              <div style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                height: `${pct * 100}%`,
                                background: 'rgba(74,140,64,0.45)',
                                borderRadius: '0 0 2px 2px',
                              }} />
                            )}
                            <span style={{
                              position: 'relative', zIndex: 1,
                              fontSize: 9, fontWeight: ds === todayStr ? 700 : 400,
                              color: ds === todayStr ? '#5B8ED6' : '#2C2C2C',
                            }}>{day}</span>
                          </div>
                        )
                      })}
                    </div>
                    {recurring.length === 0 && (
                      <div style={{ fontSize: 12, color: '#ccc', paddingTop: 8 }}>No habits yet</div>
                    )}
                  </>
                )}

                {/* ─── YEAR VIEW ─── */}
                {habitView === 'year' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                    {Array.from({ length: 12 }, (_, m) => {
                      const daysInM = getDaysInMonth(habitYear, m)
                      const now = new Date()
                      let total = 0, count = 0
                      for (let d = 1; d <= daysInM; d++) {
                        const date = new Date(habitYear, m, d)
                        if (date > now) break
                        const pct = getHabitPct(date)
                        if (pct !== null) { total += pct; count++ }
                      }
                      const avgPct = count > 0 ? total / count : 0
                      return (
                        <div key={m} style={{
                          height: 48, borderRadius: 4,
                          background: avgPct > 0
                            ? `linear-gradient(to top, rgba(74,140,64,0.65) ${avgPct*100}%, #f0ece6 ${avgPct*100}%)`
                            : '#f0ece6',
                          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                          paddingBottom: 4, fontSize: 10, fontWeight: 600, color: '#2C2C2C',
                        }}>
                          {MONTH_SHORT[m]}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── TASK SECTIONS ─────────────────────────────────────────────── */}
          <Panel title="Task Sections" open={panelOpen.taskSections} onToggle={() => toggle('taskSections')}>
            <div style={{ padding: '0 14px 12px' }}>
              {sections.map((s, idx) => (
                <div
                  key={s.key}
                  draggable
                  onDragStart={() => onSecDragStart(idx)}
                  onDragEnter={() => onSecDragEnter(idx)}
                  onDragOver={e => e.preventDefault()}
                  onDragEnd={onSecDragEnd}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0',
                    borderBottom: '1px solid #f5f2ee', cursor: 'grab',
                    opacity: secDragIdx === idx ? 0.4 : 1,
                    background: secDragOver === idx && secDragIdx !== idx ? '#f5f2ee' : 'transparent',
                    transition: 'background .1s',
                  }}
                >
                  {/* drag handle */}
                  <span style={{ fontSize: 11, color: '#ccc', flexShrink: 0, lineHeight: 1, cursor: 'grab' }}>⠿</span>
                  <div style={{ width: 11, height: 11, borderRadius: 2, background: s.cb, flexShrink: 0 }} />
                  {editingSection === s.key ? (
                    <input
                      autoFocus
                      value={editSectionVal}
                      onChange={e => setEditSectionVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter')  { e.preventDefault(); saveSectionName(s.key) }
                        if (e.key === 'Escape') { e.preventDefault(); setEditingSection(null) }
                      }}
                      onBlur={() => saveSectionName(s.key)}
                      style={{ fontSize: 13, flex: 1, border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', outline: 'none', fontFamily: 'inherit', color: '#2C2C2C', padding: '1px 0' }}
                    />
                  ) : (
                    <span
                      onMouseDown={e => { e.preventDefault(); setEditingSection(s.key); setEditSectionVal(s.label) }}
                      style={{ fontSize: 13, color: '#2C2C2C', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text' }}
                    >{s.label}</span>
                  )}
                  <span
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => setDeleteConfirm({ type: 'section', key: s.key, name: s.label })}
                    style={{ fontSize: 16, color: '#C62828', cursor: 'pointer', lineHeight: 1, flexShrink: 0, opacity: 0.55 }}
                  >×</span>
                </div>
              ))}
              <div onClick={() => { if (isMobile) onClose(); setSectionModal(true) }}
                style={{ paddingTop: 8, fontSize: 12, color: '#bbb', cursor: 'pointer' }}>
                + Add section
              </div>
            </div>
          </Panel>

          {/* ── EVENT TYPES ───────────────────────────────────────────────── */}
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

        {/* Drag-resize handle */}
        {!isMobile && open && (
          <div
            onMouseDown={startResize}
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize', zIndex: 10 }}
          />
        )}
      </div>
    </>
  )
}

const habitNavBtn = {
  background: 'none', border: 'none', outline: 'none', boxShadow: 'none',
  fontSize: 18, color: '#888', cursor: 'pointer', padding: '0 4px', lineHeight: 1, fontFamily: 'inherit',
}

const habitActionBtn = {
  width: 16, height: 16, borderRadius: 3, border: 'none', background: '#f0f0f0',
  color: '#555', cursor: 'pointer', fontSize: 9,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0,
}
