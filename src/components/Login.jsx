import { useState } from 'react'
import { supabase, emailOf } from '../lib/supabase'

export default function Login() {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email: emailOf(u), password: p })
    if (error) setErr('ID atau password salah'); setBusy(false)
  }
  return (
    <div className="center">
      <form className="card login" onSubmit={submit}>
        <div className="logo">PR</div>
        <h1>Pulogadung Reward</h1>
        <p className="muted">Monitoring Center</p>
        <input placeholder="ID pengguna" value={u} onChange={(e) => setU(e.target.value)} autoFocus />
        <input placeholder="Password" type="password" value={p} onChange={(e) => setP(e.target.value)} />
        {err && <p className="err">{err}</p>}
        <button className="btn primary" disabled={busy || !u || !p}>{busy ? 'Masuk…' : 'Masuk'}</button>
      </form>
    </div>
  )
}
