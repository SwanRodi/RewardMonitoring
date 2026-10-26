// Parser KHUSUS sheet "CROSSCHECK REWARD".
// Bug lama: aplikasi membaca sheet lain (PDF / KERTAS KERJA / master) sehingga baris footer
// ("Dibuat oleh", "Diperiksa oleh", "Tgl :") ikut tampil sebagai pelanggan.
// Di sini sheet dicari berdasarkan NAMA PERSIS, dan hanya baris dengan kode pelanggan valid yang diambil.
import * as XLSX from 'xlsx'

const SHEET_NAME = 'CROSSCHECK REWARD'
const MONTHS = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MEI: 5, MAY: 5, JUN: 6, JUL: 7, AGU: 8, AUG: 8, SEP: 9, OKT: 10, OCT: 10, NOV: 11, DES: 12, DEC: 12 }
const MONTH_ID = ['', 'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER']

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toUpperCase()
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : 0 }
const text = (v) => { const s = String(v ?? '').trim(); return s === '' ? null : s }
const idText = (v) => {                       // nomor order / faktur: "0" atau kosong = belum ada
  if (typeof v === 'number') return v === 0 ? null : String(Math.round(v))
  const s = String(v ?? '').trim()
  return s === '' || s === '0' ? null : s
}
function monthYear(t) {                        // toleran typo, mis. "JANAURI 2026"
  const s = norm(t).replace(/^[:,\s]+/, '')
  const m = MONTHS[s.slice(0, 3)]; const y = (s.match(/(20\d\d)/) || [])[1]
  return m && y ? { m, y: Number(y) } : null
}
function toIso(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'number' && v > 20000) return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10)
  const m = norm(v).match(/^(\d{1,2})-([A-Z]{3})-(\d{4})$/)     // 18-FEB-2026
  return m && MONTHS[m[2]] ? `${m[3]}-${String(MONTHS[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
}

export function parseCrosscheck(data) {
  const wb = XLSX.read(data, { type: 'array' })
  const name = wb.SheetNames.find((n) => norm(n) === SHEET_NAME)
  if (!name) throw new Error(`Sheet "${SHEET_NAME}" tidak ditemukan. Sheet di file: ${wb.SheetNames.join(', ')}`)
  const grid = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null })

  const hIdx = grid.findIndex((r) => r.some((c) => norm(c) === 'PAID ?'))
  if (hIdx < 0) throw new Error('Header tabel (kolom "PAID ?") tidak ditemukan di sheet CROSSCHECK REWARD')
  const head = grid[hIdx].map(norm)
  const col = (...labels) => head.findIndex((h) => labels.some((l) => h === l || h.startsWith(l)))
  const C = {
    code: col('NOMOR PELANGGAN'), name: col('NAMA PELANGGAN'), address: col('ALAMAT PELANGGAN'),
    salesCode: col('KODE SALES'), salesName: col('NAMA SALES'), mdCode: col('KODE MD'), mdName: col('NAMA MD'),
    rayon: col('RAYON MD'), type: col('TYPE DISPLAY'), reward: col('REWARD DISPLAY'), paid: col('PAID ?'),
    paidAmt: col('JUMLAH PAID'), unpaidAmt: col('+/- PAID'), order: col('ORDER NUMBER'),
    date: col('TGL FAKTUR'), inv: col('NO FAKTUR'),
  }
  for (const [k, v] of Object.entries(C)) if (v < 0) throw new Error(`Kolom "${k}" tidak ditemukan di header`)

  // ---- ringkasan di atas tabel ----
  const sum = { oracle: [0, 0], paid: [0, 0], unpaid: [0, 0] }
  const meta = {}
  for (const r of grid.slice(0, hIdx)) {
    r.forEach((c, i) => {
      const t = norm(c)
      const after = () => r.slice(i + 1).find((x) => x !== null && String(x).trim() !== '')
      if (t.startsWith('DATA ORACEL')) sum.oracle = [num(r[i + 1]), num(r[i + 2])]
      else if (t.startsWith('REWARD TERBAYARKAN')) sum.paid = [num(r[i + 1]), num(r[i + 2])]
      else if (t.startsWith('REWARD BELUM TERBAYARKAN')) sum.unpaid = [num(r[i + 1]), num(r[i + 2])]
      else if (t.startsWith('PERIODE DISPLAY')) meta.display = after()
      else if (t.startsWith('PERIODE PEMBAYARAN')) meta.payment = after()
      else if (t.startsWith('PERIODE CUTT OFF')) meta.cutoff = after()
      else if (t.startsWith('CABANG')) meta.branch = String(c).split('=')[1]?.trim()
    })
  }
  const dm = monthYear(meta.display); const pm = monthYear(meta.payment)
  if (!dm) throw new Error('"PERIODE DISPLAY" tidak terbaca di sheet CROSSCHECK REWARD')

  // ---- baris data: hanya yang punya kode pelanggan valid ----
  const rows = []
  for (const r of grid.slice(hIdx + 1)) {
    const code = text(r[C.code])
    if (!code || !/^\d{4}-\d{3,}$/.test(code)) continue
    const isPaid = norm(r[C.paid]) === 'Y'
    rows.push({
      row_no: rows.length + 1, customer_code: code, customer_name: text(r[C.name]), address: text(r[C.address]),
      sales_code: text(r[C.salesCode]), sales_name: text(r[C.salesName]), md_code: text(r[C.mdCode]), md_name: text(r[C.mdName]),
      rayon_md: text(r[C.rayon]), display_type: text(r[C.type]), reward_amount: num(r[C.reward]), is_paid: isPaid,
      paid_amount: num(r[C.paidAmt]), unpaid_amount: num(r[C.unpaidAmt]),
      order_number: isPaid ? idText(r[C.order]) : null, invoice_date: isPaid ? toIso(r[C.date]) : null, invoice_no: isPaid ? idText(r[C.inv]) : null,
    })
  }

  const period = {
    key: `${dm.y}-${String(dm.m).padStart(2, '0')}`, display_label: `${MONTH_ID[dm.m]} ${dm.y}`,
    payment_label: pm ? `${MONTH_ID[pm.m]} ${pm.y}` : null, cutoff_label: text(String(meta.cutoff ?? '').replace(/^[:\s]+/, '')),
    branch: meta.branch || null, oracle_count: sum.oracle[0], oracle_total: sum.oracle[1], paid_count: sum.paid[0],
    paid_total: sum.paid[1], unpaid_count: sum.unpaid[0], unpaid_total: sum.unpaid[1],
  }
  const paidN = rows.filter((r) => r.is_paid).length
  const warnings = []
  if (rows.length !== sum.oracle[0]) warnings.push(`Jumlah baris (${rows.length}) ≠ DATA ORACEL di header (${sum.oracle[0]})`)
  if (paidN !== sum.paid[0]) warnings.push(`Terbayar (${paidN}) ≠ header (${sum.paid[0]})`)
  return { period, rows, warnings }
}
