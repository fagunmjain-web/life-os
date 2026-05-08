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
  { key: 'important',   label: 'Important',    color: '#5B8ED6', bg: '#E6F1FB', textColor: '#185FA5' },
  { key: 'travel',      label: 'Travel',       color: '#E65100', bg: '#FFF3E0', textColor: '#E65100' },
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
    const existing = completions.find(
      c => String(c.task_id) === String(taskId) && c.completed_date === dateStr
    )
    if (existing) {
      // Optimistic: remove immediately so switching views shows the change instantly
      setCompletions(prev => prev.filter(c => c.id !== existing.id))
      await supabase.from('task_completions').delete().eq('id', existing.id)
    } else {
      // Optimistic: add a temp record immediately, replace with real one after DB responds
      const tempId = `temp_${Date.now()}`
      setCompletions(prev => [...prev, { id: tempId, task_id: taskId, completed_date: dateStr }])
      const { data } = await supabase
        .from('task_completions')
        .insert({ task_id: taskId, completed_date: dateStr })
        .select()
        .single()
      if (data) setCompletions(prev => prev.map(c => c.id === tempId ? data : c))
      else setCompletions(prev => prev.filter(c => c.id !== tempId))
    }
  }

  async function saveWeight(dateStr, weight) {
    const existing = weightEntries.find(w => w.entry_date === dateStr)
    if (existing) {
      await supabase.from('weight_entries').update({ actual_weight: weight }).eq('id', existing.id)
      setWeightEntries(prev => prev.map(w => w.entry_date === dateStr ? { ...w, actual_weight: weight } : w))
    } else {
      const { data } = await supabase
        .from('weight_entries')
        .insert({ entry_date: dateStr, actual_weight: weight })
        .select()
        .single()
      if (data) setWeightEntries(prev => [...prev, data])
    }
  }

  async function saveTask(taskData) {
    // Only send columns that exist in the tasks table — extra fields (e.g. end_date) cause silent insert failures
    const { id, title, section, is_recurring, days_of_week, specific_date, time_of_day } = taskData
    const payload = { title, section, is_recurring, days_of_week, specific_date, time_of_day }

    if (id) {
      const { data, error } = await supabase.from('tasks').update(payload).eq('id', id).select().single()
      if (error) { console.error('[saveTask] update error:', error); return }
      if (data) setTasks(prev => prev.map(t => t.id === data.id ? data : t))
    } else {
      const { data, error } = await supabase.from('tasks').insert(payload).select().single()
      if (error) { console.error('[saveTask] insert error:', error); return }
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
    // Pick only known events table columns (start_time may not exist yet)
    const { title, event_type, start_date, end_date } = eventData
    const payload = { title, event_type, start_date, end_date }
    const { data, error } = await supabase.from('events').insert(payload).select().single()
    if (error) { console.error('[saveEvent] insert error:', error); return }
    if (data) setEvents(prev => [...prev, data])
    setEventModal(null)
  }

  async function deleteEvent(eventId) {
    await supabase.from('events').delete().eq('id', eventId)
    setEvents(prev => prev.filter(e => e.id !== eventId))
  }

  async function updateEvent(eventData) {
    const { id, title, event_type, start_date, end_date } = eventData
    const payload = { title, event_type, start_date, end_date }
    const { data, error } = await supabase.from('events').update(payload).eq('id', id).select().single()
    if (error) { console.error('[updateEvent] update error:', error); return }
    if (data) setEvents(prev => prev.map(e => e.id === data.id ? data : e))
    setEventModal(null)
  }

  async function moveTask(task, targetDateStr) {
    const dow = task.days_of_week
    const isRecurring = task.is_recurring || (Array.isArray(dow) && dow.length > 0)
    if (isRecurring) {
      // Recurring → create a new one-off copy on the target date
      const payload = { title: task.title, section: task.section, is_recurring: false, days_of_week: [], specific_date: targetDateStr, time_of_day: task.time_of_day }
      const { data, error } = await supabase.from('tasks').insert(payload).select().single()
      if (error) { console.error('[moveTask] insert error:', error); return }
      if (data) setTasks(prev => [...prev, data])
    } else {
      // One-off → update specific_date
      const { data, error } = await supabase.from('tasks').update({ specific_date: targetDateStr }).eq('id', task.id).select().single()
      if (error) { console.error('[moveTask] update error:', error); return }
      if (data) setTasks(prev => prev.map(t => t.id === data.id ? data : t))
    }
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
      const dow = t.days_of_week
      const hasRealDays = Array.isArray(dow) && dow.length > 0
      // Treat as recurring when flagged OR when it has days configured (handles legacy null is_recurring)
      if (t.is_recurring === true || (t.is_recurring !== false && hasRealDays)) {
        return hasRealDays && dow.includes(dayName)
      }
      return t.specific_date === dateStr
    })
  }

  // Bug fix: String() coercion for UUID/integer safety
  function isCompleted(taskId, dateStr) {
    return completions.some(
      c => String(c.task_id) === String(taskId) && c.completed_date === dateStr
    )
  }

  function getEventsForDate(date) {
    const dateStr = toDateStr(date)
    return events.filter(e => {
      if (!e.end_date) return e.start_date === dateStr
      return dateStr >= e.start_date && dateStr <= e.end_date
    })
  }

  function getWeightTarget(dateStr) { return weightTargets.find(w => w.target_date === dateStr) }
  function getWeightEntry(dateStr)  { return weightEntries.find(w => w.entry_date === dateStr) }

  function hasOverdue(date) {
    const dateStr = toDateStr(date)
    if (dateStr >= toDateStr(new Date())) return false
    return getTasksForDate(date).some(t => !isCompleted(t.id, dateStr))
  }

  // Past day where every task is complete (or there are no tasks) → grey it out
  function isFullyDone(date) {
    const dateStr = toDateStr(date)
    if (dateStr >= toDateStr(new Date())) return false
    const dayTasks = getTasksForDate(date)
    return dayTasks.every(t => isCompleted(t.id, dateStr))
  }

  function navigate(dir) {
    setCurrentDate(d => {
      if (activeView === 'Day')   return addDays(d, dir)
      if (activeView === 'Week')  return addDays(d, dir * 7)
      if (activeView === 'Month') { const n = new Date(d); n.setMonth(n.getMonth() + dir); return n }
      if (activeView === 'Year')  { const n = new Date(d); n.setFullYear(n.getFullYear() + dir); return n }
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

  const dateStr    = toDateStr(currentDate)
  const weightTarget = getWeightTarget(dateStr)
  const weightEntry  = getWeightEntry(dateStr)
  const showWeight = activeView === 'Day' && isFriday(currentDate) && weightTarget

  function getHeaderTitle() {
    if (activeView === 'Day') {
      const d = currentDate
      return `${String(d.getDate()).padStart(2,'0')} ${MONTH_SHORT[d.getMonth()]}  ${DAY_NAMES[d.getDay()]}`
    }
    if (activeView === 'Week')  return `${MONTH_SHORT[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    if (activeView === 'Month') return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    if (activeView === 'Year')  return `${currentDate.getFullYear()}`
    return ''
  }

  const sharedProps = {
    currentDate, setCurrentDate, tasks, completions, events,
    weightTargets, weightEntries, sections,
    getTasksForDate, isCompleted, getEventsForDate,
    getWeightTarget, getWeightEntry, hasOverdue, isFullyDone,
    toggleCompletion, saveWeight,
    deleteTask: (id) => {
      const t = tasks.find(t => t.id === id)
      setDeleteConfirm({ type: 'task', id, name: t?.title || 'this task' })
    },
    deleteEvent: (id) => {
      const e = events.find(ev => ev.id === id)
      setDeleteConfirm({ type: 'event', id, name: e?.title || 'this event' })
    },
    onEditTask:  (task) => setTaskModal({ task }),
    onAddTask:   (sectionKey, date) => setTaskModal({ defaultSection: sectionKey, defaultDate: date }),
    onAddEvent:  (date) => setEventModal({ date }),
    onEditEvent: (event) => setEventModal({ event }),
    navigate, activeView, setActiveView, getEventTypeStyle, moveTask,
  }

  const VIEWS = ['Today', 'Day', 'Week', 'Month', 'Year']

  function renameSection(key, name) {
    if (name.trim()) setSections(prev => prev.map(s => s.key === key ? { ...s, label: name.trim() } : s))
    setEditingSection(null)
  }
  function renameEventType(key, name) {
    if (name.trim()) setEventTypes(prev => prev.map(et => et.key === key ? { ...et, label: name.trim() } : et))
    setEditingEventType(null)
  }
  function addEventType() {
    if (!newEventType?.name?.trim()) return
    const colors = ET_PRESET_COLORS[newEventType.colorIdx] || ET_PRESET_COLORS[0]
    setEventTypes(prev => [...prev, {
      key: newEventType.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
      label: newEventType.name.trim(), ...colors,
    }])
    setNewEventType(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', overflowX: 'hidden', maxWidth: '100vw' }}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
    >
      {/* HAMBURGER OVERLAY */}
      {hamOpen && (
        <div onClick={() => { setHamOpen(false); setEditingSection(null); setEditingEventType(null); setNewEventType(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'absolute', top: 10, left: 10, width: 480, maxWidth: 'calc(100vw - 20px)',
            background: '#fff', borderRadius: 16, padding: 24,
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)', maxHeight: '88vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#2C2C2C' }}>Manage</span>
              <span onClick={() => setHamOpen(false)} style={{ cursor: 'pointer', fontSize: 24, color: '#aaa', lineHeight: 1 }}>×</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Task sections */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Task sections</div>
                {sections.map(s => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                    {/* Colour swatch — clicking opens native colour picker */}
                    <label style={{ cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', position: 'relative' }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, background: s.cb, border: '1px solid rgba(0,0,0,0.1)' }} />
                      <input
                        type="color"
                        value={s.cb}
                        onChange={e => setSections(prev => prev.map(sec => sec.key === s.key ? { ...sec, cb: e.target.value } : sec))}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                        tabIndex={-1}
                      />
                    </label>
                    {/* Section name — click text to edit inline */}
                    {editingSection === s.key ? (
                      <input autoFocus value={editingSectionName}
                        onChange={e => setEditingSectionName(e.target.value)}
                        onBlur={() => renameSection(s.key, editingSectionName)}
                        onKeyDown={e => e.key === 'Enter' && renameSection(s.key, editingSectionName)}
                        style={{ fontSize: 14, color: '#2C2C2C', border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', outline: 'none', fontFamily: 'inherit', fontWeight: 600, flex: 1 }}
                      />
                    ) : (
                      <span
                        onClick={() => { setEditingSection(s.key); setEditingSectionName(s.label) }}
                        style={{ color: '#2C2C2C', flex: 1, cursor: 'text', fontSize: 14, fontWeight: 600 }}
                      >{s.label}</span>
                    )}
                    {/* Delete only — no pencil icon */}
                    <span onClick={() => setDeleteConfirm({ type: 'section', key: s.key, name: s.label })} style={{ color: '#C62828', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</span>
                  </div>
                ))}
                <div onClick={() => { setHamOpen(false); setSectionModal(true) }}
                  style={{ fontSize: 13, color: '#aaa', cursor: 'pointer', padding: '8px 0 2px', marginTop: 4 }}>
                  + Add section
                </div>
              </div>

              {/* Event types */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Event types</div>
                {eventTypes.map(et => (
                  <div key={et.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: et.color, flexShrink: 0, border: '1px solid rgba(0,0,0,0.1)' }} />
                    {editingEventType === et.key ? (
                      <input autoFocus value={editingEventTypeName}
                        onChange={e => setEditingEventTypeName(e.target.value)}
                        onBlur={() => renameEventType(et.key, editingEventTypeName)}
                        onKeyDown={e => e.key === 'Enter' && renameEventType(et.key, editingEventTypeName)}
                        style={{ fontSize: 14, color: '#2C2C2C', border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', outline: 'none', fontFamily: 'inherit', fontWeight: 600, flex: 1 }}
                      />
                    ) : (
                      <span
                        onClick={() => { setEditingEventType(et.key); setEditingEventTypeName(et.label) }}
                        style={{ color: '#2C2C2C', flex: 1, cursor: 'text', fontSize: 14, fontWeight: 600 }}
                      >{et.label}</span>
                    )}
                    <span onClick={() => setDeleteConfirm({ type: 'eventType', key: et.key, name: et.label })} style={{ color: '#C62828', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</span>
                  </div>
                ))}
                {newEventType ? (
                  <div style={{ marginTop: 10, padding: 10, background: '#f9f9f9', borderRadius: 8 }}>
                    <input autoFocus placeholder="Type name" value={newEventType.name}
                      onChange={e => setNewEventType(prev => ({ ...prev, name: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addEventType()}
                      style={{ width: '100%', fontSize: 13, border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', outline: 'none', fontFamily: 'inherit', marginBottom: 8 }}
                    />
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                      {ET_PRESET_COLORS.map((c, i) => (
                        <div key={i} onClick={() => setNewEventType(prev => ({ ...prev, colorIdx: i }))}
                          style={{ width: 18, height: 18, borderRadius: 4, background: c.color, cursor: 'pointer', border: newEventType.colorIdx === i ? '2px solid #2C2C2C' : '2px solid transparent' }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={addEventType} style={{ fontSize: 12, padding: '4px 10px', background: '#2C2C2C', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                      <button onClick={() => setNewEventType(null)} style={{ fontSize: 12, padding: '4px 10px', background: '#f0f0f0', color: '#888', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => setNewEventType({ name: '', colorIdx: 0 })}
                    style={{ fontSize: 13, color: '#aaa', cursor: 'pointer', padding: '8px 0 2px', marginTop: 4 }}>
                    + Add event type
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
            <div style={{ fontSize: 16, fontWeight: 700, color: '#2C2C2C', marginBottom: 6 }}>Are you sure?</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Delete "{deleteConfirm.name}"?</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirm(null)} style={cancelBtn}>No</button>
              <button onClick={() => {
                if (deleteConfirm.type === 'section')   deleteSection(deleteConfirm.key)
                if (deleteConfirm.type === 'event')     { deleteEvent(deleteConfirm.id); setDeleteConfirm(null) }
                if (deleteConfirm.type === 'task')      { deleteTask(deleteConfirm.id); setDeleteConfirm(null) }
                if (deleteConfirm.type === 'eventType') { setEventTypes(prev => prev.filter(et => et.key !== deleteConfirm.key)); setDeleteConfirm(null) }
              }} style={{ ...cancelBtn, background: '#C62828', color: '#fff' }}>Yes, delete</button>
            </div>
          </div>
        </div>
      )}

      {/* STICKY HEADER */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#f7f7f5', padding: '8px 16px 8px' }}>
        {/* Row 1 — nav tabs at the very top */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
          {VIEWS.map(v => {
            const isActive = activeView === v && v !== 'Today'
            return (
              <button key={v}
                onClick={() => {
                  if (v === 'Today') { setCurrentDate(new Date()); setActiveView('Day') }
                  else setActiveView(v)
                }}
                style={{
                  flex: 1, padding: '7px 0', fontSize: 13, fontWeight: 600,
                  border: 'none',
                  background: isActive ? '#2C2C2C' : '#e8e8e8',
                  borderRadius: 10, cursor: 'pointer',
                  color: isActive ? '#fff' : '#777',
                  transition: 'all .15s', fontFamily: 'inherit',
                }}
              >{v}</button>
            )
          })}
        </div>

        {/* Row 2 — hamburger / title / action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginBottom: showWeight && isMobile ? 4 : 0 }}>
          {/* Left: hamburger */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button onClick={() => setHamOpen(true)} style={{ width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, padding: 4 }}>
              <span style={{ display: 'block', height: 2, background: '#555', borderRadius: 1, width: 20 }} />
              <span style={{ display: 'block', height: 2, background: '#555', borderRadius: 1, width: 20 }} />
              <span style={{ display: 'block', height: 2, background: '#555', borderRadius: 1, width: 20 }} />
            </button>
          </div>
          {/* Center: nav arrows + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 26, color: '#888', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>‹</button>
            <div style={{ fontSize: 19, fontWeight: 600, color: '#2C2C2C', minWidth: 130, textAlign: 'center' }}>{getHeaderTitle()}</div>
            <button onClick={() => navigate(1)}  style={{ background: 'none', border: 'none', fontSize: 26, color: '#888', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>›</button>
          </div>
          {/* Right: year-view buttons or weight widget */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
            {activeView === 'Year' && (
              <>
                <button onClick={() => setTaskModal({ defaultSection: null })} style={yearBtn}>+ Task</button>
                <button onClick={() => setEventModal({ date: new Date() })}    style={yearBtn}>+ Event</button>
              </>
            )}
            {showWeight && !isMobile && (
              <WeightInline target={weightTarget} entry={weightEntry} dateStr={dateStr} saveWeight={saveWeight} />
            )}
          </div>
        </div>

        {/* Weight row — mobile Day+Friday only */}
        {showWeight && isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
            <WeightInline target={weightTarget} entry={weightEntry} dateStr={dateStr} saveWeight={saveWeight} />
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999', fontSize: 15 }}>Loading your life...</div>
      ) : (
        <div style={{ width: '100%', padding: '8px 16px 32px' }}>
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
      {sectionModal && <SectionModal onSave={saveSection} onClose={() => setSectionModal(false)} />}
      {eventModal && (
        <EventModal
          date={eventModal.date} event={eventModal.event}
          eventTypes={eventTypes}
          onSave={saveEvent} onUpdate={updateEvent} onClose={() => setEventModal(null)} />
      )}
    </div>
  )
}

function WeightInline({ target, entry, dateStr, saveWeight }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(entry?.actual_weight ?? '')
  useEffect(() => { setVal(entry?.actual_weight ?? '') }, [entry?.actual_weight])
  function handleBlur() {
    setEditing(false)
    if (val !== '' && !isNaN(val)) saveWeight(dateStr, parseFloat(val))
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#4A8C40', whiteSpace: 'nowrap' }}>Wt: {target.target_weight}kg</span>
      {editing ? (
        <input autoFocus type="number" step="0.1" value={val} onChange={e => setVal(e.target.value)} onBlur={handleBlur}
          style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2C', border: 'none', borderBottom: '1.5px solid #aaa', background: 'transparent', outline: 'none', width: 44, fontFamily: 'inherit' }}
        />
      ) : (
        <span onClick={() => setEditing(true)} style={{ fontSize: 13, fontWeight: 700, color: '#2C2C2C', borderBottom: '1.5px solid #aaa', minWidth: 32, cursor: 'text', display: 'inline-block' }}>
          {entry?.actual_weight ?? ''}
        </span>
      )}
    </div>
  )
}

const cancelBtn = { padding: '9px 18px', background: '#f5f5f5', color: '#888', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }
const yearBtn   = { padding: '6px 11px', fontSize: 12, fontWeight: 600, border: 'none', background: '#e8e8e8', color: '#2C2C2C', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }
