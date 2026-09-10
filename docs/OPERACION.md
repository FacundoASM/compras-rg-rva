# Operación y mantenimiento

Para Sistemas. Tareas periódicas, copias de seguridad y resolución de problemas.

---

## Copias de seguridad

**Lo primero que hay que dejar funcionando.** Un sistema sin copias probadas es
un sistema que en algún momento pierde datos.

### Con Supabase en la nube

**El plan gratuito de Supabase NO hace copias de seguridad automáticas.** Si se
borra algo por error, no hay de dónde restaurar salvo lo que hayas guardado por
tu cuenta. Mientras el sistema siga en el plan gratuito, este script no es una
recomendación: es la única red de seguridad que existe.

```bash
#!/bin/bash
# /opt/scripts/respaldo-compras.sh
DESTINO=/var/respaldos/compras
FECHA=$(date +%Y%m%d-%H%M)
mkdir -p "$DESTINO"

pg_dump "postgresql://postgres:CLAVE@db.xxxx.supabase.co:5432/postgres" \
  --schema=public --schema=auth --no-owner --no-privileges \
  | gzip > "$DESTINO/compras-$FECHA.sql.gz"

# conservar 30 días
find "$DESTINO" -name "compras-*.sql.gz" -mtime +30 -delete
```

```bash
chmod 700 /opt/scripts/respaldo-compras.sh
sudo crontab -e
# todos los días a las 2 de la mañana
0 2 * * * /opt/scripts/respaldo-compras.sh >> /var/log/respaldo-compras.log 2>&1
```

### Con Supabase local

```bash
#!/bin/bash
DESTINO=/var/respaldos/compras
FECHA=$(date +%Y%m%d-%H%M)
mkdir -p "$DESTINO"
cd /opt/supabase/docker

docker compose exec -T db pg_dump -U postgres \
  --schema=public --schema=auth --no-owner --no-privileges postgres \
  | gzip > "$DESTINO/compras-$FECHA.sql.gz"

find "$DESTINO" -name "compras-*.sql.gz" -mtime +30 -delete
```

Copiar además el archivo `.env` de Supabase a un lugar seguro: sin el
`JWT_SECRET` original, un respaldo restaurado no reconoce las sesiones ni las
claves.

### Incluir siempre el esquema `auth`

Es lo que guarda los usuarios y sus contraseñas. Un respaldo solo de `public`
restaura los pedidos pero deja los `solicitante_id` apuntando a usuarios que ya
no existen.

### Probar la restauración

Una copia que nunca se restauró no es una copia, es una suposición. Cada tanto:

```bash
docker run --rm -d --name prueba -e POSTGRES_PASSWORD=prueba -p 5433:5432 postgres:15
gunzip -c /var/respaldos/compras/compras-XXXX.sql.gz | \
  psql "postgresql://postgres:prueba@localhost:5433/postgres"
psql "postgresql://postgres:prueba@localhost:5433/postgres" -c "select count(*) from pedidos;"
docker stop prueba
```

---

## Tareas periódicas

| Cuándo | Tarea |
|---|---|
| Diario | Automático: copia de seguridad |
| Semanal | Revisar el log de copias. Confirmar que la app responde |
| Mensual | Revisar categorías duplicadas. Revisar perfiles sin área asignada |
| Trimestral | Probar una restauración. Actualizar dependencias |
| Anual | **Reiniciar la numeración de pedidos** (ver abajo) |

### Reinicio anual de la numeración

El número tiene formato `PED-AAAA-NNN`. El año lo toma de la fecha, pero el
contador **no se reinicia solo**: al 1 de enero el pedido siguiente al
`PED-2026-214` será `PED-2027-215`, no `PED-2027-001`.

No rompe nada (el número sigue siendo único), pero si se prefiere que arranque
en 1 cada año, ejecutar el primer día hábil de enero:

```sql
alter sequence pedido_numero_seq restart with 1;
```

Verificar antes que no haya pedidos del año nuevo ya cargados.

### Revisión de categorías

Menú **Categorías** del superusuario. Buscar duplicados por tipeo y fusionarlos.
Es lo que mantiene el tablero confiable.

```sql
-- subcategorías parecidas dentro de la misma categoría
select c.nombre as categoria, s1.nombre, s2.nombre
from subcategorias s1
join subcategorias s2
  on s1.categoria_id = s2.categoria_id
 and s1.id < s2.id
 and lower(unaccent(s1.nombre)) = lower(unaccent(s2.nombre))
join categorias c on c.id = s1.categoria_id;
```

(Requiere la extensión `unaccent`: `create extension if not exists unaccent;`)

### Actualizar dependencias

```bash
cd /opt/compras-rg-rva
npm outdated
npm audit
npm audit fix          # solo cambios compatibles
npm run build          # verificar que compila
sudo systemctl restart compras
```

Las actualizaciones de versión mayor (Next 14 → 15) requieren leer la guía de
migración y probar en un entorno aparte. No hacerlas directo en producción.

---

## Problemas frecuentes

### "El usuario queda deslogueado solo"

Ya fue corregido: el middleware no arrastraba las cookies de sesión refrescadas
al redirigir. Si reaparece, revisar que `middleware.ts` copie las cookies a la
respuesta de redirección:

```typescript
response.cookies.getAll().forEach((c) => redir.cookies.set(c));
```

### "No puedo crear cuentas: pide confirmar el correo"

Supabase → **Authentication → Providers → Email** → desactivar **Confirm
email**. El sistema no envía correos.

### "Error: infinite recursion detected in policy"

Alguna política sobre `perfiles` está consultando `perfiles` directamente. Tiene
que hacerlo a través de la función `rol_actual()`, que es `SECURITY DEFINER`.
Ver ARQUITECTURA.md.

### "Los nombres aparecen vacíos en los pedidos"

La política de lectura de `perfiles` quedó restringida al propio perfil.
Verificar que exista:

```sql
select policyname, cmd from pg_policies
where tablename = 'perfiles';
-- debe estar "usuarios_autenticados_ven_perfiles" para select
```

### "El blanqueo de contraseña falla"

Falta la variable `SUPABASE_SERVICE_ROLE_KEY`, o es incorrecta. Verificar que
esté en el entorno del servidor y reiniciar el servicio. En Vercel, además,
después de agregarla hay que volver a desplegar: las variables no se aplican a
despliegues ya hechos.

### "El build falla con 'Cannot find name Deno'"

TypeScript está intentando compilar las funciones de Supabase, que corren en
Deno. Verificar que `tsconfig.json` tenga:

```json
"exclude": ["node_modules", "supabase"]
```

### "La orden de compra sale mal impresa"

- Encabezado de tabla en blanco: activar "Gráficos de fondo" en el diálogo de
  impresión.
- Se corta a lo ancho: verificar que el tamaño esté en A4 y la escala en 100%.
- Aparece el menú de la aplicación: falta la clase `no-print`; revisar las
  reglas `@media print` en `globals.css`.

### "La aplicación no responde"

```bash
sudo systemctl status compras
sudo journalctl -u compras -n 100 --no-pager
sudo systemctl restart compras
```

Si el problema es la base:

```bash
# local
cd /opt/supabase/docker && docker compose ps && docker compose logs -f db
# nube
# revisar status.supabase.com y el panel del proyecto
```

---

## Consultas útiles

```sql
-- Pedidos parados hace más de una semana
select numero, area, fecha, estado,
       now()::date - fecha::date as dias
from pedidos
where estado in ('pendiente', 'aprobado')
  and fecha < now() - interval '7 days'
order by fecha;

-- Gasto del año por área
select area, count(*) as pedidos,
       sum(t.total) as gasto
from pedidos p
join lateral (
  select coalesce(sum(costo_unitario * cantidad), 0) as total
  from items_pedido where pedido_id = p.id
) t on true
where p.estado in ('aprobado', 'entregado')
  and extract(year from p.fecha) = extract(year from now())
group by area
order by gasto desc;

-- Personas sin área asignada
select nombre, rol from perfiles where area = 'Sin asignar';

-- Ítems aprobados sin costo cargado
select p.numero, i.descripcion, i.cantidad
from items_pedido i
join pedidos p on p.id = i.pedido_id
where p.estado in ('aprobado', 'entregado')
  and i.costo_unitario is null
order by p.fecha desc;

-- Historial completo de un pedido
select h.creado_en, h.estado, pf.nombre, h.motivo
from historial_estados h
left join perfiles pf on pf.id = h.usuario_id
where h.pedido_id = (select id from pedidos where numero = 'PED-2026-041')
order by h.creado_en;
```

---

## Seguridad: revisión periódica

- [ ] `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor, nunca en el repositorio
- [ ] `.env.local` con permisos 600 y fuera del control de versiones
- [ ] Puertos internos (3000, 8000, 5432) cerrados desde afuera
- [ ] HTTPS activo, aun en red interna
- [ ] Revisar la lista de perfiles: dar de baja a quienes ya no están
- [ ] Verificar que no haya superusuarios de más
- [ ] En instalación local: confirmar que ningún secreto quedó con el valor de
      ejemplo de Supabase
- [ ] Confirmar que la última copia de seguridad se generó y se puede leer

```sql
-- quiénes tienen permisos altos
select nombre, area, rol, creado_en
from perfiles
where rol in ('superusuario', 'aprobador', 'compras')
order by rol;
```

---

## Contactos y referencias

- Repositorio: `https://github.com/FacundoASM/compras-rg-rva`
- Documentación de Supabase autoalojado: `https://supabase.com/docs/guides/self-hosting/docker`
- Documentación de Next.js: `https://nextjs.org/docs`

Antes de tocar producción, probar en un entorno aparte. Restaurar una copia
reciente en una base de prueba es la forma más segura de armarlo.
