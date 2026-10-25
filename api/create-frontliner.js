// Vercel Serverless Function – hanya admin yang boleh membuat ID frontliner.
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(500).json({ error: 'Env Supabase server belum diatur di Vercel' })
  const admin = createClient(url, key, { auth: { persistSession: false } })

  const token = (req.headers.authorization || '').replace('Bearer ', '')
  const { data: u } = await admin.auth.getUser(token)
  if (!u?.user) return res.status(401).json({ error: 'Belum login' })
  const { data: me } = await admin.from('profiles').select('role').eq('id', u.user.id).single()
  if (me?.role !== 'admin') return res.status(403).json({ error: 'Hanya admin' })

  const username = String(req.body?.username || '').trim().toLowerCase()
  if (!/^[a-z0-9._-]{3,30}$/.test(username))
    return res.status(400).json({ error: 'ID 3-30 karakter: huruf kecil, angka, titik, minus, underscore' })

  const { data: c, error } = await admin.auth.admin.createUser({
    email: `${username}@reward.example.com`,
    password: 'password',
    email_confirm: true,
  })
  if (error) return res.status(400).json({ error: error.message })
  const { error: e2 } = await admin.from('profiles').insert({ id: c.user.id, username, role: 'frontliner' })
  if (e2) return res.status(400).json({ error: e2.message })
  return res.status(200).json({ ok: true, username })
}
