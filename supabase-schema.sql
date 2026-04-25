-- ESQUEMA LIMPIO PARA LA APP FALLA
-- Ejecutar en Supabase > SQL Editor

create extension if not exists "uuid-ossp";

create table if not exists usuarios (
  id uuid default uuid_generate_v4() primary key,
  nombre text not null,
  usuario text unique not null,
  email text,
  rol text not null default 'fallero',
  estado text not null default 'activo',
  saldo numeric not null default 0,
  password_demo text not null,
  codigo_interno text,
  codigo_qr text,
  created_at timestamp with time zone default now()
);

create table if not exists eventos (
  id uuid default uuid_generate_v4() primary key,
  titulo text not null,
  fecha date,
  hora text,
  lugar text,
  created_at timestamp with time zone default now()
);

create table if not exists comunicados (
  id uuid default uuid_generate_v4() primary key,
  titulo text not null,
  texto text not null,
  created_at timestamp with time zone default now()
);

create table if not exists formularios (
  id uuid default uuid_generate_v4() primary key,
  titulo text not null,
  pregunta text not null,
  tipo text not null default 'opcion',
  opciones jsonb not null default '[]'::jsonb,
  estado text not null default 'Abierto',
  respuestas jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists movimientos (
  id uuid default uuid_generate_v4() primary key,
  usuario text not null,
  concepto text not null,
  importe numeric not null,
  created_at timestamp with time zone default now()
);

-- AÑADIR COLUMNAS SI LA TABLA YA EXISTÍA INCOMPLETA
alter table usuarios add column if not exists email text;
alter table usuarios add column if not exists codigo_interno text;
alter table usuarios add column if not exists codigo_qr text;
alter table usuarios add column if not exists created_at timestamp with time zone default now();
alter table usuarios add column if not exists saldo numeric not null default 0;
alter table usuarios add column if not exists password_demo text;

alter table eventos add column if not exists created_at timestamp with time zone default now();
alter table comunicados add column if not exists created_at timestamp with time zone default now();
alter table formularios add column if not exists created_at timestamp with time zone default now();
alter table formularios add column if not exists opciones jsonb not null default '[]'::jsonb;
alter table formularios add column if not exists respuestas jsonb not null default '[]'::jsonb;
alter table movimientos add column if not exists created_at timestamp with time zone default now();

-- RLS
alter table usuarios enable row level security;
alter table eventos enable row level security;
alter table comunicados enable row level security;
alter table formularios enable row level security;
alter table movimientos enable row level security;

-- POLÍTICAS LIMPIAS
DROP POLICY IF EXISTS "public all" ON usuarios;
DROP POLICY IF EXISTS "public all" ON eventos;
DROP POLICY IF EXISTS "public all" ON comunicados;
DROP POLICY IF EXISTS "public all" ON formularios;
DROP POLICY IF EXISTS "public all" ON movimientos;

CREATE POLICY "public all" ON usuarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON eventos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON comunicados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON formularios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON movimientos FOR ALL USING (true) WITH CHECK (true);

-- USUARIOS DE PRUEBA
insert into usuarios (nombre, usuario, email, rol, estado, saldo, password_demo, codigo_interno, codigo_qr)
values
('Administrador', 'admin', 'admin@falla.local', 'admin', 'activo', 100, '1234', 'FB-ADMIN', 'QR-ADMIN'),
('Fallero Demo', 'fallero', 'fallero@falla.local', 'fallero', 'activo', 50, '1234', 'FB-FALLERO', 'QR-FALLERO')
on conflict (usuario) do nothing;
