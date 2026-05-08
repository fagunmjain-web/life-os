import { useRef, useEffect, useState } from 'react'

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))
const AMPM = ['AM', 'PM']
const ITEM_H = 40

function parseTime(str) {
  if (!str) return { h: '09', m: '00', p: 'AM' }
  const [hh, mm] = str.split(':')
  let h = parseInt(hh, 10)
  const p = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  const mNum = parseInt(mm || '0', 10)
  const mRounded = Math.round(mNum / 5) * 5
  return { h: String(h).padStart(2, '0'), m: String(mRounded % 60).padStart(2, '0'), p }
}

function toTime24(h, m, p) {
  let hour = parseInt(h, 10)
  if (p === 'AM' && hour === 12) hour = 0
  else if (p === 'PM' && hour !== 12) hour += 12
  return `${String(hour).padStart(2, '0')}:${m}`
}

function Col({ items, value, onChange }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    const idx = items.indexOf(value)
    if (idx >= 0) ref.current.scrollTop = idx * ITEM_H
  }, [value])
  return (
    <div ref={ref} style={{ height: ITEM_H * 3, overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', flex: 1 }}>
      {items.map(item => (
        <div key={item} onClick={() => onChange(item)} style={{
          height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', borderRadius: 8, margin: '0 4px',
          fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
          background: value === item ? '#2C2C2C' : 'transparent',
          color: value === item ? '#fff' : '#bbb',
          transition: 'background .12s, color .12s',
          userSelect: 'none',
        }}>{item}</div>
      ))}
    </div>
  )
}

export default function TimePicker({ value, onChange }) {
  const { h, m, p } = parseTime(value)
  const [selH, setSelH] = useState(h)
  const [selM, setSelM] = useState(m)
  const [selP, setSelP] = useState(p)

  function update(nh, nm, np) { onChange(toTime24(nh, nm, np)) }

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', background: '#f5f5f5', borderRadius: 12, padding: '4px 0', overflow: 'hidden' }}>
      <Col items={HOURS} value={selH} onChange={v => { setSelH(v); update(v, selM, selP) }} />
      <div style={{ display: 'flex', alignItems: 'center', fontSize: 18, fontWeight: 700, color: '#ccc', padding: '0 2px', flexShrink: 0 }}>:</div>
      <Col items={MINUTES} value={selM} onChange={v => { setSelM(v); update(selH, v, selP) }} />
      <div style={{ width: 1, background: '#e0e0e0', margin: '8px 8px', flexShrink: 0 }} />
      <Col items={AMPM} value={selP} onChange={v => { setSelP(v); update(selH, selM, v) }} />
    </div>
  )
}
