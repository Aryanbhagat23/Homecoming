import { useState, useEffect } from 'react'

const titleOf = (i) => i.payload?.name || i.payload?.title || i.payload?.watch_for || i.payload?.with || 'Item'
const v = (name) => `var(--${name})`

export default function SharedPlan({ token }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/.netlify/functions/share?token=${token}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError('Could not load this care plan.'))
  }, [token])

  if (error) return <Center>This link isn't valid. Ask the caregiver to send a new one.</Center>
  if (!data) return <Center>Loading care plan…</Center>

  return (
    <div style={{ minHeight: '100vh', background: v('paper'), color: v('ink') }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 32px' }}>
        <h1 style={{ fontFamily: v('font-display'), fontSize: 34, fontWeight: 600, margin: 0 }}>
          {data.name || 'Care plan'}
        </h1>
        <p style={{ color: v('cite'), fontSize: 14, marginTop: 4 }}>
          Shared care plan · read-only · every item was confirmed by the caregiver
        </p>
        <div style={{ marginTop: 24 }}>
          {data.items.map((item) => (
            <article key={item.id} style={{ background: v('card'), border: `1px solid ${v('border')}`,
                       borderLeft: `4px solid ${v('verify')}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                       color: v('verify'), background: v('verify-bg'), padding: '3px 10px', borderRadius: 20 }}>
                {item.category}
              </span>
              <h3 style={{ fontFamily: v('font-display'), fontSize: 19, fontWeight: 600, margin: '8px 0 2px' }}>
                {titleOf(item)}
              </h3>
              <p style={{ fontSize: 14, color: '#3F4A44', margin: '2px 0 0', lineHeight: 1.55 }}>
                {item.payload?.plain_language}
              </p>
            </article>
          ))}
          {data.items.length === 0 && (
            <p style={{ color: v('cite'), fontStyle: 'italic' }}>No confirmed items yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function Center({ children }) {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-body)', color: 'var(--cite)' }}>{children}</div>
}