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
import Sidebar from './components/Sidebar.jsx'
import { useIsMobile } from './hooks/useIsMobile.js'

const DEFAULT_EVENT_TYPES = [
  { key: 'celebration', label: 'Celebrations', color: '#E57373', bg: '#FFEBEB', textColor: '#C62828' },
  { key: 'important',   label: 'Important',    color: '#5B8ED6', bg: '#E6F1FB', textColor: '#185FA5' },
  { key: 'travel',      label: 'Travel',       color: '#E65100', bg: '#FFF3E0', textColor: '#E65100' },
]

export default function App() {
  const [activeView, setActiveView]     = useState('Day')
  const [currentDate, setCurrentDate]   = useState(new Date())
  const [tasks, setTasks]               = useState([])
  const [completions, setCompletions]   = useState([])
  const [events, setEvents]             = useState([])
  const [weightTargets, setWeightTargets] = useState([])
  const [weightEntries, setWeightEntries] = useState([])
  const [sections, setSections]         = useState(DEFAULT_SECTIONS)
  const [eventTypes, setEventTypes]     = useState(DEFAULT_EVENT_TYPES)
  const [loading, setLoading]           = useState(true)
  const [taskModal, setTaskModal]       = useState(null)
  const [sectionModal, setSectionModal] = useState(false)
  const [eventModal, setEventModal]     = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen]   = useState(() => window.innerWidth >= 640)
  const touchStartX = useRef(null)

  useEffect(() => { loadAll() }, [])

  // Keyboard shortcuts: t=today, d/w/m/y=views
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return
      if (e.key === 't') { setCurrentDate(new Date()); setActiveView('Day') }
      if (e.key === 'd') setActiveView('Day')
      if (e.key === 'w') setActiveView('Week')
      if (e.key === 'm') setActiveView('Month')
      if (e.key === 'y') setActiveView('Year')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

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
    const allEvents = e.data || []
    const thisYear  = new Date().getFullYear()
    const expanded  = [...allEvents]
    allEvents.forEach(ev => {
      if (!ev.repeat_annually) return
      const original     = new Date(ev.start_date + 'T00:00:00')
      const thisYearDate = `${thisYear}-${String(original.getMonth() + 1).padStart(2, '0')}-${String(original.getDate()).padStart(2, '0')}`
      const alreadyExists = allEvents.some(x => x.title === ev.title && x.start_date === thisYearDate)
      if (!alreadyExists && thisYearDate !== ev.start_date) {
        expanded.push({ ...ev, id: `virtual_${ev.id}_${thisYear}`, start_date: thisYearDate })
      }
    })
    setEvents(expanded)
    setWeightTargets(wt.data || [])
    setWeightEntries(we.data || [])
    setLoading(false)
  }

  async function toggleCompletion(taskId, dateStr) {
    const existing = completions.find(c => String(c.task_id) === String(taskId) && c.completed_date === dateStr)
    if (existing) {
      setCompletions(prev => prev.filter(c => c.id !== existing.id))
      await supabase.from('task_completions').delete().eq('id', existing.id)
    } else {
      const tempId = `temp_${Date.now()}`
      setCompletions(prev => [...prev, { id: tempId, task_id: taskId, completed_date: dateStr }])
      const { data } = await supabase.from('task_completions').insert({ task_id: taskId, completed_date: dateStr }).select().single()
      if (data) setCompletions(prev => prev.map(c => c.id === tempId ? data : c))
      else setCompletions(prev => prev.filter(c => c.id !== tempId))
    }
  }

  async function saveWeight(dateStr, weight) {
    const existing = weightEntries.find(w => w.entry_date === dateStr)
    if (existing) {
      setWeightEntries(prev => prev.map(w => w.entry_date === dateStr ? { ...w, actual_weight: weight } : w))
      await supabase.from('weight_entries').update({ actual_weight: weight }).eq('id', existing.id)
    } else {
      const tempId = `temp_${Date.now()}`
      setWeightEntries(prev => [...prev, { id: tempId, entry_date: dateStr, actual_weight: weight }])
      const { data } = await supabase.from('weight_entries').insert({ entry_date: dateStr, actual_weight: weight }).select().single()
      if (data) setWeightEntries(prev => prev.map(w => w.id === tempId ? data : w))
      else setWeightEntries(prev => prev.filter(w => w.id !== tempId))
    }
  }

  // createTask: insert without closing any modal (used by Sidebar inline add)
  async function createTask(taskData) {
    const { title, section, is_recurring, days_of_week, specific_date, time_of_day, is_habit, end_time, end_date } = taskData
    const payload = { title, section, is_recurring, days_of_week, specific_date, time_of_day }
    if (is_habit) payload.is_habit = is_habit
    if (end_time) payload.end_time = end_time
    if (end_date) payload.end_date = end_date
    const { data, error } = await supabase.from('tasks').insert(payload).select().single()
    if (error) { console.error('[createTask] error:', error); return }
    if (data) setTasks(prev => [...prev, data])
  }

  async function saveTask(taskData) {
    const { id, title, section, is_recurring, days_of_week, specific_date, time_of_day, is_habit, end_time, start_date, end_date } = taskData
    const payload = { title, section, is_recurring, days_of_week, specific_date, time_of_day,
      start_date: start_date || null,
      end_date:   end_date   || null,
    }
    if (is_habit !== undefined) payload.is_habit = !!is_habit
    if (end_time) payload.end_time = end_time
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

  async function updateTaskTitle(taskId, newTitle) {
    const { data, error } = await supabase.from('tasks').update({ title: newTitle }).eq('id', taskId).select().single()
    if (error) { console.error('[updateTaskTitle] error:', error); return }
    if (data) setTasks(prev => prev.map(t => t.id === data.id ? data : t))
  }

  async function updateTaskSection(taskId, newSection) {
    const { data, error } = await supabase.from('tasks').update({ section: newSection }).eq('id', taskId).select().single()
    if (error) { console.error('[updateTaskSection] error:', error); return }
    if (data) setTasks(prev => prev.map(t => t.id === data.id ? data : t))
  }

  // Assign a To Do task (no date) to a specific date + section
  async function assignTask(task, dateStr, section) {
    const updates = { specific_date: dateStr }
    if (section) updates.section = section
    const { data, error } = await supabase.from('tasks').update(updates).eq('id', task.id).select().single()
    if (error) { console.error('[assignTask] error:', error); return }
    if (data) setTasks(prev => prev.map(t => t.id === data.id ? data : t))
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
    const { title, event_type, start_date, end_date, event_time, end_time } = eventData
    const payload = { title, event_type, start_date, end_date }
    if (event_time) payload.event_time = event_time
    if (end_time) payload.end_time = end_time
    const { data, error } = await supabase.from('events').insert(payload).select().single()
    if (error) { console.error('[saveEvent] insert error:', error); return }
    if (data) setEvents(prev => [...prev, data])
    setEventModal(null)
  }

  async function createEventFromTask(task, targetDateStr) {
    const payload = { title: task.title, event_type: 'important', start_date: targetDateStr, end_date: null }
    const { data, error } = await supabase.from('events').insert(payload).select().single()
    if (error) { console.error('[createEventFromTask] error:', error); return }
    if (data) setEvents(prev => [...prev, data])
    if (!task.is_recurring) {
      await supabase.from('tasks').delete().eq('id', task.id)
      setTasks(prev => prev.filter(t => t.id !== task.id))
    }
  }

  async function deleteEvent(eventId) {
    await supabase.from('events').delete().eq('id', eventId)
    setEvents(prev => prev.filter(e => e.id !== eventId))
  }

  async function updateEvent(eventData) {
    const { id, title, event_type, start_date, end_date, event_time, end_time } = eventData
    const payload = { title, event_type, start_date, end_date }
    if (event_time) payload.event_time = event_time
    if (end_time) payload.end_time = end_time
    const { data, error } = await supabase.from('events').update(payload).eq('id', id).select().single()
    if (error) { console.error('[updateEvent] update error:', error); return }
    if (data) setEvents(prev => prev.map(e => e.id === data.id ? data : e))
    setEventModal(null)
  }

  // Move an event to a different date by updating start_date
  async function moveEvent(eventId, newDateStr) {
    const { data, error } = await supabase.from('events').update({ start_date: newDateStr }).eq('id', eventId).select().single()
    if (error) { console.error('[moveEvent] error:', error); return }
    if (data) setEvents(prev => prev.map(e => e.id === data.id ? data : e))
  }

  async function moveTask(task, targetDateStr) {
    // null targetDateStr = move back to To Do (unassign date)
    if (targetDateStr === null) {
      const { data, error } = await supabase.from('tasks').update({ specific_date: null }).eq('id', task.id).select().single()
      if (error) { console.error('[moveTask] unassign error:', error); return }
      if (data) setTasks(prev => prev.map(t => t.id === data.id ? data : t))
      return
    }
    // Recurring tasks are defined by their weekly schedule — skip drag-to-date
    if (task.is_recurring === true) return
    const { data, error } = await supabase.from('tasks').update({ specific_date: targetDateStr }).eq('id', task.id).select().single()
    if (error) { console.error('[moveTask] update error:', error); return }
    if (data) setTasks(prev => prev.map(t => t.id === data.id ? data : t))
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
      if (t.is_habit) return false
      if (t.is_recurring) {
        if (!t.days_of_week?.includes(dayName)) return false
        if (t.start_date && dateStr < t.start_date) return false
        if (t.end_date && dateStr > t.end_date) return false
        return true
      }
      return t.specific_date === dateStr
    })
  }

  function isCompleted(taskId, dateStr) {
    return completions.some(c => String(c.task_id) === String(taskId) && c.completed_date === dateStr)
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

  function getHeaderTitle() {
    if (activeView === 'Day') {
      const d = currentDate
      return `${String(d.getDate()).padStart(2, '0')} ${MONTH_SHORT[d.getMonth()]}`
    }
    if (activeView === 'Week') {
      const ws = startOfWeek(currentDate)
      const we = addDays(ws, 6)
      const sm = MONTH_SHORT[ws.getMonth()]
      const em = MONTH_SHORT[we.getMonth()]
      if (sm === em) return `${ws.getDate()}–${we.getDate()} ${sm}`
      return `${ws.getDate()} ${sm}–${we.getDate()} ${em}`
    }
    if (activeView === 'Month') return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    if (activeView === 'Year')  return `${currentDate.getFullYear()}`
    return ''
  }

  const dateStr      = toDateStr(currentDate)
  const weightTarget = getWeightTarget(dateStr)
  const weightEntry  = getWeightEntry(dateStr)
  const showWeight   = activeView === 'Day' && isFriday(currentDate) && !!weightTarget

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
    onAddEvent:  (date, initialTitle) => setEventModal({ date, initialTitle }),
    onEditEvent: (event) => setEventModal({ event }),
    navigate, activeView, setActiveView, getEventTypeStyle, moveTask, assignTask, moveEvent, createEventFromTask, updateTaskSection,
  }

  const VIEWS = ['Today', 'Day', 'Week', 'Month', 'Year']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#faf8f4', overflowX: 'hidden', maxWidth: '100vw' }}>

      {/* STICKY HEADER — full viewport width, never moves when sidebar toggles */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#faf8f4', padding: '8px 16px', borderBottom: '1px solid #ede8e0' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: 38 }}>

          {/* Far left: hamburger */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{ background: 'none', border: 'none', outline: 'none', boxShadow: 'none', cursor: 'pointer', fontSize: 18, color: '#555', padding: '2px 8px 2px 0', lineHeight: 1, flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}
          >☰</button>

          {/* Left side: plain text nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, zIndex: 1 }}>
            {VIEWS.map(v => {
              const isActive = v !== 'Today' && activeView === v
              return (
                <span key={v}
                  onClick={() => { if (v === 'Today') { setCurrentDate(new Date()); setActiveView('Day') } else setActiveView(v) }}
                  style={{ fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? '#2C2C2C' : '#aaa', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
                >{v}</span>
              )
            })}
          </div>

          {/* Centre: ‹ date range › — absolutely centred in the full header */}
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 4, pointerEvents: 'auto' }}>
            <button onClick={() => navigate(-1)} style={navArrowBtn}>‹</button>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#2C2C2C', minWidth: 90, textAlign: 'center', whiteSpace: 'nowrap' }}>{getHeaderTitle()}</div>
            <button onClick={() => navigate(1)}  style={navArrowBtn}>›</button>
          </div>

          {/* Far right: weight widget / year quick-add */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, zIndex: 1 }}>
            {showWeight && (
              <WeightInline target={weightTarget} entry={weightEntry} dateStr={dateStr} saveWeight={saveWeight} />
            )}
            {activeView === 'Year' && !showWeight && (
              <>
                <button onClick={() => setTaskModal({ defaultSection: null, defaultDate: toDateStr(new Date()) })} style={yearBtn}>+ Task</button>
                <button onClick={() => setEventModal({ date: new Date() })} style={yearBtn}>+ Event</button>
              </>
            )}
          </div>

        </div>
      </div>

      {/* CONTENT ROW: sidebar + views */}
      <div style={{ display: 'flex', flex: 1, alignItems: 'flex-start' }}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
      >
        <Sidebar
          open={sidebarOpen}
          isMobile={isMobile}
          onClose={() => setSidebarOpen(false)}
          tasks={tasks}
          completions={completions}
          sections={sections}
          eventTypes={eventTypes}
          currentDate={currentDate}
          toggleCompletion={toggleCompletion}
          createTask={createTask}
          saveTask={saveTask}
          updateTaskTitle={updateTaskTitle}
          deleteTask={deleteTask}
          onEditTask={(task) => setTaskModal({ task })}
          onAddHabit={() => setTaskModal({ defaultRecurring: true, defaultIsHabit: true })}
          moveTask={moveTask}
          setDeleteConfirm={setDeleteConfirm}
          setSectionModal={setSectionModal}
          setEventTypes={setEventTypes}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#999', fontSize: 15 }}>Loading your life…</div>
          ) : (
            <div style={{ width: '100%', padding: '8px 16px 32px' }}>
              {activeView === 'Day'   && <DayView   {...sharedProps} />}
              {activeView === 'Week'  && <WeekView  {...sharedProps} />}
              {activeView === 'Month' && <MonthView {...sharedProps} />}
              {activeView === 'Year'  && <YearView  {...sharedProps} />}
            </div>
          )}
        </div>
      </div>

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

      {taskModal !== null && (
        <TaskModal
          task={taskModal.task}
          defaultSection={taskModal.defaultSection}
          defaultDate={taskModal.defaultDate}
          defaultRecurring={taskModal.defaultRecurring}
          defaultIsHabit={taskModal.defaultIsHabit}
          sections={sections}
          onSave={saveTask}
          onClose={() => setTaskModal(null)}
        />
      )}
      {sectionModal && <SectionModal onSave={saveSection} onClose={() => setSectionModal(false)} />}
      {eventModal && (
        <EventModal
          date={eventModal.date}
          event={eventModal.event}
          initialTitle={eventModal.initialTitle}
          eventTypes={eventTypes}
          onSave={saveEvent}
          onUpdate={updateEvent}
          onClose={() => setEventModal(null)}
        />
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

const navArrowBtn = { background: 'none', border: 'none', outline: 'none', boxShadow: 'none', fontSize: 24, color: '#888', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }
const cancelBtn   = { padding: '9px 18px', background: '#f5f5f5', color: '#888', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }
const yearBtn     = { padding: '6px 11px', fontSize: 12, fontWeight: 600, border: 'none', background: '#e8e8e8', color: '#2C2C2C', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }
