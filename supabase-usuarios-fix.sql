-- REPARACIÓN ESPECÍFICA DE USUARIOS PARA LA APP
-- Pegar en Supabase > SQL Editor y ejecutar

-- 1) Asegurar columnas que la web necesita
alter table public.usuarios add column if not exists email text;
alter table public.usuarios add column if not exists password_demo text;
alter table public.usuarios add column if not exists codigo_interno text;
alter table public.usuarios add column if not exists codigo_qr text;
alter table public.usuarios add column if not exists saldo numeric default 0;
alter table public.usuarios add column if not exists created_at timestamp with time zone default now();

-- 2) Rellenar códigos vacíos para usuarios antiguos
update public.usuarios
set codigo_interno = 'FB-' || upper(substr(id::text, 1, 8))
where codigo_interno is null or codigo_interno = '';

update public.usuarios
set codigo_qr = 'QR-' || upper(substr(id::text, 1, 8))
where codigo_qr is null or codigo_qr = '';

update public.usuarios
set saldo = 0
where saldo is null;

update public.usuarios
set estado = 'activo'
where estado is null or estado = '';

update public.usuarios
set rol = 'fallero'
where rol is null or rol = '';

-- 3) Quitar políticas antiguas que puedan bloquear
DROP POLICY IF EXISTS "public all" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete" ON public.usuarios;

-- 4) Activar RLS y permitir operaciones desde la web
alter table public.usuarios enable row level security;

create policy "usuarios_select" on public.usuarios
for select to anon, authenticated
using (true);

create policy "usuarios_insert" on public.usuarios
for insert to anon, authenticated
with check (true);

create policy "usuarios_update" on public.usuarios
for update to anon, authenticated
using (true)
with check (true);

create policy "usuarios_delete" on public.usuarios
for delete to anon, authenticated
using (true);

-- 5) Permisos básicos
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios TO anon, authenticated;

-- 6) Usuario admin de prueba si no existe
insert into public.usuarios (nombre, email, usuario, password_demo, rol, estado, codigo_interno, codigo_qr, saldo)
values ('Administrador', 'admin@falla.local', 'admin', '1234', 'admin', 'activo', 'FB-ADMIN', 'QR-ADMIN', 100)
on conflict (usuario) do nothing;

-- 7) Usuario fallero de prueba si no existe
insert into public.usuarios (nombre, email, usuario, password_demo, rol, estado, codigo_interno, codigo_qr, saldo)
values ('Fallero Demo', 'fallero@falla.local', 'fallero', '1234', 'fallero', 'activo', 'FB-FALLERO', 'QR-FALLERO', 50)
on conflict (usuario) do nothing;
