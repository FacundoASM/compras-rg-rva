-- ============================================================================
-- Compras RG-RVA · Proveedores y archivos adjuntos
-- ============================================================================
-- Correr DESPUÉS de esquema-completo.sql, sobre una base ya creada.
-- Si estás armando un entorno nuevo desde cero, corré primero el otro archivo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Proveedores
-- ----------------------------------------------------------------------------

create table proveedores (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null unique,
  direccion          text,
  provincia          text,
  cuit               text,
  telefono           text,
  email              text,
  cuenta_contable    text,     -- sale impreso en la orden de compra
  condiciones_pago   text,
  activo             boolean not null default true,
  creado_en          timestamptz not null default now()
);

-- Proveedor a nivel pedido. Si varios_proveedores = true, se define ítem por ítem
-- y la orden de compra se emite por separado para cada proveedor.
alter table pedidos
  add column proveedor_id uuid references proveedores(id),
  add column varios_proveedores boolean not null default false;

alter table items_pedido
  add column proveedor_id uuid references proveedores(id);

-- Migración de la versión anterior, donde el proveedor era texto libre por ítem.
-- Si la columna "proveedor" no existe, saltear este bloque.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'items_pedido' and column_name = 'proveedor'
  ) then
    insert into proveedores (nombre)
    select distinct trim(proveedor)
    from items_pedido
    where proveedor is not null and trim(proveedor) <> ''
    on conflict (nombre) do nothing;

    update items_pedido i
    set proveedor_id = p.id
    from proveedores p
    where trim(i.proveedor) = p.nombre;

    alter table items_pedido drop column proveedor;
  end if;
end $$;

alter table proveedores enable row level security;

-- Todos los autenticados los leen (la OC los muestra); solo quien gestiona los edita.
create policy "ver_proveedores" on proveedores
  for select to authenticated using (true);

create policy "gestionar_proveedores" on proveedores
  for all using (rol_actual() in ('compras', 'aprobador', 'superusuario'));

-- ----------------------------------------------------------------------------
-- 2. Archivos adjuntos
-- ----------------------------------------------------------------------------

create table adjuntos (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references pedidos(id) on delete cascade,
  nombre_archivo text not null,
  ruta           text not null,          -- ubicación dentro del depósito
  tipo           text,
  tamano         bigint,
  subido_por     uuid references perfiles(id),
  creado_en      timestamptz not null default now()
);

create index on adjuntos (pedido_id);

alter table adjuntos enable row level security;

create policy "ver_adjuntos" on adjuntos for select using (
  exists (
    select 1 from pedidos pe
    where pe.id = pedido_id
      and (pe.solicitante_id = auth.uid()
           or rol_actual() in ('compras', 'aprobador', 'superusuario'))
  )
);

create policy "crear_adjuntos" on adjuntos for insert with check (
  exists (
    select 1 from pedidos pe
    where pe.id = pedido_id
      and (pe.solicitante_id = auth.uid()
           or rol_actual() in ('compras', 'aprobador', 'superusuario'))
  )
);

create policy "borrar_adjuntos" on adjuntos for delete using (
  subido_por = auth.uid()
  or rol_actual() in ('compras', 'aprobador', 'superusuario')
);

-- ----------------------------------------------------------------------------
-- 3. Depósito de archivos
-- ----------------------------------------------------------------------------
-- Privado (no se sirve por URL pública): la aplicación genera enlaces firmados
-- que vencen a los 60 segundos. Tope de 10 MB por archivo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'adjuntos', 'adjuntos', false, 10485760,
  array[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

create policy "ver_archivos_adjuntos" on storage.objects for select to authenticated
  using (bucket_id = 'adjuntos');

create policy "subir_archivos_adjuntos" on storage.objects for insert to authenticated
  with check (bucket_id = 'adjuntos');

create policy "borrar_archivos_adjuntos" on storage.objects for delete to authenticated
  using (
    bucket_id = 'adjuntos'
    and (owner = auth.uid() or rol_actual() in ('compras', 'aprobador', 'superusuario'))
  );

-- ============================================================================
-- Nota de operación: los archivos ocupan espacio en el depósito. El plan
-- gratuito de Supabase da 1 GB. Al borrar un pedido, la fila de "adjuntos" se
-- borra en cascada pero el archivo físico NO: la aplicación lo elimina cuando se
-- quita desde la interfaz. Ver docs/OPERACION.md.
-- ============================================================================
