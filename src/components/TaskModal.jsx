import { useState } from 'react'
import TimePicker from './TimePicker.jsx'

const DAY_OPTIONS = ['mon','tue','wed','thu','fri','sat','sun']
const DAY_LABELS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function TaskModal({ task, defaultSection, defaultDate, sections, onSave, onClose }) {
  const [title, setTitle] = useState(task?.title || '')

  function handleTitleChange(e) {
    const v = e.target.value
    setTitle(v.length === 1 ? v.toUpperCase() : v)
  }
  const [section, setSection] = useState(task?.section || defaultSection || sections[0]?.key || 'health')
  const [isRecurring, setIsRecurring] = useState(
    task?.is_recurring !== undefined ? task.is_recurring : (defaultDate ? false : true)
  )
  const [days, setDays] = useState(task?.days_of_week || [])
  const [specificDate, setSpecificDate] = useState(task?.specific_date || defaultDate || '')
  const [endDate, setEndDate] = useState(task?.end_date || '')
  const [timeOfDay, setTimeOfDay] = useState(task?.time_of_day || '')

  function toggleDay(d) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  function handleSave() {
    if (!title.trim()) return
    onSave({
      ...(task?.id ? { id: task.id } : {}),
      title: title.trim(),
      section,
      is_recurring: isRecurring,
      days_of_week: isRecurring ? days : [],
      specific_date: isRecurring ? null : specificDate || null,
      end_date: endDate || null,
      time_of_day: timeOfDay || null,
    })
  }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modal}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#2C2C2C', marginBottom: 18 }}>
          {task?.id ? 'Edit task' : 'New task'}
        </div>

        <Field label="Task name">
          <input autoFocus value={title} onChange={handleTitleChange}
            placeholder="e.g. Call dentist" style={input} />
        </Field>

        <Field label="Section">
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {sections.map(s => (
              <button key={s.key} onClick={() => setSection(s.key)} style={{
                padding: '5px 10px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: section === s.key ? s.cb : s.sb,
                color: section === s.key ? '#fff' : s.ct,
                transition: 'all .15s',
              }}>{s.label}</button>
            ))}
          </div>
        </Field>

        <Field label="Type">
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setIsRecurring(true)} style={{ ...typeBtn, ...(isRecurring ? typeBtnActive : {}) }}>Recurring</button>
            <button onClick={() => setIsRecurring(false)} style={{ ...typeBtn, ...(!isRecurring ? typeBtnActive : {}) }}>One-off</button>
          </div>
        </Field>

        {isRecurring ? (
          <>
            <Field label="Days">
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {DAY_OPTIONS.map((d, i) => (
                  <button key={d} onClick={() => toggleDay(d)} style={{
                    padding: '5px 9px', fontSize: 13, fontWeight: 600, borderRadius: 7,
                    border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                    background: days.includes(d) ? '#2C2C2C' : '#f5f5f5',
                    color: days.includes(d) ? '#fff' : '#888',
                    borderColor: days.includes(d) ? '#2C2C2C' : '#e0e0e0',
                  }}>{DAY_LABELS_SHORT[i]}</button>
                ))}
              </div>
            </Field>
            <Field label="End date (optional)">
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={input} />
            </Field>
          </>
        ) : (
          <Field label="Date">
            <input type="date" value={specificDate} onChange={e => setSpecificDate(e.target.value)} style={input} />
          </Field>
        )}

        <Field label="Time (optional)">
          {timeOfDay ? (
            <div>
              <TimePicker value={timeOfDay} onChange={setTimeOfDay} />
              <button onClick={() => setTimeOfDay('')} style={{ marginTop: 8, fontSize: 13, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                Clear time
              </button>
            </div>
          ) : (
            <button onClick={() => setTimeOfDay('09:00')} style={{ fontSize: 14, color: '#888', background: '#f5f5f5', border: '1px dashed #ddd', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>
              + Set time
            </button>
          )}
        </Field>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={cancelBtn}>Cancel</button>
          <button onClick={handleSave} style={saveBtn}>Save task</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  )
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
const modal = { background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440, border: '1px solid #EBEBEB', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: '90vh', overflowY: 'auto' }
const input = { width: '100%', padding: '8px 12px', border: '1px solid #EBEBEB', borderRadius: 8, fontSize: 16, color: '#2C2C2C', background: '#f9f9f9', fontFamily: 'inherit', outline: 'none' }
const typeBtn = { flex: 1, padding: '7px 0', fontSize: 14, fontWeight: 600, border: 'none', background: '#f5f5f5', color: '#888', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }
const typeBtnActive = { background: '#2C2C2C', color: '#fff' }
const saveBtn = { padding: '9px 24px', background: '#2C2C2C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const cancelBtn = { padding: '9px 16px', background: '#f5f5f5', color: '#888', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }
