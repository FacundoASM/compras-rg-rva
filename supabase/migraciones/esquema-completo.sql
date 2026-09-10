-- ============================================================================
-- Compras RG-RVA · Esquema completo de la base de datos
-- ============================================================================
-- Este archivo recrea la base desde cero. Sirve para levantar un entorno nuevo
-- (servidor local, entorno de pruebas) o para restaurar tras un desastre.
--
-- Requisitos: PostgreSQL 15+ con las extensiones de Supabase, y el esquema
-- "auth" ya creado (lo provee Supabase, sea el servicio en la nube o la
-- instalación local con Docker).
--
-- Ejecutar en orden. Es idempotente en lo que puede serlo, pero está pensado
-- para correr una sola vez sobre una base vacía.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tipos
-- ----------------------------------------------------------------------------

create type rol_usuario as enum (
  'solicitante',   -- carga pedidos
  'compras',       -- carga pedidos, marca entregas, carga costos, imprime OC
  'aprobador',     -- aprueba o rechaza
  'superusuario'   -- todo lo anterior + administración
);

create type estado_pedido as enum (
  'pendiente',
  'aprobado',
  'entregado',
  'rechazado',
  'cancelado'
);

-- ----------------------------------------------------------------------------
-- 2. Tablas
-- ----------------------------------------------------------------------------

-- Perfil de cada usuario. Se enlaza 1 a 1 con auth.users (el login).
create table perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  area        text not null,
  rol         rol_usuario not null default 'solicitante',
  creado_en   timestamptz not null default now()
);

-- Áreas de la organización. Lista controlada para evitar duplicados por tipeo.
create table areas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  creado_en   timestamptz not null default now()
);

-- Categorías de productos, nivel 1.
create table categorias (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  creado_en   timestamptz not null default now()
);

-- Categorías de productos, nivel 2.
create table subcategorias (
  id            uuid primary key default gen_random_uuid(),
  categoria_id  uuid not null references categorias(id) on delete cascade,
  nombre        text not null,
  creado_en     timestamptz not null default now(),
  unique (categoria_id, nombre)
);

-- Cabecera del pedido.
create table pedidos (
  id                 uuid primary key default gen_random_uuid(),
  numero             text not null unique,          -- PED-AAAA-NNN, lo pone un trigger
  fecha              timestamptz not null default now(),
  solicitante_id     uuid not null references perfiles(id),
  area               text not null,                 -- copia del área al momento del pedido
  estado             estado_pedido not null default 'pendiente',
  aprobado_por       uuid references perfiles(id),
  fecha_aprobacion   timestamptz,
  motivo_resolucion  text,                          -- por qué se rechazó o canceló
  entregado_por      uuid references perfiles(id),
  fecha_entrega      timestamptz,
  creado_en          timestamptz not null default now()
);

-- Renglones del pedido.
create table items_pedido (
  id               uuid primary key default gen_random_uuid(),
  pedido_id        uuid not null references pedidos(id) on delete cascade,
  descripcion      text not null,
  cantidad         numeric not null check (cantidad > 0),
  observaciones    text,
  subcategoria_id  uuid references subcategorias(id),
  costo_unitario   numeric check (costo_unitario >= 0),  -- lo carga compras, opcional
  proveedor        text                                   -- lo carga compras, opcional
);

-- Auditoría: cada cambio de estado queda registrado.
create table historial_estados (
  id          uuid primary key default gen_random_uuid(),
  pedido_id   uuid not null references pedidos(id) on delete cascade,
  estado      estado_pedido not null,
  usuario_id  uuid references perfiles(id),
  motivo      text,
  creado_en   timestamptz not null default now()
);

create index on historial_estados (pedido_id, creado_en);

-- Configuración general, clave/valor. Hoy se usa solo para los correos de aviso
-- (funcionalidad preparada pero no activa).
create table configuracion (
  clave           text primary key,
  valor           jsonb not null,
  actualizado_en  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. Numeración correlativa de pedidos
-- ----------------------------------------------------------------------------

create sequence pedido_numero_seq;

create or replace function generar_numero_pedido()
returns trigger as $$
begin
  new.numero := 'PED-' || extract(year from now())::text || '-' ||
                lpad(nextval('pedido_numero_seq')::text, 3, '0');
  return new;
end;
$$ language plpgsql;

create trigger trg_numero_pedido
before insert on pedidos
for each row
when (new.numero is null)
execute function generar_numero_pedido();

-- NOTA: la secuencia no se reinicia sola en enero. Ver docs/OPERACION.md.

-- ----------------------------------------------------------------------------
-- 4. Alta automática de perfil al registrarse
-- ----------------------------------------------------------------------------

create or replace function crear_perfil_nuevo_usuario()
returns trigger as $$
begin
  insert into perfiles (id, nombre, area, rol)
  values (new.id, split_part(new.email, '@', 1), 'Sin asignar', 'solicitante')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_crear_perfil
after insert on auth.users
for each row execute function crear_perfil_nuevo_usuario();

-- ----------------------------------------------------------------------------
-- 5. Registro del historial de estados
-- ----------------------------------------------------------------------------

create or replace function registrar_cambio_estado()
returns trigger as $$
begin
  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    insert into historial_estados (pedido_id, estado, usuario_id, motivo)
    values (new.id, new.estado, auth.uid(), new.motivo_resolucion);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_historial_insert
after insert on pedidos
for each row execute function registrar_cambio_estado();

create trigger trg_historial_update
after update on pedidos
for each row execute function registrar_cambio_estado();

-- ----------------------------------------------------------------------------
-- 6. Función auxiliar de rol
-- ----------------------------------------------------------------------------
-- IMPORTANTE: una política de seguridad sobre "perfiles" no puede consultar
-- "perfiles" directamente, porque se dispara a sí misma y Postgres corta con
-- error de recursión infinita. Esta función es SECURITY DEFINER, así que lee
-- la tabla salteando las políticas y rompe el ciclo.

create or replace function rol_actual()
returns rol_usuario as $$
  select rol from perfiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- 7. Seguridad a nivel de fila (RLS)
-- ----------------------------------------------------------------------------
-- Toda la autorización vive acá, no en la aplicación. Aunque alguien llame a la
-- API de la base directamente con la clave pública, estas reglas se aplican.

alter table perfiles           enable row level security;
alter table areas              enable row level security;
alter table categorias         enable row level security;
alter table subcategorias      enable row level security;
alter table pedidos            enable row level security;
alter table items_pedido       enable row level security;
alter table historial_estados  enable row level security;
alter table configuracion      enable row level security;

-- --- perfiles ---
-- Nombre, área y rol son datos internos no sensibles: cualquiera autenticado
-- los lee (el aprobador necesita ver quién pidió cada cosa). Editar es solo del
-- superusuario.
create policy "usuarios_autenticados_ven_perfiles" on perfiles
  for select to authenticated using (true);

create policy "superusuario_edita_perfiles" on perfiles
  for update using (rol_actual() = 'superusuario');

-- --- areas ---
create policy "ver_areas" on areas
  for select to authenticated using (true);

create policy "superusuario_administra_areas" on areas
  for all using (rol_actual() = 'superusuario');

-- --- categorias y subcategorias ---
-- Cualquiera puede crear una categoría al cargar un pedido (si no existe la que
-- necesita). Corregir y borrar es del superusuario.
create policy "ver_categorias" on categorias
  for select to authenticated using (true);
create policy "crear_categorias" on categorias
  for insert to authenticated with check (true);
create policy "superusuario_edita_categorias" on categorias
  for update using (rol_actual() = 'superusuario');
create policy "superusuario_borra_categorias" on categorias
  for delete using (rol_actual() = 'superusuario');

create policy "ver_subcategorias" on subcategorias
  for select to authenticated using (true);
create policy "crear_subcategorias" on subcategorias
  for insert to authenticated with check (true);
create policy "superusuario_edita_subcategorias" on subcategorias
  for update using (rol_actual() = 'superusuario');
create policy "superusuario_borra_subcategorias" on subcategorias
  for delete using (rol_actual() = 'superusuario');

-- --- pedidos ---
create policy "ver_pedidos" on pedidos for select using (
  solicitante_id = auth.uid()
  or rol_actual() in ('compras', 'aprobador', 'superusuario')
);

create policy "crear_pedidos" on pedidos for insert with check (
  solicitante_id = auth.uid()
);

-- El solicitante solo puede tocar su pedido mientras está pendiente. Una vez
-- aprobado ya hay una OC emitida: darlo de baja pasa a ser decisión de compras
-- o del aprobador.
create policy "gestionar_pedidos" on pedidos for update using (
  (solicitante_id = auth.uid() and estado = 'pendiente')
  or rol_actual() in ('aprobador', 'compras', 'superusuario')
);

-- --- items_pedido ---
create policy "ver_items" on items_pedido for select using (
  exists (
    select 1 from pedidos pe
    where pe.id = pedido_id
      and (pe.solicitante_id = auth.uid()
           or rol_actual() in ('compras', 'aprobador', 'superusuario'))
  )
);

create policy "crear_items" on items_pedido for insert with check (
  exists (
    select 1 from pedidos pe
    where pe.id = pedido_id
      and pe.solicitante_id = auth.uid()
      and pe.estado = 'pendiente'
  )
);

-- Compras necesita poder editar ítems ya aprobados para cargar costo y proveedor.
create policy "editar_items" on items_pedido for update using (
  exists (
    select 1 from pedidos pe
    where pe.id = pedido_id
      and pe.solicitante_id = auth.uid()
      and pe.estado = 'pendiente'
  )
  or rol_actual() in ('compras', 'superusuario')
);

create policy "borrar_items" on items_pedido for delete using (
  exists (
    select 1 from pedidos pe
    where pe.id = pedido_id
      and pe.solicitante_id = auth.uid()
      and pe.estado = 'pendiente'
  )
);

-- --- historial_estados ---
create policy "ver_historial" on historial_estados
  for select to authenticated using (true);
-- No hay política de insert: solo escribe el trigger, que es SECURITY DEFINER.

-- --- configuracion ---
create policy "ver_configuracion" on configuracion for select using (
  rol_actual() in ('compras', 'aprobador', 'superusuario')
);
create policy "administrar_configuracion" on configuracion for all using (
  rol_actual() = 'superusuario'
);

-- ----------------------------------------------------------------------------
-- 8. Datos iniciales
-- ----------------------------------------------------------------------------

insert into areas (nombre) values
  ('Técnica'), ('Programación'), ('Producción'),
  ('Administración'), ('Comercial'), ('Prensa'),
  ('Mantenimiento'), ('Sistemas')
on conflict (nombre) do nothing;

insert into categorias (nombre) values
  ('Técnica y transmisión'),
  ('Informática'),
  ('Oficina y librería'),
  ('Limpieza e higiene'),
  ('Mantenimiento e infraestructura'),
  ('Servicios y contrataciones')
on conflict (nombre) do nothing;

insert into subcategorias (categoria_id, nombre)
select c.id, s.nombre from categorias c
join (values
  ('Técnica y transmisión', 'Cables y conectores'),
  ('Técnica y transmisión', 'Micrófonos y audio'),
  ('Técnica y transmisión', 'Equipos de transmisión'),
  ('Técnica y transmisión', 'Repuestos técnicos'),
  ('Informática', 'Equipos y periféricos'),
  ('Informática', 'Insumos de impresión'),
  ('Informática', 'Licencias y software'),
  ('Informática', 'Redes'),
  ('Oficina y librería', 'Papelería'),
  ('Oficina y librería', 'Útiles'),
  ('Limpieza e higiene', 'Productos de limpieza'),
  ('Limpieza e higiene', 'Descartables'),
  ('Mantenimiento e infraestructura', 'Electricidad'),
  ('Mantenimiento e infraestructura', 'Ferretería'),
  ('Mantenimiento e infraestructura', 'Obra y pintura'),
  ('Servicios y contrataciones', 'Servicios técnicos'),
  ('Servicios y contrataciones', 'Fletes y logística')
) as s(cat, nombre) on s.cat = c.nombre
on conflict do nothing;

-- ============================================================================
-- Último paso, manual: designar al primer superusuario.
-- Esa persona tiene que haber creado su cuenta desde la pantalla de ingreso.
--
--   update perfiles
--   set rol = 'superusuario', nombre = 'Nombre Apellido', area = 'Sistemas'
--   where id = (select id from auth.users where email = 'correo@radiovictoria.com.ar');
-- ============================================================================
