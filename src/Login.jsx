import { useState } from 'react'
import { supabase } from './supabaseClient'

const C = { ink: '#1F2430', paper: '#FAF8F3', verify: '#3E6B4F', border: '#E3DED3', flag: '#9B3B2E' }

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

 async function submit() {
    setBusy(true); setError('')
    const { error } = isRegister
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.paper, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12,
                    padding: 32, width: 360 }}>
        <h1 style={{ fontSize: 24, color: C.ink, margin: 0 }}>Homecoming</h1>
        <p style={{ color: '#666', fontSize: 14 }}>{isRegister ? 'Create your account' : 'Welcome back'}</p>

        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          style={inp} />
        <input placeholder="Password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)} style={inp} />

        {error && <p style={{ color: C.flag, fontSize: 13 }}>{error}</p>}

        <button onClick={submit} disabled={busy}
          style={{ width: '100%', padding: 12, background: C.ink, color: '#fff', border: 'none',
                   borderRadius: 8, fontSize: 15, cursor: 'pointer', marginTop: 8 }}>
          {busy ? 'Please wait…' : isRegister ? 'Register' : 'Log in'}
        </button>

        <p style={{ fontSize: 13, color: '#666', marginTop: 14, textAlign: 'center' }}>
          {isRegister ? 'Already have an account?' : 'New here?'}{' '}
          <span onClick={() => { setIsRegister(!isRegister); setError('') }}
            style={{ color: C.verify, cursor: 'pointer', fontWeight: 600 }}>
            {isRegister ? 'Log in' : 'Register'}
          </span>
        </p>
      </div>
    </div>
  )
}

const inp = { width: '100%', padding: 10, marginTop: 10, fontSize: 14, boxSizing: 'border-box',
              border: '1px solid #E3DED3', borderRadius: 8 }