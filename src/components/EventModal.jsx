import { useState } from 'react'
import { toDateStr } from '../utils.js'

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const DEFAULT_EVENT_TYPES = [
  { key: 'celebration', label: 'Celebrations', color: '#E57373', bg: '#FFEBEB', textColor: '#C62828' },
  { key: 'important', label: 'Important', color: '#5B8ED6', bg: '#E6F1FB', textColor: '#185FA5' },
  { key: 'travel', label: 'Travel', color: '#E65100', bg: '#FFF3E0', textColor: '#E65100' },
]

export default function EventModal({ date, event, onSave, onUpdate, onClose, eventTypes }) {
  const types = eventTypes || DEFAULT_EVENT_TYPES
  const isEdit = !!event
  const dateStr = date ? toDateStr(date) : event?.start_date || ''
  const d = date || (event?.start_date ? new Date(event.start_date + 'T00:00:00') : new Date())
  const label = `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`

  const [title, setTitle] = useState(event?.title || '')
  const [type, setType] = useState(event?.event_type || types[0]?.key || 'important')
  const [endDate, setEndDate] = useState(event?.end_date || '')

  function handleSave() {
    if (!title.trim()) return
    const selectedType = types.find(t => t.key === type)
    const data = {
      title: title.trim(),
      event_type: type,
      start_date: dateStr,
      end_date: (selectedType?.key === 'travel' || type === 'travel') && endDate ? endDate : null,
    }
    if (isEdit) onUpdate({ ...data, id: event.id })
    else onSave(data)
  }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modal}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#2C2C2C', marginBottom: 4 }}>
          {isEdit ? 'Edit event' : 'Add event'}
        </div>
        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 16 }}>{label}</div>

        <div style={{ marginBottom: 14 }}>
          <div style={fieldLabel}>Event name</div>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Dentist appointment" style={input} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={fieldLabel}>Type</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {types.map(t => (
              <button key={t.key} onClick={() => setType(t.key)} style={{
                flex: 1, minWidth: 80, padding: '7px 0', fontSize: 11, fontWeight: 600, borderRadius: 8,
                border: `1.5px solid ${t.color}`,
                background: type === t.key ? t.color : t.bg,
                color: type === t.key ? '#fff' : t.textColor,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {type === 'travel' && (
          <div style={{ marginBottom: 14 }}>
            <div style={fieldLabel}>End date</div>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={input} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={cancelBtn}>Cancel</button>
          <button onClick={handleSave} style={saveBtn}>{isEdit ? 'Update event' : 'Save event'}</button>
        </div>
      </div>
    </div>
  )
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
const modal = { background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }
const fieldLabel = { fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 5 }
const input = { width: '100%', padding: '8px 12px', border: '1px solid #EBEBEB', borderRadius: 8, fontSize: 13, color: '#2C2C2C', background: '#f9f9f9', fontFamily: 'inherit', outline: 'none' }
const saveBtn = { padding: '9px 24px', background: '#2C2C2C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const cancelBtn = { padding: '9px 16px', background: '#f5f5f5', color: '#888', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }
