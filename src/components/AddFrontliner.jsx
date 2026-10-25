import { useState } from 'react'

export default function AddFrontliner({ token }) {
  const [id, setId] = useState(''); const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false)
  async function add(e) {
    e.preventDefault(); setBusy(true); setMsg(null)
    const r = await fetch('/api/create-frontliner', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ username: id }),
    })
    const j = await r.json().catch(() => ({}))
    setMsg(r.ok ? { ok: true, t: `ID "${j.username}" dibuat. Password awal: password` } : { ok: false, t: j.error || 'Gagal membuat ID' })
    if (r.ok) setId(''); setBusy(false)
  }
  return (
    <form className="card side" onSubmit={add}>
      <span className="eyebrow">AKSES PENGGUNA</span>
      <h2>Tambah frontliner</h2>
      <p className="muted">Buat ID baru untuk petugas lapangan. Password awal otomatis <b>password</b>.</p>
      <div className="row"><input placeholder="ID frontliner" value={id} onChange={(e) => setId(e.target.value)} /><button className="btn primary" disabled={busy || id.length < 3}>＋</button></div>
      {msg && <p className={msg.ok ? 'ok' : 'err'}>{msg.t}</p>}
      <p className="muted small">Frontliner hanya dapat mencari dan melihat status pembayaran.</p>
    </form>
  )
}
