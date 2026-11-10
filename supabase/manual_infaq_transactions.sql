-- Transaksi infaq yang diinput manual oleh admin (per member, per batch).
-- Jalankan di Supabase SQL Editor SETELAH admin_roles.sql (aman dijalankan ulang).
-- Hanya akun yang login yang bisa membaca / menambah. Hapus: inputan sendiri, atau super admin.

create table if not exists public.manual_infaq_transactions (
  id uuid primary key default gen_random_uuid(),
  member_id bigint not null,
  member_name text,
  batch_id bigint not null,
  class_id bigint,
  amount numeric(12, 0) not null check (amount > 0),
  transaction_date date not null default current_date,
  notes text,
  created_by text,
  created_by_id uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.manual_infaq_transactions
  add column if not exists created_by_id uuid default auth.uid() references auth.users (id) on delete set null;

create index if not exists manual_infaq_transactions_batch_member_idx
  on public.manual_infaq_transactions (batch_id, member_id);

alter table public.manual_infaq_transactions enable row level security;

drop policy if exists "anon read manual infaq" on public.manual_infaq_transactions;
drop policy if exists "anon insert manual infaq" on public.manual_infaq_transactions;
drop policy if exists "anon delete manual infaq" on public.manual_infaq_transactions;

drop policy if exists "authenticated read manual infaq" on public.manual_infaq_transactions;
create policy "authenticated read manual infaq" on public.manual_infaq_transactions
  for select to authenticated using (true);

drop policy if exists "authenticated insert manual infaq" on public.manual_infaq_transactions;
create policy "authenticated insert manual infaq" on public.manual_infaq_transactions
  for insert to authenticated with check (amount > 0 and created_by_id = auth.uid());

drop policy if exists "authenticated delete manual infaq" on public.manual_infaq_transactions;
drop policy if exists "delete own manual infaq or super admin" on public.manual_infaq_transactions;
create policy "delete own manual infaq or super admin" on public.manual_infaq_transactions
  for delete to authenticated using (created_by_id = auth.uid() or public.is_super_admin());
