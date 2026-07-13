import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const SAMPLE = `MEDICATIONS AT DISCHARGE. 1. Metoprolol tartrate 25 mg by mouth twice daily - NEW. Take with food. 2. Warfarin 2.5 mg by mouth daily - NEW. INR check in 5 days. 5. DISCONTINUE ibuprofen. WARNING: Call your doctor if weight gain of more than 3 pounds in one day.`

const C = {
  ink: '#1F2430',
  paper: '#FAF8F3',
  verify: '#3E6B4F',
  attend: '#B8860B',
  flag: '#9B3B2E',
  cite: '#5B6472',
  border: '#E3DED3',
}

function titleOf(item) {
  return item.payload?.name || item.payload?.title || item.payload?.watch_for || item.payload?.with || 'Item'
}

function App() {
  const [text, setText] = useState(SAMPLE)
  const [candidates, setCandidates] = useState([])   // items awaiting review
  const [plan, setPlan] = useState([])               // confirmed items (from DB)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  // Load already-confirmed plan items from the database on startup
  useEffect(() => { loadPlan() }, [])

  async function loadPlan() {
    const { data, error } = await supabase
      .from('plan_items')
      .select('*')
      .order('confirmed_at', { ascending: false })
    if (!error && data) setPlan(data)
  }

  async function handleExtract() {
    setLoading(true); setError(''); setCandidates([])
    try {
      const res = await fetch('/.netlify/functions/extract', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pages: [{ page: 1, text }] }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setCandidates((data.items || []).map((it, i) => ({ ...it, _id: 'c' + i })))
    } catch (e) { setError(String(e)) }
    setLoading(false)
  }

  // CONFIRM: write this item into the database plan, remove from review list
  async function confirmItem(item) {
    const { error } = await supabase.from('plan_items').insert({
      category: item.category,
      payload: item.payload,
      confirmed_at: new Date().toISOString(),
    })
    if (error) { setError('Could not save: ' + error.message); return }
    setCandidates((c) => c.filter((x) => x._id !== item._id))
    loadPlan()
  }

  // REJECT: just drop it from the review list, never saved
  function rejectItem(item) {
    setCandidates((c) => c.filter((x) => x._id !== item._id))
  }

  // EDIT: open inline editor for the plain-language text
  function startEdit(item) {
    setEditingId(item._id)
    setEditText(item.payload?.plain_language || '')
  }
  function saveEdit(item) {
    setCandidates((c) => c.map((x) =>
      x._id === item._id
        ? { ...x, payload: { ...x.payload, plain_language: editText } }
        : x
    ))
    setEditingId(null)
  }

  const colorFor = (item) =>
    item.confidence === 'low' ? C.attend
    : item.category === 'warning' ? C.flag
    : C.verify

  return (
    <div style={{ minHeight: '100vh', background: C.paper, color: C.ink, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: 32 }}>
        <h1 style={{ fontSize: 26, margin: 0 }}>Homecoming</h1>
        <p style={{ color: C.cite, marginTop: 4 }}>Review each item. Nothing enters the care plan until you confirm it.</p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          style={{ width: '100%', fontSize: 14, padding: 12, boxSizing: 'border-box',
                   border: `1px solid ${C.border}`, borderRadius: 8, background: '#fff' }}
        />
        <button onClick={handleExtract} disabled={loading}
          style={{ marginTop: 10, padding: '10px 18px', fontSize: 15, cursor: 'pointer',
                   background: C.ink, color: '#fff', border: 'none', borderRadius: 8 }}>
          {loading ? 'Extracting…' : 'Extract care plan'}
        </button>
        {error && <p style={{ color: C.flag }}>{error}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24 }}>

          {/* LEFT: items to review */}
          <div>
            <h2 style={{ fontSize: 15, color: C.cite }}>To review ({candidates.length})</h2>
            {candidates.map((item) => (
              <div key={item._id} style={{ background: '#fff', border: `1px solid ${colorFor(item)}`,
                borderLeft: `4px solid ${colorFor(item)}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, color: colorFor(item) }}>
                    {item.category}{item.confidence === 'low' ? ' · needs review' : ''}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: C.cite }}>p.{item.source_page}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{titleOf(item)}</div>

                {editingId === item._id ? (
                  <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3}
                    style={{ width: '100%', marginTop: 6, fontSize: 13, boxSizing: 'border-box' }} />
                ) : (
                  <div style={{ fontSize: 13, color: '#444', marginTop: 4 }}>{item.payload?.plain_language}</div>
                )}

                {item.review_note && editingId !== item._id && (
                  <div style={{ fontSize: 12, color: C.attend, marginTop: 6 }}>⚠ {item.review_note}</div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {editingId === item._id ? (
                    <button onClick={() => saveEdit(item)} style={btn(C.verify)}>Save</button>
                  ) : (
                    <>
                      <button onClick={() => confirmItem(item)} style={btn(C.verify)}>Confirm</button>
                      <button onClick={() => startEdit(item)} style={btn(C.cite)}>Edit</button>
                      <button onClick={() => rejectItem(item)} style={btn(C.flag)}>Reject</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {candidates.length === 0 && <p style={{ color: C.cite, fontSize: 13 }}>No items to review. Extract a document above.</p>}
          </div>

          {/* RIGHT: confirmed plan (from database) */}
          <div>
            <h2 style={{ fontSize: 15, color: C.cite }}>Confirmed care plan ({plan.length})</h2>
            {plan.map((item) => (
              <div key={item.id} style={{ background: '#fff', border: `1px solid ${C.border}`,
                borderLeft: `4px solid ${C.verify}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, color: C.verify }}>
                  ✓ {item.category}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{titleOf(item)}</div>
                <div style={{ fontSize: 13, color: '#444', marginTop: 4 }}>{item.payload?.plain_language}</div>
              </div>
            ))}
            {plan.length === 0 && <p style={{ color: C.cite, fontSize: 13 }}>Nothing confirmed yet.</p>}
          </div>

        </div>
      </div>
    </div>
  )
}

function btn(color) {
  return { padding: '5px 12px', fontSize: 13, cursor: 'pointer', color, background: '#fff',
           border: `1px solid ${color}`, borderRadius: 6 }
}

export default App