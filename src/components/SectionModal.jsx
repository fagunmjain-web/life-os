import { useState } from 'react'

const SWATCHES = [
  { sh: '#C8D9C8', sb: '#EEF3EE', cb: '#6F8F72', ct: '#2C3D2D' }, // Health
  { sh: '#C8CCE0', sb: '#ECEEF6', cb: '#5F6FA8', ct: '#252D45' }, // Work
  { sh: '#D9D0CC', sb: '#F2EDEB', cb: '#8A756B', ct: '#3A2F2B' }, // Admin
  { sh: '#C0D5D4', sb: '#EBF3F2', cb: '#4F7F7A', ct: '#1E3331' }, // Chores
  { sh: '#EAC0CF', sb: '#F9EBF1', cb: '#C24D7A', ct: '#4D1E30' }, // Social
  { sh: '#EDD4B0', sb: '#FAF0E3', cb: '#D8902F', ct: '#573A12' }, // Travel
  { sh: '#D4C8E8', sb: '#F0EBF8', cb: '#8B6FAF', ct: '#362850' }, // Dusty Violet
  { sh: '#D9CBC6', sb: '#F2EDEB', cb: '#7A5A4F', ct: '#3A2520' }, // Cocoa Brown
  { sh: '#CCCFBB', sb: '#EEEEE8', cb: '#6C7551', ct: '#2C2E1E' }, // Deep Olive
  { sh: '#EBC9C2', sb: '#FAEEE9', cb: '#D47B6A', ct: '#5A2E25' }, // Muted Coral
  { sh: '#C8DDD0', sb: '#EEF4F0', cb: '#7CA08A', ct: '#2E4035' }, // Eucalyptus
  { sh: '#C4D5E4', sb: '#EBF1F6', cb: '#7296B2', ct: '#2A3D4F' }, // Dusty Sky
  { sh: '#E5D3A8', sb: '#F7F0E0', cb: '#B88A2E', ct: '#4A3712' }, // Honey Mustard
  { sh: '#E0C8D5', sb: '#F5ECF2', cb: '#A06C86', ct: '#3D2534' }, // Warm Mauve
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
      sh: s.sh, sb: s.sb, cb: s.cb, ct: s.ct,
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
                width: 30, height: 30, borderRadius: 8, background: s.sh, cursor: 'pointer',
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
