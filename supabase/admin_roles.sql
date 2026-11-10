-- Peran akun admin dashboard: 'admin' (default) & 'super_admin'.
-- Jalankan PERTAMA di Supabase SQL Editor (aman dijalankan ulang), lalu
-- auth_activity_logs.sql dan manual_infaq_transactions.sql (keduanya memakai is_super_admin()).
--
-- Akun yang login tanpa baris di tabel ini dianggap 'admin'.
-- Hak khusus super_admin:
--   - melihat log aktivitas semua akun (admin biasa: hanya miliknya)
--   - menghapus infaq manual yang diinput akun lain (admin biasa: hanya miliknya)
--   - mengelola peran akun (tabel ini)

create table if not exists public.admin_roles (
  email text primary key check (email = lower(email)),
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  updated_by text,
  updated_at timestamptz not null default now()
);

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_roles
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and role = 'super_admin'
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

-- Minimal harus selalu ada 1 super_admin (cegah terkunci tanpa pengelola peran)
create or replace function public.admin_roles_keep_super_admin()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from public.admin_roles where role = 'super_admin') then
    raise exception 'Minimal harus ada satu super admin.';
  end if;
  return null;
end;
$$;

drop trigger if exists admin_roles_keep_super_admin on public.admin_roles;
create constraint trigger admin_roles_keep_super_admin
  after update or delete on public.admin_roles
  deferrable initially deferred
  for each row execute function public.admin_roles_keep_super_admin();

alter table public.admin_roles enable row level security;

drop policy if exists "read own role or super admin" on public.admin_roles;
create policy "read own role or super admin" on public.admin_roles
  for select to authenticated
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')) or public.is_super_admin());

drop policy if exists "super admin insert role" on public.admin_roles;
create policy "super admin insert role" on public.admin_roles
  for insert to authenticated with check (public.is_super_admin());

drop policy if exists "super admin update role" on public.admin_roles;
create policy "super admin update role" on public.admin_roles
  for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "super admin delete role" on public.admin_roles;
create policy "super admin delete role" on public.admin_roles
  for delete to authenticated using (public.is_super_admin());

-- Super admin awal
insert into public.admin_roles (email, role, updated_by)
values ('daidinda19@gmail.com', 'super_admin', 'setup')
on conflict (email) do update set role = 'super_admin', updated_at = now();
