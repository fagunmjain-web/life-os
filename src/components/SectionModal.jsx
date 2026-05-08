import { useState } from 'react'

const SWATCHES = [
  { bg: '#C8E6C0', sb: '#E8F5E4', cb: '#4A8C40', ct: '#2C4A24' },
  { bg: '#FFCDD2', sb: '#FFEBEE', cb: '#C62828', ct: '#5C1A1A' },
  { bg: '#E1BEE7', sb: '#F3E5F5', cb: '#7B1FA2', ct: '#3A1245' },
  { bg: '#BBDEFB', sb: '#E3F2FD', cb: '#1565C0', ct: '#0D2E5C' },
  { bg: '#FFF9C4', sb: '#FFFDE7', cb: '#F9A825', ct: '#4A3B00' },
  { bg: '#FFE0B2', sb: '#FFF3E0', cb: '#E65100', ct: '#4E2100' },
  { bg: '#F8BBD9', sb: '#FCE4EC', cb: '#C2185B', ct: '#880E4F' },
  { bg: '#B2DFDB', sb: '#E0F2F1', cb: '#00796B', ct: '#004D40' },
  { bg: '#D7CCC8', sb: '#EFEBE9', cb: '#5D4037', ct: '#3E2723' },
  { bg: '#CFD8DC', sb: '#ECEFF1', cb: '#455A64', ct: '#263238' },
]

export default function SectionModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [selected, setSelected] = useState(0)

  function handleSave() {
    if (!name.trim()) return
    const s = SWATCHES[selected]
    onSave({
      key: name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
      label: name.trim(),
      sh: s.bg, sb: s.sb, cb: s.cb, ct: s.ct,
    })
  }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modal}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#2C2C2C', marginBottom: 18 }}>New section</div>
        <div style={{ marginBottom: 14 }}>
          <div style={fieldLabel}>Section name</div>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Finance" style={input} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={fieldLabel}>Colour</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SWATCHES.map((s, i) => (
              <div key={i} onClick={() => setSelected(i)} style={{
                width: 30, height: 30, borderRadius: 8, background: s.bg, cursor: 'pointer',
                border: selected === i ? '2.5px solid #2C2C2C' : '2px solid transparent',
              }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={cancelBtn}>Cancel</button>
          <button onClick={handleSave} style={saveBtn}>Save section</button>
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
