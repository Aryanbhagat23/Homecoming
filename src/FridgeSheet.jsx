const titleOf = (i) => i.payload?.name || i.payload?.title || i.payload?.watch_for || i.payload?.with || 'Item'

export default function FridgeSheet({ plan, onClose }) {
  const byCat = (c) => plan.filter((p) => p.category === c)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50,
                  display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'auto', padding: 20 }}>
      <div style={{ background: '#fff', maxWidth: 700, width: '100%', borderRadius: 12, padding: 0 }}>

        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', padding: 16,
             borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => window.print()} style={{ padding: '8px 18px', background: 'var(--ink)',
            color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Print this sheet
          </button>
          <button onClick={onClose} style={{ padding: '8px 18px', background: 'transparent',
            color: 'var(--cite)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'var(--font-body)' }}>Close</button>
        </div>

        <div id="fridge" style={{ padding: 32, fontFamily: 'var(--font-body)', color: '#000' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: 0 }}>Home Care Plan</h1>
          <p style={{ color: '#555', marginTop: 2 }}>Keep this where the family can see it.</p>

          <Section title="Medications" items={byCat('medication')} render={(i) =>
            `${titleOf(i)} — ${i.payload?.schedule || ''}${i.payload?.is_stopped ? ' (STOP taking)' : ''}`} />
          <Section title="Appointments" items={byCat('appointment')} render={(i) =>
            `${titleOf(i)} — ${i.payload?.when_text || ''}`} />
          <Section title="Tasks" items={byCat('task')} render={(i) =>
            `${titleOf(i)} — ${i.payload?.when_text || ''}`} />
          <Section title="Call the doctor if…" items={byCat('warning')} render={(i) => titleOf(i)} />

          <p style={{ marginTop: 24, fontSize: 12, color: '#888', borderTop: '1px solid #ddd', paddingTop: 10 }}>
            This sheet organizes your discharge instructions. It is not medical advice. When in doubt, call your care team.
          </p>
        </div>
      </div>
    </div>
  )
}

function Section({ title, items, render }) {
  if (items.length === 0) return null
  return (
    <div style={{ marginTop: 20 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, borderBottom: '2px solid #000',
        paddingBottom: 4, margin: '0 0 8px' }}>{title}</h2>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {items.map((i) => (
          <li key={i.id} style={{ fontSize: 15, marginBottom: 6, lineHeight: 1.4 }}>{render(i)}</li>
        ))}
      </ul>
    </div>
  )
}