import { useState } from 'react'
import { toDateStr } from '../utils.js'
import TimePicker from './TimePicker.jsx'

const DEFAULT_EVENT_TYPES = [
  { key: 'celebration', label: 'Celebrations', color: '#E57373', bg: '#FFEBEB', textColor: '#C62828' },
  { key: 'important',   label: 'Important',    color: '#5B8ED6', bg: '#E6F1FB', textColor: '#185FA5' },
  { key: 'travel',      label: 'Travel',       color: '#E65100', bg: '#FFF3E0', textColor: '#E65100' },
]

export default function EventModal({ date, event, onSave, onUpdate, onClose, eventTypes, initialTitle }) {
  const types = eventTypes || DEFAULT_EVENT_TYPES
  const isEdit = !!event
  const initialDate = date ? toDateStr(date) : event?.start_date || toDateStr(new Date())

  const [title, setTitle]               = useState(event?.title || initialTitle || '')
  const [type, setType]                 = useState(event?.event_type || types[0]?.key || 'important')
  const [startDate, setStartDate]       = useState(initialDate)
  const [endDate, setEndDate]           = useState(event?.end_date || '')
  const [startTime, setStartTime]       = useState(event?.start_time || event?.event_time || '')
  const [endTime, setEndTime]           = useState(event?.end_time || '')
  const [repeatAnnually, setRepeatAnnually] = useState(event ? (event.repeat_annually ?? false) : true)

  function handleTitleChange(e) {
    const v = e.target.value
    setTitle(v.length === 1 ? v.toUpperCase() : v)
  }

  function handleSave() {
    if (!title.trim()) return
    const data = {
      title: title.trim(),
      event_type: type,
      start_date: startDate,
      end_date: endDate || null,
      event_time: startTime || null,
      end_time: endTime || null,
    }
    if (isEdit) onUpdate({ ...data, id: event.id })
    else onSave(data)
  }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modal}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#2C2C2C', marginBottom: 16 }}>
          {isEdit ? 'Edit event' : 'Add event'}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={fieldLabel}>Event name</div>
          <input autoFocus value={title} onChange={handleTitleChange}
            placeholder="e.g. Dentist appointment" style={input} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={fieldLabel}>Type</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {types.map(t => (
              <button key={t.key} onClick={() => setType(t.key)} style={{
                flex: 1, minWidth: 80, padding: '7px 0', fontSize: 13, fontWeight: 600, borderRadius: 8,
                border: 'none',
                background: type === t.key ? t.color : t.bg,
                color: type === t.key ? '#fff' : t.textColor,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {type === 'celebration' && (
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2C' }}>Repeat annually</span>
            <div onClick={() => setRepeatAnnually(v => !v)} style={{
              width: 42, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative',
              background: repeatAnnually ? '#E57373' : '#ddd', transition: 'background .2s',
            }}>
              <div style={{
                position: 'absolute', top: 3, left: repeatAnnually ? 21 : 3,
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left .2s',
              }} />
            </div>
          </div>
        )}

        {/* Start date + End date side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <div style={fieldLabel}>Start date</div>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={input} />
          </div>
          <div>
            <div style={fieldLabel}>End date</div>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={input} />
          </div>
        </div>

        {/* Start time + End time side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <div style={fieldLabel}>Start time</div>
            {startTime ? (
              <>
                <TimePicker value={startTime} onChange={setStartTime} />
                <button onClick={() => setStartTime('')} style={clearBtn}>Clear</button>
              </>
            ) : (
              <button onClick={() => setStartTime('09:00')} style={addTimeBtn}>+ Start time</button>
            )}
          </div>
          <div>
            <div style={fieldLabel}>End time</div>
            {endTime ? (
              <>
                <TimePicker value={endTime} onChange={setEndTime} />
                <button onClick={() => setEndTime('')} style={clearBtn}>Clear</button>
              </>
            ) : (
              <button onClick={() => setEndTime('10:00')} style={addTimeBtn}>+ End time</button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={cancelBtn}>Cancel</button>
          <button onClick={handleSave} style={saveBtn}>{isEdit ? 'Update event' : 'Save event'}</button>
        </div>
      </div>
    </div>
  )
}

const overlay    = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
const modal      = { background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: '90vh', overflowY: 'auto' }
const fieldLabel = { fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }
const input      = { width: '100%', padding: '8px 10px', border: '1px solid #EBEBEB', borderRadius: 8, fontSize: 14, color: '#2C2C2C', background: '#f9f9f9', fontFamily: 'inherit', outline: 'none' }
const addTimeBtn = { fontSize: 13, color: '#888', background: '#f5f5f5', border: '1px dashed #ddd', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'left' }
const clearBtn   = { marginTop: 4, fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }
const saveBtn    = { padding: '9px 24px', background: '#2C2C2C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const cancelBtn  = { padding: '9px 16px', background: '#f5f5f5', color: '#888', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }
