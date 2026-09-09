# Compras RG-RVA

Sistema de pedidos, aprobación e impresión de órdenes de compra.
Stack: Next.js (App Router) + Supabase (auth, base de datos, edge functions) + Vercel (hosting).

El proyecto de Supabase (`compras-rg-rva`, ref `ksigpzmjkuqdklzqfhzn`, región `sa-east-1`)
ya está creado, con el esquema de base de datos aplicado (perfiles, pedidos, items_pedido,
configuracion) y seguridad por fila (RLS) configurada por rol.

## Roles
- `solicitante`: carga pedidos.
- `compras`: carga pedidos e imprime órdenes de compra.
- `aprobador`: aprueba o rechaza pedidos (una sola persona).
- `superusuario`: administra perfiles (nombre, área, rol de cada login) y los mails de aviso.

## Poner en marcha localmente
1. `npm install`
2. Copiar `.env.example` a `.env.local` y completar `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (Supabase Dashboard > Project Settings > API > anon/public key del proyecto `compras-rg-rva`).
3. `npm run dev`

## Primer usuario superusuario
Los usuarios se crean solos al iniciar sesión (magic link), pero arrancan como `solicitante`
sin nombre/área. Para dar de alta al primer superusuario, ejecutar en el SQL Editor de Supabase
después de que esa persona haya iniciado sesión una vez:

```sql
update perfiles set rol = 'superusuario', nombre = 'Tu nombre', area = 'Tu área'
where id = (select id from auth.users where email = 'tu-correo@empresa.com');
```

Desde ahí, ese superusuario puede editar el resto de los perfiles desde `/admin/perfiles`.

## Avisos por correo (pendiente de un paso manual)
El código de la función y el trigger están armados, pero el deploy de la Edge Function
no se pudo hacer automáticamente. Para activarlo:
1. Instalar la Supabase CLI y loguearse (`supabase login`).
2. `supabase link --project-ref ksigpzmjkuqdklzqfhzn`
3. `supabase functions deploy notificar-pedido`
4. Configurar el secreto `RESEND_API_KEY` (Dashboard > Edge Functions > notificar-pedido > Secrets).
   Necesitás una cuenta gratuita en resend.com.
5. Editar `supabase/migrations/9999_avisos_trigger.sql`, reemplazar `REEMPLAZAR_ANON_KEY`
   por la anon key del proyecto, y correrlo en el SQL Editor.
6. Cargar los mails de aviso desde `/admin/perfiles` en la sección "Avisos por correo".

## Deploy en Vercel
1. Subir este código a un repositorio de GitHub.
2. Conectar el repo en Vercel (o pedirle a Claude que lo conecte una vez esté pusheado).
3. Configurar las mismas variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) en el proyecto de Vercel.
