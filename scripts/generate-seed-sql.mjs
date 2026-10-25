// Membuat supabase/seed.sql dari file Excel (HANYA sheet CROSSCHECK REWARD).
// Pakai: node scripts/generate-seed-sql.mjs file1.xlsx file2.xlsx > supabase/seed.sql
import fs from 'node:fs'
import path from 'node:path'
import { parseCrosscheck } from '../src/lib/parseCrosscheck.js'

const q = (v) => v === null || v === undefined ? 'null'
  : typeof v === 'number' || typeof v === 'boolean' ? String(v)
  : `'${String(v).replace(/'/g, "''")}'`

const out = ['-- Seed otomatis dari sheet CROSSCHECK REWARD', 'begin;']
for (const f of process.argv.slice(2)) {
  const { period, rows, warnings } = parseCrosscheck(fs.readFileSync(f))
  period.file_name = path.basename(f)
  console.error(`${path.basename(f)} -> ${period.display_label}: ${rows.length} baris`, warnings.length ? warnings : 'OK')
  const pc = Object.keys(period)
  out.push(`insert into public.periods (${pc.join(',')}) values (${pc.map((c) => q(period[c])).join(',')})`,
    `on conflict (key) do update set ${pc.filter((c) => c !== 'key').map((c) => `${c}=excluded.${c}`).join(',')};`)
  out.push(`delete from public.reward_customers where period_id=(select id from public.periods where key=${q(period.key)});`)
  const rc = Object.keys(rows[0])
  for (let i = 0; i < rows.length; i += 100) {
    const vals = rows.slice(i, i + 100).map((r) =>
      `((select id from public.periods where key=${q(period.key)}),${rc.map((c) => q(r[c])).join(',')})`)
    out.push(`insert into public.reward_customers (period_id,${rc.join(',')}) values\n${vals.join(',\n')};`)
  }
}
out.push('commit;')
console.log(out.join('\n'))
