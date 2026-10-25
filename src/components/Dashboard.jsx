import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { rp, tgl } from '../lib/format'
import UploadExcel from './UploadExcel'
import AddFrontliner from './AddFrontliner'

const PAGE = 50
async function fetchAll(periodId) {
  let all = [], from = 0
  for (;;) {
    const { data, error } = await supabase.from('reward_customers').select('*').eq('period_id', periodId).order('row_no').range(from, from + 999)
    if (error) throw error
    all = all.concat(data); if (data.length < 1000) break; from += 1000
  }
  return all
}

export default function Dashboard({ profile, token }) {
  const admin = profile.role === 'admin'
  const [periods, setPeriods] = useState([]); const [pid, setPid] = useState(null)
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [err, setErr] = useState('')
  const [q, setQ] = useState(''); const [flt, setFlt] = useState('all'); const [page, setPage] = useState(0); const [upload, setUpload] = useState(false)

  async function loadPeriods(selectKey) {
    const { data, error } = await supabase.from('periods').select('*').order('key', { ascending: false })
    if (error) return setErr(error.message)
    setPeriods(data); setLoading(false)
    setPid((data.find((p) => p.key === selectKey) || data[0])?.id ?? null)
  }
  useEffect(() => { loadPeriods() }, [])
  useEffect(() => {
    if (!pid) return setRows([])
    setLoading(true); setPage(0)
    fetchAll(pid).then(setRows).catch((e) => setErr(e.message)).finally(() => setLoading(false))
  }, [pid])

  const period = periods.find((p) => p.id === pid)
  const stat = useMemo(() => {
    const paid = rows.filter((r) => r.is_paid)
    return { total: rows.length, paid: paid.length, unpaid: rows.length - paid.length,
      paidRp: paid.reduce((a, r) => a + r.paid_amount, 0), unpaidRp: rows.reduce((a, r) => a + r.unpaid_amount, 0) }
  }, [rows])
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((r) => (flt === 'all' || (flt === 'paid') === r.is_paid) &&
      (!s || [r.customer_name, r.customer_code, r.sales_name, r.invoice_no, r.order_number, r.address].some((x) => (x || '').toLowerCase().includes(s))))
  }, [rows, q, flt])
  const pages = Math.max(1, Math.ceil(shown.length / PAGE))

  return (
    <>
      <header className="top"><div className="wrap row between">
        <div className="row"><div className="logo sm">PR</div><div><b>Pulogadung Reward</b><div className="muted small">Monitoring Center</div></div></div>
        <div className="row"><span className="dot" /> {profile.username} <span className="pill blue">{profile.role}</span>
          <button className="btn" onClick={() => supabase.auth.signOut()}>Keluar</button></div>
      </div></header>

      <main className="wrap">
        <div className="row between end">
          <div>
            <span className="eyebrow">{admin ? 'ADMIN CONTROL CENTER' : 'FRONTLINER'}</span>
            <h1 className="big">{admin ? 'Ringkasan operasional' : 'Cek status reward'}</h1>
            <p className="muted">Sumber data: sheet CROSSCHECK REWARD.</p>
          </div>
          <div className="row">
            {periods.length > 0 && <select value={pid ?? ''} onChange={(e) => setPid(Number(e.target.value))}>
              {periods.map((p) => <option key={p.id} value={p.id}>{p.display_label}</option>)}</select>}
            {admin && <button className="btn primary lg" onClick={() => setUpload(true)}>⬆ Upload Excel</button>}
          </div>
        </div>
        {err && <p className="err">{err}</p>}

        <div className="kpis">
          <div className="card kpi blue"><span>Total pelanggan</span><b>{stat.total}</b><small>{period ? `Reward ${rp(period.oracle_total)}` : 'Belum ada data'}</small></div>
          <div className="card kpi green"><span>Sudah terbayarkan</span><b>{stat.paid}</b><small>{rp(stat.paidRp)}</small></div>
          <div className="card kpi orange"><span>Belum terbayarkan</span><b>{stat.unpaid}</b><small>{rp(stat.unpaidRp)}</small></div>
          <div className="card kpi gray"><span>Periode display</span><b>{period?.display_label || '-'}</b><small>Dibayar {period?.payment_label || '-'}</small></div>
        </div>

        <div className={admin ? 'grid' : ''}>
          <section className="card">
            <div className="row between">
              <div><span className="eyebrow">MASTER DATA</span><h2>Data reward pelanggan</h2></div>
              <div className="row">
                <select value={flt} onChange={(e) => { setFlt(e.target.value); setPage(0) }}>
                  <option value="all">Semua status</option><option value="paid">Sudah terbayarkan</option><option value="unpaid">Belum terbayarkan</option></select>
                <input className="search" placeholder="Cari nama, kode, faktur, order…" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} />
              </div>
            </div>
            <div className="scroll"><table>
              <thead><tr><th>Pelanggan</th><th>Tipe</th><th>Sales</th><th className="r">Reward</th><th>Status</th><th>Tgl terbayar</th><th>No. faktur</th><th>No. order</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan="8" className="muted">Memuat…</td></tr>}
                {!loading && shown.length === 0 && <tr><td colSpan="8" className="muted">{rows.length ? 'Tidak ada hasil.' : 'Belum ada data. Upload Excel dulu.'}</td></tr>}
                {shown.slice(page * PAGE, (page + 1) * PAGE).map((r) => (
                  <tr key={r.id}>
                    <td><b>{r.customer_name}</b><div className="muted small mono">{r.customer_code}</div></td>
                    <td>{r.display_type}</td>
                    <td>{r.sales_name}<div className="muted small">{r.rayon_md}</div></td>
                    <td className="r">{rp(r.reward_amount)}</td>
                    <td><span className={`pill ${r.is_paid ? 'green' : 'orange'}`}>{r.is_paid ? 'Sudah terbayarkan' : 'Belum terbayarkan'}</span></td>
                    <td>{r.is_paid ? tgl(r.invoice_date) : '-'}</td>
                    <td className="mono">{r.invoice_no || '-'}</td>
                    <td className="mono">{r.order_number || '-'}</td>
                  </tr>))}
              </tbody></table></div>
            <div className="row between small muted">
              <span>{shown.length} data</span>
              <span className="row"><button className="btn" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button> {page + 1} / {pages}
                <button className="btn" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>›</button></span>
            </div>
          </section>
          {admin && <AddFrontliner token={token} />}
        </div>
      </main>
      {upload && <UploadExcel onClose={() => setUpload(false)} onDone={(k) => { setUpload(false); loadPeriods(k) }} />}
    </>
  )
}
