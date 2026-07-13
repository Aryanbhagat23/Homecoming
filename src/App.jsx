import { useState } from 'react'

const SAMPLE = `MEDICATIONS AT DISCHARGE. 1. Metoprolol tartrate 25 mg by mouth twice daily - NEW. Take with food. 2. Warfarin 2.5 mg by mouth daily - NEW. INR check in 5 days. 5. DISCONTINUE ibuprofen.`

function App() {
  const [text, setText] = useState(SAMPLE)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleExtract() {
    setLoading(true)
    setError('')
    setItems([])
    try {
      const res = await fetch('/.netlify/functions/extract', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pages: [{ page: 1, text }] }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setItems(data.items || [])
    } catch (e) {
      setError(String(e))
    }
    setLoading(false)
  }

  const colors = {
    medication: '#3E6B4F',
    task: '#B8860B',
    warning: '#9B3B2E',
    appointment: '#5B6472',
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 26 }}>Homecoming — Extract care plan</h1>
      <p style={{ color: '#666' }}>Paste discharge notes below and click Extract.</p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        style={{ width: '100%', fontSize: 14, padding: 12, boxSizing: 'border-box' }}
      />

      <button
        onClick={handleExtract}
        disabled={loading}
        style={{ marginTop: 12, padding: '10px 20px', fontSize: 16, cursor: 'pointer' }}
      >
        {loading ? 'Extracting…' : 'Extract care plan'}
      </button>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              border: `2px solid ${colors[item.category] || '#ccc'}`,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: colors[item.category], fontWeight: 600 }}>
              {item.category} {item.confidence === 'low' && '· needs review'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>
              {item.payload.name || item.payload.title || item.payload.watch_for}
            </div>
            <div style={{ fontSize: 14, color: '#444', marginTop: 4 }}>
              {item.payload.plain_language}
            </div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
              source: page {item.source_page}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App