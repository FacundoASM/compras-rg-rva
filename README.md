# Compras RG-RVA

Sistema de pedidos, aprobación e impresión de órdenes de compra.
Stack: Next.js (App Router) + Supabase (auth y base de datos) + Vercel (hosting).

Proyecto de Supabase: `compras-rg-rva`, ref `ksigpzmjkuqdklzqfhzn`, región `sa-east-1`.

## Roles
- `solicitante`: carga pedidos.
- `compras`: carga pedidos e imprime órdenes de compra.
- `aprobador`: aprueba o rechaza pedidos (una sola persona).
- `superusuario`: administra perfiles (nombre, área y rol de cada login).

## Ingreso
Usuario y contraseña. Cada persona crea su cuenta desde la pantalla de login
("Crear cuenta") y entra como `solicitante` con área "Sin asignar". El superusuario
le asigna nombre, área y rol desde `/admin/perfiles`.

No se envía ningún correo: la verificación por mail está desactivada en Supabase
(Authentication → Providers → Email → "Confirm email" apagado).

## Primer superusuario
Después de crear tu cuenta desde la app, correr una vez en el SQL Editor de Supabase:

```sql
update perfiles
set rol = 'superusuario', nombre = 'Tu nombre', area = 'Tu área'
where id = (select id from auth.users where email = 'tu-correo@empresa.com');
```

Desde ahí administrás el resto de los perfiles desde la app, sin volver a tocar SQL.

## Poner en marcha localmente
1. `npm install`
2. Copiar `.env.example` a `.env.local` y completar las variables.
3. `npm run dev`

## Avisos por correo (no activo — base para el futuro)
El sistema NO envía avisos hoy. Quedó armada la base para agregarlos cuando haga falta:

- `supabase/functions/notificar-pedido/index.ts`: función que envía el correo
  (aviso al aprobador cuando entra un pedido, aviso a compras cuando se aprueba).
- `supabase/migrations/9999_avisos_trigger.sql`: triggers de la base que la invocan.
- Tabla `configuracion`, clave `avisos_email`: guarda a qué direcciones avisar.
- Sección "Avisos por correo" en `/admin/perfiles`: permite cargar esas direcciones.

Para activarlo en el futuro hacen falta: una cuenta en un proveedor de correo
(ej. Resend), deployar la función con la Supabase CLI, cargar el secreto
`RESEND_API_KEY`, y correr el SQL de los triggers reemplazando el placeholder de la
anon key.

## Deploy
Conectado a Vercel: cada push a `main` dispara un deploy.
Variables de entorno necesarias en Vercel: `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_ANON_KEY`.
