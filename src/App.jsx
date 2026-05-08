import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase.js'
import { SECTIONS as DEFAULT_SECTIONS } from './sections.js'
import { toDateStr, isFriday, addDays, startOfWeek, MONTH_SHORT, MONTH_NAMES } from './utils.js'
import DayView from './views/DayView.jsx'
import WeekView from './views/WeekView.jsx'
import MonthView from './views/MonthView.jsx'
import YearView from './views/YearView.jsx'
import TaskModal from './components/TaskModal.jsx'
import SectionModal from './components/SectionModal.jsx'
import EventModal from './components/EventModal.jsx'
import { useIsMobile } from './hooks/useIsMobile.js'

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const DEFAULT_EVENT_TYPES = [
  { key: 'celebration', label: 'Celebrations', color: '#E57373', bg: '#FFEBEB', textColor: '#C62828' },
  { key: 'important', label: 'Important', color: '#5B8ED6', bg: '#E6F1FB', textColor: '#185FA5' },
  { key: 'travel', label: 'Travel', color: '#E65100', bg: '#FFF3E0', textColor: '#E65100' },
]

const ET_PRESET_COLORS = [
  { color: '#E57373', bg: '#FFEBEB', textColor: '#C62828' },
  { color: '#5B8ED6', bg: '#E6F1FB', textColor: '#185FA5' },
  { color: '#E65100', bg: '#FFF3E0', textColor: '#E65100' },
  { color: '#4A8C40', bg: '#E8F5E4', textColor: '#2C4A24' },
  { color: '#7B1FA2', bg: '#F3E5F5', textColor: '#3A1245' },
  { color: '#00796B', bg: '#E0F2F1', textColor: '#004D40' },
]

export default function App() {
  const [activeView, setActiveView] = useState('Day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tasks, setTasks] = useState([])
  const [completions, setCompletions] = useState([])
  const [events, setEvents] = useState([])
  const [weightTargets, setWeightTargets] = useState([])
  const [weightEntries, setWeightEntries] = useState([])
  const [sections, setSections] = useState(DEFAULT_SECTIONS)
  const [eventTypes, setEventTypes] = useState(DEFAULT_EVENT_TYPES)
  const [loading, setLoading] = useState(true)
  const [taskModal, setTaskModal] = useState(null)
  const [sectionModal, setSectionModal] = useState(false)
  const [eventModal, setEventModal] = useState(null)
  const [hamOpen, setHamOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  // Hamburger editing state
  const [editingSection, setEditingSection] = useState(null)
  const [editingSectionName, setEditingSectionName] = useState('')
  const [editingEventType, setEditingEventType] = useState(null)
  const [editingEventTypeName, setEditingEventTypeName] = useState('')
  const [newEventType, setNewEventType] = useState(null)
  const touchStartX = useRef(null)
  const isMobile = useIsMobile()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [t, c, e, wt, we] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('task_completions').select('*'),
      supabase.from('events').select('*'),
      supabase.from('weight_targets').select('*'),
      supabase.from('weight_entries').select('*'),
    ])
    setTasks(t.data || [])
    setCompletions(c.data || [])
    setEvents(e.data || [])
    setWeightTargets(wt.data || [])
    setWeightEntries(we.data || [])
    setLoading(false)
  }

  async function toggleCompletion(taskId, dateStr) {
    const existing = completions.find(c => c.task_id === taskId && c.completed_date === dateStr)
    if (existing) {
      await supabase.from('task_completions').delete().eq('id', existing.id)
      setCompletions(prev => prev.filter(c => c.id !== existing.id))
    } else {
      const { data } = await supabase.from('task_completions').insert({ task_id: taskId, completed_date: dateStr }).select().single()
      if (data) setCompletions(prev => [...prev, data])
    }
  }

  async function saveWeight(dateStr, weight) {
    const existing = weightEntries.find(w => w.entry_date === dateStr)
    if (existing) {
      await supabase.from('weight_entries').update({ actual_weight: weight }).eq('id', existing.id)
      setWeightEntries(prev => prev.map(w => w.entry_date === dateStr ? { ...w, actual_weight: weight } : w))
    } else {
      const { data } = await supabase.from('weight_entries').insert({ entry_date: dateStr, actual_weight: weight }).select().single()
      if (data) setWeightEntries(prev => [...prev, data])
    }
  }

  async function saveTask(taskData) {
    if (taskData.id) {
      const { data } = await supabase.from('tasks').update(taskData).eq('id', taskData.id).select().single()
      if (data) setTasks(prev => prev.map(t => t.id === data.id ? data : t))
    } else {
      const { data } = await supabase.from('tasks').insert(taskData).select().single()
      if (data) setTasks(prev => [...prev, data])
    }
    setTaskModal(null)
  }

  async function deleteTask(taskId) {
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  async function saveSection(sectionData) {
    setSections(prev => [...prev, sectionData])
    setSectionModal(false)
  }

  async function deleteSection(sectionKey) {
    setSections(prev => prev.filter(s => s.key !== sectionKey))
    setDeleteConfirm(null)
  }

  async function saveEvent(eventData) {
    const { data } = await supabase.from('events').insert(eventData).select().single()
    if (data) setEvents(prev => [...prev, data])
    setEventModal(null)
  }

  async function deleteEvent(eventId) {
    await supabase.from('events').delete().eq('id', eventId)
    setEvents(prev => prev.filter(e => e.id !== eventId))
  }

  async function updateEvent(eventData) {
    const { data } = await supabase.from('events').update(eventData).eq('id', eventData.id).select().single()
    if (data) setEvents(prev => prev.map(e => e.id === data.id ? data : e))
    setEventModal(null)
  }

  function getEventTypeStyle(key) {
    const et = eventTypes.find(e => e.key === key)
    if (et) return { bg: et.color, textColor: '#fff', lightBg: et.bg, labelColor: et.textColor }
    return { bg: '#888', textColor: '#fff', lightBg: '#f5f5f5', labelColor: '#555' }
  }

  function getTasksForDate(date) {
    const dateStr = toDateStr(date)
    const dayName = ['sun','mon','tue','wed','thu','fri','sat'][date.getDay()]
    return tasks.filter(t => {
      if (t.is_recurring) return t.days_of_week?.includes(dayName)
      return t.specific_date === dateStr
    })
  }

  function isCompleted(taskId, dateStr) {
    return completions.some(c => c.task_id === taskId && c.completed_date === dateStr)
  }

  function getEventsForDate(date) {
    const dateStr = toDateStr(date)
    return events.filter(e => {
      if (!e.end_date) return e.start_date === dateStr
      return dateStr >= e.start_date && dateStr <= e.end_date
    })
  }

  function getWeightTarget(dateStr) { return weightTargets.find(w => w.target_date === dateStr) }
  function getWeightEntry(dateStr) { return weightEntries.find(w => w.entry_date === dateStr) }

  function hasOverdue(date) {
    const dateStr = toDateStr(date)
    const todayStr = toDateStr(new Date())
    if (dateStr >= todayStr) return false
    return getTasksForDate(date).some(t => !isCompleted(t.id, dateStr))
  }

  function navigate(dir) {
    setCurrentDate(d => {
      if (activeView === 'Day') return addDays(d, dir)
      if (activeView === 'Week') return addDays(d, dir * 7)
      if (activeView === 'Month') { const n = new Date(d); n.setMonth(n.getMonth() + dir); return n }
      if (activeView === 'Year') { const n = new Date(d); n.setFullYear(n.getFullYear() + dir); return n }
      return d
    })
  }

  function handleTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) navigate(diff > 0 ? 1 : -1)
    touchStartX.current = null
  }

  const dateStr = toDateStr(currentDate)
  const weightTarget = getWeightTarget(dateStr)
  const weightEntry = getWeightEntry(dateStr)
  const showWeight = activeView === 'Day' && isFriday(currentDate) && weightTarget

  function getHeaderTitle() {
    if (activeView === 'Day') {
      const d = currentDate
      return `${String(d.getDate()).padStart(2,'0')} ${MONTH_SHORT[d.getMonth()]}  ${DAY_NAMES[d.getDay()]}`
    }
    if (activeView === 'Week') return `${MONTH_SHORT[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    if (activeView === 'Month') return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    if (activeView === 'Year') return `${currentDate.getFullYear()}`
    return ''
  }

  const sharedProps = {
    currentDate, setCurrentDate, tasks, completions, events,
    weightTargets, weightEntries, sections,
    getTasksForDate, isCompleted, getEventsForDate,
    getWeightTarget, getWeightEntry, hasOverdue,
    toggleCompletion, saveWeight,
    // Confirm-wrapped deletes
    deleteTask: (id) => {
      const t = tasks.find(t => t.id === id)
      setDeleteConfirm({ type: 'task', id, name: t?.title || 'this task' })
    },
    deleteEvent: (id) => {
      const e = events.find(ev => ev.id === id)
      setDeleteConfirm({ type: 'event', id, name: e?.title || 'this event' })
    },
    onEditTask: (task) => setTaskModal({ task }),
    onAddTask: (sectionKey, date) => setTaskModal({ defaultSection: sectionKey, defaultDate: date }),
    onAddEvent: (date) => setEventModal({ date }),
    onEditEvent: (event) => setEventModal({ event }),
    navigate,
    activeView,
    setActiveView,
    getEventTypeStyle,
  }

  const VIEWS = ['Today', 'Day', 'Week', 'Month', 'Year']

  function renameSection(key, name) {
    setSections(prev => prev.map(s => s.key === key ? { ...s, label: name.trim() } : s))
    setEditingSection(null)
  }

  function renameEventType(key, name) {
    setEventTypes(prev => prev.map(et => et.key === key ? { ...et, label: name.trim() } : et))
    setEditingEventType(null)
  }

  function addEventType() {
    if (!newEventType?.name?.trim()) return
    const colors = ET_PRESET_COLORS[newEventType.colorIdx] || ET_PRESET_COLORS[0]
    setEventTypes(prev => [...prev, {
      key: newEventType.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
      label: newEventType.name.trim(),
      ...colors,
    }])
    setNewEventType(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', overflowX: 'hidden', maxWidth: '100vw' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* HAMBURGER OVERLAY */}
      {hamOpen && (
        <div onClick={() => { setHamOpen(false); setEditingSection(null); setEditingEventType(null); setNewEventType(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'absolute', top: 10, left: 10, width: 320, background: '#fff',
            borderRadius: 16, padding: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.15)', maxHeight: '85vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2C' }}>Manage sections</span>
              <span onClick={() => setHamOpen(false)} style={{ cursor: 'pointer', fontSize: 20, color: '#aaa', lineHeight: 1 }}>×</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Task sections */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Task sections</div>
                {sections.map(s => (
                  <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: 12, fontWeight: 600 }}>
                    {editingSection === s.key ? (
                      <input
                        autoFocus value={editingSectionName}
                        onChange={e => setEditingSectionName(e.target.value)}
                        onBlur={() => renameSection(s.key, editingSectionName)}
                        onKeyDown={e => e.key === 'Enter' && renameSection(s.key, editingSectionName)}
                        style={{ fontSize: 12, color: s.cb, border: 'none', borderBottom: `1px solid ${s.cb}`, background: 'transparent', outline: 'none', fontFamily: 'inherit', fontWeight: 600, width: '100%', marginRight: 4 }}
                      />
                    ) : (
                      <span style={{ color: s.cb, flex: 1 }}>{s.label}</span>
                    )}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <span onClick={() => { setEditingSection(s.key); setEditingSectionName(s.label) }}
                        style={{ color: '#aaa', cursor: 'pointer', fontSize: 12, padding: '2px 2px' }}>✎</span>
                      <span onClick={() => setDeleteConfirm({ type: 'section', key: s.key, name: s.label })}
                        style={{ color: '#C62828', cursor: 'pointer', fontSize: 14, padding: '2px 2px' }}>×</span>
                    </div>
                  </div>
                ))}
                <div onClick={() => { setHamOpen(false); setSectionModal(true) }}
                  style={{ fontSize: 11, color: '#aaa', cursor: 'pointer', padding: '5px 0', marginTop: 6, borderTop: '1px dashed #eee' }}>
                  + Add new section
                </div>
              </div>

              {/* Event types */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Event types</div>
                {eventTypes.map(et => (
                  <div key={et.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: 12, fontWeight: 600 }}>
                    {editingEventType === et.key ? (
                      <input
                        autoFocus value={editingEventTypeName}
                        onChange={e => setEditingEventTypeName(e.target.value)}
                        onBlur={() => renameEventType(et.key, editingEventTypeName)}
                        onKeyDown={e => e.key === 'Enter' && renameEventType(et.key, editingEventTypeName)}
                        style={{ fontSize: 12, color: et.textColor, border: 'none', borderBottom: `1px solid ${et.color}`, background: 'transparent', outline: 'none', fontFamily: 'inherit', fontWeight: 600, width: '100%', marginRight: 4 }}
                      />
                    ) : (
                      <span style={{ color: et.textColor, flex: 1 }}>{et.label}</span>
                    )}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <span onClick={() => { setEditingEventType(et.key); setEditingEventTypeName(et.label) }}
                        style={{ color: '#aaa', cursor: 'pointer', fontSize: 12, padding: '2px 2px' }}>✎</span>
                      <span onClick={() => setDeleteConfirm({ type: 'eventType', key: et.key, name: et.label })}
                        style={{ color: '#C62828', cursor: 'pointer', fontSize: 14, padding: '2px 2px' }}>×</span>
                    </div>
                  </div>
                ))}

                {/* New event type form */}
                {newEventType ? (
                  <div style={{ marginTop: 8, padding: '8px', background: '#f9f9f9', borderRadius: 8 }}>
                    <input
                      autoFocus placeholder="Type name"
                      value={newEventType.name}
                      onChange={e => setNewEventType(prev => ({ ...prev, name: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addEventType()}
                      style={{ width: '100%', fontSize: 11, border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', outline: 'none', fontFamily: 'inherit', marginBottom: 6 }}
                    />
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                      {ET_PRESET_COLORS.map((c, i) => (
                        <div key={i} onClick={() => setNewEventType(prev => ({ ...prev, colorIdx: i }))}
                          style={{ width: 16, height: 16, borderRadius: 4, background: c.color, cursor: 'pointer', border: newEventType.colorIdx === i ? '2px solid #2C2C2C' : '2px solid transparent' }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={addEventType} style={{ fontSize: 10, padding: '3px 8px', background: '#2C2C2C', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                      <button onClick={() => setNewEventType(null)} style={{ fontSize: 10, padding: '3px 8px', background: '#f0f0f0', color: '#888', border: 'none', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => setNewEventType({ name: '', colorIdx: 0 })}
                    style={{ fontSize: 11, color: '#aaa', cursor: 'pointer', padding: '5px 0', marginTop: 6, borderTop: '1px dashed #eee' }}>
                    + Add new event type
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <div onClick={() => setDeleteConfirm(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 24, width: 280, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#2C2C2C', marginBottom: 6 }}>Are you sure?</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>
              Delete "{deleteConfirm.name}"?
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirm(null)} style={cancelBtn}>No</button>
              <button onClick={() => {
                if (deleteConfirm.type === 'section') deleteSection(deleteConfirm.key)
                if (deleteConfirm.type === 'event') { deleteEvent(deleteConfirm.id); setDeleteConfirm(null) }
                if (deleteConfirm.type === 'task') { deleteTask(deleteConfirm.id); setDeleteConfirm(null) }
                if (deleteConfirm.type === 'eventType') {
                  setEventTypes(prev => prev.filter(et => et.key !== deleteConfirm.key))
                  setDeleteConfirm(null)
                }
              }} style={{ ...cancelBtn, background: '#C62828', color: '#fff' }}>Yes, delete</button>
            </div>
          </div>
        </div>
      )}

      {/* STICKY HEADER */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#f7f7f5', padding: '10px 20px 8px' }}>
        {/* Row 1 — grid for true centering */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginBottom: showWeight && isMobile ? 4 : 8 }}>
          {/* Left */}
          <div>
            <button onClick={() => setHamOpen(true)} style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, padding: 2 }}>
              <span style={{ display: 'block', height: 1.5, background: '#555', borderRadius: 1, width: 18 }}></span>
              <span style={{ display: 'block', height: 1.5, background: '#555', borderRadius: 1, width: 18 }}></span>
              <span style={{ display: 'block', height: 1.5, background: '#555', borderRadius: 1, width: 18 }}></span>
            </button>
          </div>
          {/* Center — always perfectly centred */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#888', cursor: 'pointer', padding: '0 6px', lineHeight: 1 }}>‹</button>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#2C2C2C', minWidth: 120, textAlign: 'center' }}>{getHeaderTitle()}</div>
            <button onClick={() => navigate(1)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#888', cursor: 'pointer', padding: '0 6px', lineHeight: 1 }}>›</button>
          </div>
          {/* Right */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
            {activeView === 'Year' && (
              <>
                <button onClick={() => setTaskModal({ defaultSection: null })} style={yearBtn}>+ Task</button>
                <button onClick={() => setEventModal({ date: new Date() })} style={yearBtn}>+ Event</button>
              </>
            )}
            {showWeight && !isMobile && (
              <WeightInline target={weightTarget} entry={weightEntry} dateStr={dateStr} saveWeight={saveWeight} />
            )}
          </div>
        </div>

        {/* Weight row — mobile Day+Friday only */}
        {showWeight && isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <WeightInline target={weightTarget} entry={weightEntry} dateStr={dateStr} saveWeight={saveWeight} />
          </div>
        )}

        {/* Row 2 — view nav */}
        <div style={{ display: 'flex', gap: 3, background: '#ddd', borderRadius: 10, padding: 3 }}>
          {VIEWS.map(v => {
            const isActive = activeView === v && v !== 'Today'
            return (
              <button key={v}
                onClick={() => {
                  if (v === 'Today') { setCurrentDate(new Date()); setActiveView('Day') }
                  else setActiveView(v)
                }}
                style={{
                  flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 600,
                  border: 'none',
                  background: isActive ? '#2C2C2C' : 'transparent',
                  borderRadius: 7, cursor: 'pointer',
                  color: isActive ? '#fff' : '#888',
                  boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all .15s', fontFamily: 'inherit',
                }}
              >{v}</button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999', fontSize: 14 }}>Loading your life...</div>
      ) : (
        <div style={{ width: '100%', padding: '8px 20px 32px' }}>
          {activeView === 'Day'   && <DayView   {...sharedProps} />}
          {activeView === 'Week'  && <WeekView  {...sharedProps} />}
          {activeView === 'Month' && <MonthView {...sharedProps} />}
          {activeView === 'Year'  && <YearView  {...sharedProps} />}
        </div>
      )}

      {taskModal !== null && (
        <TaskModal task={taskModal.task} defaultSection={taskModal.defaultSection}
          defaultDate={taskModal.defaultDate}
          sections={sections} onSave={saveTask} onClose={() => setTaskModal(null)} />
      )}
      {sectionModal && (
        <SectionModal onSave={saveSection} onClose={() => setSectionModal(false)} />
      )}
      {eventModal && (
        <EventModal
          date={eventModal.date}
          event={eventModal.event}
          eventTypes={eventTypes}
          onSave={saveEvent}
          onUpdate={updateEvent}
          onClose={() => setEventModal(null)} />
      )}
    </div>
  )
}

function WeightInline({ target, entry, dateStr, saveWeight }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(entry?.actual_weight || '')

  useEffect(() => {
    setVal(entry?.actual_weight || '')
  }, [entry?.actual_weight])

  function handleBlur() {
    setEditing(false)
    if (val !== '' && !isNaN(val)) saveWeight(dateStr, parseFloat(val))
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#4A8C40', whiteSpace: 'nowrap' }}>Wt: {target.target_weight}kg</span>
      {editing ? (
        <input autoFocus type="number" step="0.1" value={val}
          onChange={e => setVal(e.target.value)} onBlur={handleBlur}
          style={{ fontSize: 12, fontWeight: 700, color: '#2C2C2C', border: 'none', borderBottom: '1.5px solid #aaa', background: 'transparent', outline: 'none', width: 44, fontFamily: 'inherit' }}
        />
      ) : (
        <span onClick={() => setEditing(true)} style={{ fontSize: 12, fontWeight: 700, color: '#2C2C2C', borderBottom: '1.5px solid #aaa', minWidth: 32, cursor: 'text', display: 'inline-block' }}>
          {entry?.actual_weight || ''}
        </span>
      )}
    </div>
  )
}

const cancelBtn = {
  padding: '8px 16px', background: '#f5f5f5', color: '#888',
  border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
}

const yearBtn = {
  padding: '5px 10px', fontSize: 11, fontWeight: 600,
  border: '1px solid #ddd', background: '#fff', color: '#2C2C2C',
  borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
}
