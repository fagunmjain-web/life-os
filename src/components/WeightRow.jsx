import { useState } from 'react'

export default function WeightRow({ target, entry, dateStr, saveWeight, size = 'normal' }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(entry?.actual_weight || '')

  if (!target) return null

  const fontSize = size === 'small' ? 8 : size === 'normal' ? 12 : 13

  function handleBlur() {
    setEditing(false)
    if (val !== '' && !isNaN(val)) saveWeight(dateStr, parseFloat(val))
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      background: '#E8F5E4', borderRadius: 10, padding: '8px 12px', marginBottom: 10,
    }}>
      <span style={{ fontSize, fontWeight: 700, color: '#4A8C40' }}>
        Wt: {target.target_weight}kg
      </span>
      {editing ? (
        <input
          autoFocus
          type="number"
          step="0.1"
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={handleBlur}
          style={{
            fontSize, fontWeight: 700, color: '#2C2C2C',
            border: 'none', borderBottom: '1.5px solid #aaa',
            background: 'transparent', outline: 'none', width: 50,
            fontFamily: 'inherit',
          }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{
            fontSize, fontWeight: 700, color: '#2C2C2C',
            borderBottom: '1.5px solid #aaa', minWidth: 40,
            cursor: 'text', display: 'inline-block',
          }}
        >{entry?.actual_weight || ''}</span>
      )}
    </div>
  )
}
