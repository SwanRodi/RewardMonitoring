// Membuat akun admin pertama.  Pakai:  npm run admin:create -- pulogadung.mgdt "PasswordKuat123"
import { createClient } from '@supabase/supabase-js'
const [username, password] = process.argv.slice(2)
if (!username || !password) { console.error('Pakai: npm run admin:create -- <username> <password>'); process.exit(1) }
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const u = username.toLowerCase()
const { data, error } = await sb.auth.admin.createUser({ email: `${u}@reward.example.com`, password, email_confirm: true })
if (error) { console.error(error.message); process.exit(1) }
const { error: e2 } = await sb.from('profiles').insert({ id: data.user.id, username: u, role: 'admin' })
if (e2) { console.error(e2.message); process.exit(1) }
console.log(`Admin "${u}" dibuat.`)
