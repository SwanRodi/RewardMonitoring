import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { parseCrosscheck } from '../lib/parseCrosscheck'
import { savePeriod } from '../lib/savePeriod'
import { rp } from '../lib/format'

export default function UploadExcel({ onClose, onDone }) {
  const [res, setRes] = useState(null); const [file, setFile] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)

  async function pick(e) {
    const f = e.target.files[0]; if (!f) return
    setErr(''); setRes(null); setFile(f)
    try { setRes(parseCrosscheck(new Uint8Array(await f.arrayBuffer()))) } catch (x) { setErr(x.message) }
  }
  async function save() {
    setBusy(true); setErr('')
    try { await savePeriod(supabase, res, file.name); onDone(res.period.key) } catch (x) { setErr(x.message); setBusy(false) }
  }
  const paid = res?.rows.filter((r) => r.is_paid).length
  return (
    <div className="modal" onClick={onClose}>
      <div className="card modal-body" onClick={(e) => e.stopPropagation()}>
        <h2>Upload Excel</h2>
        <p className="muted">Hanya sheet <b>CROSSCHECK REWARD</b> yang dibaca. Sheet lain diabaikan.</p>
        <input type="file" accept=".xlsx,.xlsm" onChange={pick} />
        {err && <p className="err">{err}</p>}
        {res && (
          <div className="preview">
            <p><b>Periode display:</b> {res.period.display_label} &nbsp; <b>Pembayaran:</b> {res.period.payment_label || '-'}</p>
            <p>{res.rows.length} pelanggan · {paid} terbayar · {res.rows.length - paid} belum · reward {rp(res.rows.reduce((a, r) => a + r.reward_amount, 0))}</p>
            {res.warnings.map((w) => <p key={w} className="err">⚠ {w}</p>)}
            <p className="muted">Jika periode ini sudah ada, datanya akan diganti.</p>
          </div>
        )}
        <div className="row end">
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn primary" disabled={!res || busy} onClick={save}>{busy ? 'Menyimpan…' : 'Simpan ke database'}</button>
        </div>
      </div>
    </div>
  )
}
