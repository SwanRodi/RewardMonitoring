import { useEffect, useState } from 'react'
import { supabase, envMissing } from './lib/supabase'
import Login from './components/Login'
import Dashboard from './components/Dashboard'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setErr('')
    if (!session) return setProfile(null)
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data, error }) => error ? setErr('Akun belum terdaftar di tabel profiles.') : setProfile(data))
  }, [session])

  if (envMissing) return (
    <div className="center"><div className="card" style={{ maxWidth: 480, textAlign: 'left' }}>
      <h2>Konfigurasi belum lengkap</h2>
      <p>Variabel <b>VITE_SUPABASE_URL</b> dan <b>VITE_SUPABASE_ANON_KEY</b> belum terbaca.</p>
      <p className="muted">Isi di Vercel → Settings → Environment Variables, lalu <b>Redeploy</b>.</p>
    </div></div>
  )
  if (session === undefined) return <div className="center">Memuat…</div>
  if (!session) return <Login />
  if (err) return <div className="center"><p>{err}</p><button className="btn" onClick={() => supabase.auth.signOut()}>Keluar</button></div>
  if (!profile) return <div className="center">Memuat profil…</div>
  return <Dashboard profile={profile} token={session.access_token} />
}
