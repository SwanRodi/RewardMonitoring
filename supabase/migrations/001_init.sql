-- Pulogadung Reward Monitoring – skema awal
-- Jalankan di Supabase: SQL Editor > New query > paste > Run

create table if not exists public.periods (
  id            bigint generated always as identity primary key,
  key           text unique not null,          -- contoh: 2026-01 (periode display)
  display_label text not null,                 -- contoh: JANUARI 2026
  payment_label text,                          -- contoh: FEBRUARI 2026
  cutoff_label  text,
  branch        text,
  file_name     text,
  oracle_count  int    not null default 0,     -- ringkasan dari header sheet
  oracle_total  bigint not null default 0,
  paid_count    int    not null default 0,
  paid_total    bigint not null default 0,
  unpaid_count  int    not null default 0,
  unpaid_total  bigint not null default 0,
  uploaded_at   timestamptz not null default now()
);

create table if not exists public.reward_customers (
  id            bigint generated always as identity primary key,
  period_id     bigint not null references public.periods(id) on delete cascade,
  row_no        int,
  customer_code text not null,
  customer_name text,
  address       text,
  sales_code    text,
  sales_name    text,
  md_code       text,
  md_name       text,
  rayon_md      text,
  display_type  text,
  reward_amount bigint not null default 0,
  is_paid       boolean not null default false,   -- kolom "PAID ?" = Y
  paid_amount   bigint not null default 0,
  unpaid_amount bigint not null default 0,
  order_number  text,                             -- ORDER NUMBER FAKTUR
  invoice_date  date,                             -- TGL FAKTUR = tanggal terbayarkan
  invoice_no    text,                             -- NO FAKTUR
  unique (period_id, customer_code)
);

create index if not exists idx_rc_period_paid on public.reward_customers (period_id, is_paid);
create index if not exists idx_rc_name on public.reward_customers (period_id, customer_name);

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null,
  role       text not null default 'frontliner' check (role in ('admin','frontliner')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.periods          enable row level security;
alter table public.reward_customers enable row level security;
alter table public.profiles         enable row level security;

-- Semua user login boleh membaca
create policy "periods read"   on public.periods          for select to authenticated using (true);
create policy "rewards read"   on public.reward_customers for select to authenticated using (true);
-- Hanya admin yang boleh menulis (upload Excel dari web)
create policy "periods write"  on public.periods          for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "rewards write"  on public.reward_customers for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Profil: user baca miliknya sendiri, admin baca semua
create policy "profiles read"  on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles admin" on public.profiles for all    to authenticated using (public.is_admin()) with check (public.is_admin());
