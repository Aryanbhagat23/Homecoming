import { useState } from 'react'
import { supabase } from './supabaseClient'

const v = (name) => `var(--${name})`

export default function Login({ onBack }) {
  const [isRegister, setIsRegister] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setError('')
    if (isRegister) {
      if (!firstName.trim() || !lastName.trim()) { setError('Please enter your first and last name.'); return }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
      if (password !== confirm) { setError('Passwords do not match.'); return }
    }
    setBusy(true)
    const { error } = isRegister
      ? await supabase.auth.signUp({
          email, password,
          options: { data: { first_name: firstName.trim(), last_name: lastName.trim() } },
        })
      : await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: v('paper'), display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontFamily: v('font-body'), padding: 20 }}>
      <div style={{ background: v('card'), border: `1px solid ${v('border')}`, borderRadius: 14,
                    padding: 32, width: 380 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: v('cite'),
            cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 12, fontFamily: v('font-body') }}>
            ← Back
          </button>
        )}
        <h1 style={{ fontFamily: v('font-display'), fontSize: 26, color: v('ink'), margin: 0 }}>
          {isRegister ? 'Create your account' : 'Welcome back'}
        </h1>
        <p style={{ color: v('cite'), fontSize: 14, marginTop: 4 }}>
          {isRegister ? 'Start organizing care in minutes.' : 'Log in to your care plan.'}
        </p>

        {isRegister && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inp} />
            <input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} style={inp} />
          </div>
        )}
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
        <input placeholder="Password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)} style={inp} />
        {isRegister && (
          <input placeholder="Confirm password" type="password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} style={inp} />
        )}

        {error && <p style={{ color: v('flag'), fontSize: 13, marginTop: 10 }}>{error}</p>}

        <button onClick={submit} disabled={busy}
          style={{ width: '100%', padding: 13, background: v('ink'), color: '#fff', border: 'none',
                   borderRadius: 10, fontSize: 15, cursor: 'pointer', marginTop: 14, fontFamily: v('font-body'),
                   fontWeight: 500 }}>
          {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
        </button>

        <p style={{ fontSize: 13, color: v('cite'), marginTop: 16, textAlign: 'center' }}>
          {isRegister ? 'Already have an account?' : 'New to Homecoming?'}{' '}
          <span onClick={() => { setIsRegister(!isRegister); setError('') }}
            style={{ color: v('verify'), cursor: 'pointer', fontWeight: 600 }}>
            {isRegister ? 'Log in' : 'Create one'}
          </span>
        </p>
      </div>
    </div>
  )
}

const inp = { width: '100%', padding: 11, marginTop: 10, fontSize: 14, boxSizing: 'border-box',
              border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'var(--font-body)' }