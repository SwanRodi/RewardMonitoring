import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
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

  if (session === undefined) return <div className="center">Memuat…</div>
  if (!session) return <Login />
  if (err) return <div className="center"><p>{err}</p><button className="btn" onClick={() => supabase.auth.signOut()}>Keluar</button></div>
  if (!profile) return <div className="center">Memuat profil…</div>
  return <Dashboard profile={profile} token={session.access_token} />
}
