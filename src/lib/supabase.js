import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
// true jika env belum diisi di Vercel (atau belum di-redeploy setelah diisi)
export const envMissing = !url || !key
export const supabase = createClient(url || 'http://localhost', key || 'missing-key')
export const emailOf = (username) => `${username.trim().toLowerCase()}@reward.example.com`
