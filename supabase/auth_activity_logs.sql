-- Login akun admin (Supabase Auth email + password) + log aktivitas per akun.
-- Jalankan di Supabase SQL Editor SETELAH admin_roles.sql (aman dijalankan ulang).
--
-- Akun bisa dibuat dari layar Daftar di dashboard (email + password), atau manual di
-- Supabase Dashboard → Authentication → Users → "Add user" (centang Auto Confirm User).
-- Agar tombol Daftar berfungsi: Authentication → Providers → Email → nyalakan
-- "Allow new users to sign up". Disarankan matikan "Confirm email" agar langsung bisa masuk.
-- Provider Google tidak dipakai (boleh dimatikan di Authentication → Providers).

-- 1. Log aktivitas (append-only: tidak ada policy update / delete)
create table if not exists public.activity_logs (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  user_email text,
  user_name text,
  action text not null,
  entity_type text,
  entity_id text,
  member_id text,
  member_name text,
  batch_id bigint,
  class_id bigint,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);
create index if not exists activity_logs_user_created_at_idx on public.activity_logs (user_id, created_at desc);

alter table public.activity_logs enable row level security;

-- Admin biasa hanya melihat aktivitasnya sendiri; super admin melihat semua akun
drop policy if exists "authenticated read activity" on public.activity_logs;
drop policy if exists "read own activity or super admin" on public.activity_logs;
create policy "read own activity or super admin" on public.activity_logs
  for select to authenticated using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists "authenticated insert own activity" on public.activity_logs;
create policy "authenticated insert own activity" on public.activity_logs
  for insert to authenticated with check (user_id = auth.uid());

-- 2. Tabel lama kini diakses memakai JWT akun yang login (role authenticated)
drop policy if exists "authenticated full access" on public.reminder_logs;
create policy "authenticated full access" on public.reminder_logs
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.message_templates;
create policy "authenticated full access" on public.message_templates
  for all to authenticated using (true) with check (true);

-- 3. (Opsional, setelah semua admin sudah bisa login) tutup akses tanpa login:
-- alter table public.reminder_logs enable row level security;
-- alter table public.message_templates enable row level security;
-- revoke all on table public.reminder_logs from anon;
-- revoke all on table public.message_templates from anon;
