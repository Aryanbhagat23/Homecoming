import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext.jsx'
import { useCircle } from './useCircle.js'
import Login from './Login.jsx'
import Landing from './Landing.jsx'
import FridgeSheet from './FridgeSheet.jsx'
import { extractPdfPages } from './pdfText.js'
import { downloadFhir } from './fhir.js'

const SAMPLE = `MEDICATIONS AT DISCHARGE. 1. Metoprolol tartrate 25 mg by mouth twice daily - NEW. Take with food. 2. Warfarin 2.5 mg by mouth daily - NEW. INR check in 5 days. 5. DISCONTINUE ibuprofen. WARNING: Call your doctor if weight gain of more than 3 pounds in one day.`

const titleOf = (i) => i.payload?.name || i.payload?.title || i.payload?.watch_for || i.payload?.with || 'Item'
const v = (name) => `var(--${name})`

export default function App() {
  const { session, loading: authLoading } = useAuth()
  const { circleId, loading: circleLoading } = useCircle(session)

  const [showLogin, setShowLogin] = useState(false)   // landing -> login toggle for logged-out users
  const [text, setText] = useState(SAMPLE)
  const [candidates, setCandidates] = useState([])
  const [plan, setPlan] = useState([])
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [showFridge, setShowFridge] = useState(false)
  const [reminderFor, setReminderFor] = useState(null)
  const [reminderWhen, setReminderWhen] = useState('')

  useEffect(() => { if (circleId) { loadPlan(); loadReminders() } }, [circleId])

  async function loadPlan() {
    const { data } = await supabase.from('plan_items').select('*')
      .eq('circle_id', circleId).order('confirmed_at', { ascending: false })
    if (data) setPlan(data)
  }
  async function loadReminders() {
    const { data } = await supabase.from('reminders').select('*')
      .eq('circle_id', circleId).order('remind_at', { ascending: true })
    if (data) setReminders(data)
  }

  if (authLoading) return <Center>Loading…</Center>
  // Logged out: show landing first, then login when they choose to
  if (!session) {
    return showLogin
      ? <Login onBack={() => setShowLogin(false)} />
      : <Landing onGetStarted={() => setShowLogin(true)} />
  }
  if (circleLoading) return <Center>Setting up your care circle…</Center>

  async function handleExtract() {
    setLoading(true); setError(''); setCandidates([])
    try {
      const res = await fetch('/.netlify/functions/extract', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pages: [{ page: 1, text }] }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setCandidates((data.items || []).map((it, i) => ({ ...it, _id: 'c' + i })))
    } catch (e) { setError(String(e)) }
    setLoading(false)
  }

  async function handlePdfUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setError(''); setCandidates([])
    try {
      const pages = await extractPdfPages(file)
      const res = await fetch('/.netlify/functions/extract', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pages }),
      })
      const data = await res.json()
      if (data.error) setError("Couldn't read this as a discharge document. Try a hospital discharge packet or medication list.")
      else if ((data.items || []).length === 0) setError("No medications, appointments, or tasks found in this document.")
      else setCandidates((data.items || []).map((it, i) => ({ ...it, _id: 'c' + i })))
      setText(pages.map((p) => p.text).join('\n\n'))
    } catch (err) {
      setError('Could not read PDF: ' + String(err))
    }
    setLoading(false)
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setError(''); setCandidates([])
    try {
      // read the image as base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/.netlify/functions/extract', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image: { media_type: file.type, data: base64 } }),
      })
      const data = await res.json()
      if (data.error) setError("Couldn't read this image. Try a clearer photo of a discharge document.")
      else if ((data.items || []).length === 0) setError("No medications, appointments, or tasks found in this photo.")
      else setCandidates((data.items || []).map((it, i) => ({ ...it, _id: 'c' + i })))
    } catch (err) {
      setError('Could not read image: ' + String(err))
    }
    setLoading(false)
  }

  async function confirmItem(item) {
    const { error } = await supabase.from('plan_items').insert({
      circle_id: circleId, confirmed_by: session.user.id,
      category: item.category, payload: item.payload,
      confirmed_at: new Date().toISOString(),
    })
    if (error) { setError('Could not save: ' + error.message); return }
    setCandidates((c) => c.filter((x) => x._id !== item._id))
    loadPlan()
  }

  async function saveReminder() {
    if (!reminderWhen) { setError('Please pick a date and time.'); return }
    const remind_at = new Date(reminderWhen)
    if (isNaN(remind_at)) { setError('That date/time did not work.'); return }
    const { error } = await supabase.from('reminders').insert({
      plan_item_id: reminderFor.id, circle_id: circleId,
      remind_at: remind_at.toISOString(), channel: 'in_app',
    })
    if (error) { setError('Could not save reminder: ' + error.message); return }
    setReminderFor(null); setReminderWhen(''); loadReminders()
  }

  const rejectItem = (item) => setCandidates((c) => c.filter((x) => x._id !== item._id))
  const startEdit = (item) => { setEditingId(item._id); setEditText(item.payload?.plain_language || '') }
  const saveEdit = (item) => {
    setCandidates((c) => c.map((x) => x._id === item._id
      ? { ...x, payload: { ...x.payload, plain_language: editText } } : x))
    setEditingId(null)
  }
  const stateOf = (i) => i.confidence === 'low' ? 'attend' : i.category === 'warning' ? 'flag' : 'verify'
  const userName = session.user?.user_metadata?.first_name

  return (
    <div style={{ minHeight: '100vh', background: v('paper'), color: v('ink') }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: v('font-display'), fontSize: 40, fontWeight: 600, margin: 0, letterSpacing: '-0.02em' }}>Homecoming</h1>
            <p style={{ color: v('cite'), marginTop: 2, fontSize: 15 }}>
              {userName ? `Hi ${userName} — ` : ''}Nothing enters the care plan until you confirm it.
            </p>
          </div>
          <button onClick={() => supabase.auth.signOut()} style={ghostBtn}>Log out</button>
        </div>

        <div style={{ marginTop: 24 }}>
          <label style={{ fontSize: 13, color: v('cite'), fontWeight: 500 }}>Paste the discharge notes</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
            style={{ width: '100%', marginTop: 6, fontSize: 14, padding: 14, boxSizing: 'border-box',
                     border: `1px solid ${v('border')}`, borderRadius: 10, background: v('card'),
                     fontFamily: v('font-body'), lineHeight: 1.6, resize: 'vertical' }} />
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={handleExtract} disabled={loading}
              style={{ padding: '11px 22px', fontSize: 15, cursor: 'pointer', background: v('ink'), color: '#fff',
                       border: 'none', borderRadius: 10, fontFamily: v('font-body'), fontWeight: 500 }}>
              {loading ? 'Reading the document…' : 'Extract care plan'}
            </button>
            <label style={{ padding: '11px 22px', fontSize: 15, cursor: 'pointer', background: v('card'),
                     color: v('ink'), border: `1px solid ${v('border')}`, borderRadius: 10,
                     fontFamily: v('font-body'), fontWeight: 500 }}>
              Upload a PDF
              <input type="file" accept="application/pdf" onChange={handlePdfUpload} style={{ display: 'none' }} />
            </label>
            <label style={{ padding: '11px 22px', fontSize: 15, cursor: 'pointer', background: v('card'),
                     color: v('ink'), border: `1px solid ${v('border')}`, borderRadius: 10,
                     fontFamily: v('font-body'), fontWeight: 500 }}>
              Upload a photo
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            </label>
          </div>
          {error && <p style={{ color: v('flag'), fontSize: 14 }}>{error}</p>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 32 }}>
          <section>
            <h2 style={colHead}>To review · {candidates.length}</h2>
            {candidates.map((item) => {
              const s = stateOf(item)
              return (
                <article key={item._id} style={card(s)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={pill(s)}>{item.category}{item.confidence === 'low' ? ' · needs review' : ''}</span>
                    <span style={{ fontFamily: v('font-mono'), fontSize: 11, color: v('cite') }}>p.{item.source_page}</span>
                  </div>
                  <h3 style={cardTitle}>{titleOf(item)}</h3>
                  {editingId === item._id ? (
                    <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3}
                      style={{ width: '100%', marginTop: 4, fontSize: 14, fontFamily: v('font-body'),
                               padding: 8, borderRadius: 8, border: `1px solid ${v('border')}`, boxSizing: 'border-box' }} />
                  ) : (
                    <p style={cardBody}>{item.payload?.plain_language}</p>
                  )}
                  {item.review_note && editingId !== item._id && (
                    <p style={{ fontSize: 12.5, color: v('attend'), marginTop: 8, lineHeight: 1.5 }}>⚠ {item.review_note}</p>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    {editingId === item._id ? (
                      <button onClick={() => saveEdit(item)} style={actBtn('verify')}>Save changes</button>
                    ) : (
                      <>
                        <button onClick={() => confirmItem(item)} style={actBtn('verify')}>Confirm</button>
                        <button onClick={() => startEdit(item)} style={actBtn('cite')}>Edit</button>
                        <button onClick={() => rejectItem(item)} style={actBtn('flag')}>Reject</button>
                      </>
                    )}
                  </div>
                </article>
              )
            })}
            {candidates.length === 0 && <p style={emptyMsg}>Paste a discharge document above and extract it to begin.</p>}
          </section>

          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ ...colHead, marginBottom: 0 }}>Confirmed care plan · {plan.length}</h2>
              {plan.length > 0 && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowFridge(true)} style={actBtn('ink')}>Print fridge sheet</button>
                  <button onClick={() => downloadFhir(plan)} style={actBtn('cite')}>Export FHIR</button>
                </div>
              )}
            </div>
            {plan.map((item) => (
              <article key={item.id} className="stamp" style={card('verify')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={pill('verify')}>{item.category}</span>
                  <span style={{ fontFamily: v('font-mono'), fontSize: 11, color: v('verify'), fontWeight: 500 }}>✓ confirmed</span>
                </div>
                <h3 style={cardTitle}>{titleOf(item)}</h3>
                <p style={cardBody}>{item.payload?.plain_language}</p>
                {reminderFor?.id === item.id ? (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="datetime-local" value={reminderWhen}
                      onChange={(e) => setReminderWhen(e.target.value)}
                      style={{ fontSize: 13, padding: 6, borderRadius: 6, border: `1px solid ${v('border')}`,
                               fontFamily: v('font-body') }} />
                    <button onClick={saveReminder} style={{ ...actBtn('verify'), fontSize: 12 }}>Save</button>
                    <button onClick={() => { setReminderFor(null); setReminderWhen('') }}
                      style={{ ...actBtn('cite'), fontSize: 12 }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setReminderFor(item)} style={{ ...actBtn('cite'), marginTop: 8, fontSize: 12 }}>
                    + Remind me
                  </button>
                )}
                {reminders.filter((r) => r.plan_item_id === item.id).map((r) => (
                  <div key={r.id} style={{ fontSize: 12, color: v('attend'), marginTop: 4, fontFamily: v('font-mono') }}>
                    ⏰ {new Date(r.remind_at).toLocaleString()}
                  </div>
                ))}
              </article>
            ))}
            {plan.length === 0 && <p style={emptyMsg}>Confirmed items will appear here, ready for the fridge.</p>}
          </section>
        </div>
      </div>

      {showFridge && <FridgeSheet plan={plan} onClose={() => setShowFridge(false)} />}
    </div>
  )
}

function Center({ children }) {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-body)', color: 'var(--cite)' }}>{children}</div>
}

const colHead = { fontFamily: v('font-body'), fontSize: 13, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: v('cite'), marginBottom: 12 }
const card = (s) => ({ background: v('card'), border: `1px solid ${v('border')}`,
  borderLeft: `4px solid ${v(s)}`, borderRadius: 12, padding: 16, marginBottom: 12 })
const cardTitle = { fontFamily: v('font-display'), fontSize: 19, fontWeight: 600, margin: '6px 0 2px', lineHeight: 1.25 }
const cardBody = { fontSize: 14, color: '#3F4A44', margin: '2px 0 0', lineHeight: 1.55 }
const pill = (s) => ({ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
  color: v(s), background: v(`${s}-bg`), padding: '3px 10px', borderRadius: 20 })
const actBtn = (s) => ({ padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: v(s), background: v('card'),
  border: `1px solid ${v(s)}`, borderRadius: 8, fontFamily: v('font-body'), fontWeight: 500 })
const ghostBtn = { padding: '7px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--cite)',
  background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'var(--font-body)' }
const emptyMsg = { color: v('cite'), fontSize: 14, fontStyle: 'italic', lineHeight: 1.5 }