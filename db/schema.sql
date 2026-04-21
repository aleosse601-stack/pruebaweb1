-- TIPOS
create type rol_usuario as enum ('fallero', 'admin');
create type estado_usuario as enum ('activo', 'inactivo');
create type tipo_movimiento as enum ('recarga', 'cargo', 'ajuste');
create type canal_movimiento as enum ('manual', 'qr', 'interno');

-- USUARIOS
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text unique not null,
  usuario text unique not null,
  password_demo text,
  rol rol_usuario not null default 'fallero',
  estado estado_usuario not null default 'activo',
  codigo_interno varchar(5) unique not null,
  codigo_qr text unique not null,
  created_at timestamptz default now()
);

-- MONEDERO
create table if not exists monederos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references usuarios(id) on delete cascade,
  saldo numeric(10,2) not null default 0,
  updated_at timestamptz default now()
);

-- MOVIMIENTOS DEL MONEDERO
create table if not exists movimientos_monedero (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  administrador_id uuid references usuarios(id) on delete set null,
  tipo tipo_movimiento not null,
  canal canal_movimiento not null default 'manual',
  importe numeric(10,2) not null,
  concepto text,
  observaciones text,
  created_at timestamptz default now()
);

-- EVENTOS
create table if not exists eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  fecha date,
  hora time,
  lugar text,
  creado_por uuid references usuarios(id) on delete set null,
  created_at timestamptz default now()
);

-- COMUNICADOS
create table if not exists comunicados (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  contenido text,
  publicado_por uuid references usuarios(id) on delete set null,
  created_at timestamptz default now()
);

-- FORMULARIOS
create table if not exists formularios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  activo boolean not null default true,
  creado_por uuid references usuarios(id) on delete set null,
  created_at timestamptz default now()
);

-- PREGUNTAS DE FORMULARIO
create table if not exists formulario_preguntas (
  id uuid primary key default gen_random_uuid(),
  formulario_id uuid not null references formularios(id) on delete cascade,
  pregunta text not null,
  tipo text not null default 'texto',
  orden int not null default 0
);

-- RESPUESTAS DE FORMULARIO
create table if not exists formulario_respuestas (
  id uuid primary key default gen_random_uuid(),
  formulario_id uuid not null references formularios(id) on delete cascade,
  pregunta_id uuid not null references formulario_preguntas(id) on delete cascade,
  usuario_id uuid not null references usuarios(id) on delete cascade,
  respuesta text,
  created_at timestamptz default now()
);

-- FUNCIÓN PARA GENERAR CÓDIGO INTERNO DE 5 CIFRAS
create or replace function generar_codigo_interno()
returns varchar
language plpgsql
as $$
declare
  nuevo_codigo varchar(5);
  existe boolean;
begin
  loop
    nuevo_codigo := lpad((floor(random() * 100000))::int::text, 5, '0');
    select exists(
      select 1 from usuarios where codigo_interno = nuevo_codigo
    ) into existe;
    exit when not existe;
  end loop;

  return nuevo_codigo;
end;
$$;

-- TRIGGER: SI NO SE PASA CÓDIGO, LO GENERA SOLO
create or replace function asignar_codigo_usuario()
returns trigger
language plpgsql
as $$
begin
  if new.codigo_interno is null or new.codigo_interno = '' then
    new.codigo_interno := generar_codigo_interno();
  end if;

  if new.codigo_qr is null or new.codigo_qr = '' then
    new.codigo_qr := 'FPDB-' || new.codigo_interno;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_asignar_codigo_usuario on usuarios;

create trigger trg_asignar_codigo_usuario
before insert on usuarios
for each row
execute function asignar_codigo_usuario();

-- TRIGGER: CREAR MONEDERO AUTOMÁTICO
create or replace function crear_monedero_usuario()
returns trigger
language plpgsql
as $$
begin
  insert into monederos (usuario_id, saldo)
  values (new.id, 0);
  return new;
end;
$$;

drop trigger if exists trg_crear_monedero_usuario on usuarios;

create trigger trg_crear_monedero_usuario
after insert on usuarios
for each row
execute function crear_monedero_usuario();
