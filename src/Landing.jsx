const v = (name) => `var(--${name})`

export default function Landing({ onGetStarted }) {
  return (
    <div style={{ minHeight: '100vh', background: v('paper'), color: v('ink') }}>
      {/* top bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        maxWidth: 1040, margin: '0 auto', padding: '20px 32px' }}>
        <span style={{ fontFamily: v('font-display'), fontSize: 24, fontWeight: 600 }}>Homecoming</span>
        <button onClick={onGetStarted} style={ghost}>Log in</button>
      </header>

      {/* hero */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '48px 32px 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: v('font-display'), fontSize: 48, fontWeight: 600, lineHeight: 1.1,
          letterSpacing: '-0.02em', margin: 0 }}>
          Bring them home without the paperwork panic.
        </h1>
        <p style={{ fontSize: 18, color: '#4A554E', lineHeight: 1.6, marginTop: 20 }}>
          When someone leaves the hospital, the family gets a thick stack of discharge papers —
          new medicines, appointments, warning signs, all in medical language. Homecoming turns
          that stack into a clear, checked care plan you can actually follow.
        </p>
        <button onClick={onGetStarted} style={{ ...primary, marginTop: 28 }}>Get started — it's free</button>
        <p style={{ fontSize: 13, color: v('cite'), marginTop: 14 }}>
          Nothing enters your care plan until you confirm it. Not medical advice.
        </p>
      </section>

      {/* how it works */}
      <section style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 32px 64px' }}>
        <h2 style={{ fontFamily: v('font-display'), fontSize: 28, textAlign: 'center', marginBottom: 32 }}>
          How it works
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          <Step n="1" title="Upload the paperwork"
            body="Paste the discharge notes or upload the PDF. Homecoming reads every page." />
          <Step n="2" title="Review each item"
            body="It pulls out medicines, appointments, tasks, and warning signs — each one showing exactly which page it came from. Anything unclear is flagged for you to check." />
          <Step n="3" title="Confirm your plan"
            body="You approve each item. Only then does it become your care plan — with reminders, a printable fridge sheet, and export for your care team." />
        </div>
      </section>

      {/* trust strip */}
      <section style={{ background: v('verify-bg'), padding: '40px 32px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontFamily: v('font-display'), fontSize: 22, color: v('verify'), margin: 0, lineHeight: 1.4 }}>
            "1 in 4 U.S. adults care for a family member. Almost none of them were handed a manual."
          </p>
          <p style={{ fontSize: 14, color: '#4A554E', marginTop: 12 }}>
            Homecoming is the manual — built for the person doing the caring.
          </p>
        </div>
      </section>

      <footer style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 32px', textAlign: 'center',
        color: v('cite'), fontSize: 13 }}>
        Homecoming organizes discharge instructions. It is not medical advice. When in doubt, call your care team.
      </footer>
    </div>
  )
}

function Step({ n, title, body }) {
  return (
    <div style={{ background: v('card'), border: `1px solid ${v('border')}`, borderRadius: 12, padding: 24 }}>
      <div style={{ fontFamily: v('font-mono'), fontSize: 13, color: v('verify'), fontWeight: 500 }}>Step {n}</div>
      <h3 style={{ fontFamily: v('font-display'), fontSize: 20, margin: '8px 0 6px' }}>{title}</h3>
      <p style={{ fontSize: 14, color: '#4A554E', lineHeight: 1.55, margin: 0 }}>{body}</p>
    </div>
  )
}

const primary = { padding: '13px 28px', fontSize: 16, cursor: 'pointer', background: v('ink'),
  color: '#fff', border: 'none', borderRadius: 10, fontFamily: v('font-body'), fontWeight: 500 }
const ghost = { padding: '8px 16px', fontSize: 14, cursor: 'pointer', color: v('ink'),
  background: 'transparent', border: `1px solid ${v('border')}`, borderRadius: 8, fontFamily: v('font-body') }