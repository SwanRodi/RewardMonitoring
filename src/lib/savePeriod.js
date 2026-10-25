// Simpan hasil parse ke Supabase (dipakai tombol Upload Excel; butuh login admin).
export async function savePeriod(sb, { period, rows }, fileName) {
  const { data: p, error } = await sb.from('periods')
    .upsert({ ...period, file_name: fileName, uploaded_at: new Date().toISOString() }, { onConflict: 'key' })
    .select().single()
  if (error) throw error
  const del = await sb.from('reward_customers').delete().eq('period_id', p.id)
  if (del.error) throw del.error
  for (let i = 0; i < rows.length; i += 200) {
    const { error: e } = await sb.from('reward_customers').insert(rows.slice(i, i + 200).map((r) => ({ ...r, period_id: p.id })))
    if (e) throw e
  }
  return p
}
