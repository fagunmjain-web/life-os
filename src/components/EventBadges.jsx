export default function EventBadges({ events, layout = 'column' }) {
  if (!events.length) return null

  const singleDayEvents = events.filter(e => !e.end_date || e.start_date === e.end_date)

  return (
    <div style={{ display: 'flex', flexDirection: layout === 'column' ? 'column' : 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
      {singleDayEvents.map(e => (
        <span
          key={e.id}
          style={{
            background: e.event_type === 'celebration' ? '#E57373' : e.event_type === 'travel' ? '#FFE0B2' : '#5B8ED6',
            color: e.event_type === 'travel' ? '#4E2100' : '#fff',
            fontSize: 11, fontWeight: 600, padding: '6px 10px',
            borderRadius: 10, textAlign: 'center',
            display: layout === 'column' ? 'block' : 'inline-block',
            width: layout === 'column' ? '100%' : 'auto',
          }}
        >{e.title}</span>
      ))}
    </div>
  )
}
