# Arquitectura

Cómo está construido el sistema, para quien tenga que mantenerlo o modificarlo.

---

## Panorama general

```
   Navegador
       │  HTTPS
       ▼
┌──────────────────────────────────────┐
│  Next.js (App Router)                │
│                                      │
│  middleware.ts   → controla sesión   │
│  app/*/page.tsx  → pantallas         │
│  app/acciones.ts → escrituras        │
└───────────────┬──────────────────────┘
                │  supabase-js
                ▼
┌──────────────────────────────────────┐
│  Supabase                            │
│    Auth      → usuarios y sesiones   │
│    PostgREST → API sobre la base     │
│    PostgreSQL                        │
│      └─ RLS: la autorización real    │
└──────────────────────────────────────┘
```

**Decisión de fondo:** la autorización no vive en la aplicación, vive en la base
de datos, en las políticas RLS. La interfaz esconde los botones que no
corresponden, pero eso es comodidad, no seguridad. Aunque alguien llame a la API
directamente con la clave pública, la base rechaza lo que no está permitido.

---

## Estructura de archivos

```
compras-rg-rva/
├── app/
│   ├── layout.tsx              Estructura común: nav lateral, avisos, fuente
│   ├── page.tsx                Redirige según el rol
│   ├── globals.css             Todos los estilos del sistema
│   ├── acciones.ts             Server actions: toda escritura pasa por acá
│   │
│   ├── login/                  Ingreso y alta de cuenta
│   ├── pedidos/nuevo/          Carga de pedido
│   ├── pedidos/[id]/editar/    Edición de pedido pendiente propio
│   ├── mis-pedidos/            Seguimiento del solicitante
│   ├── aprobacion/             Gestión: aprobar, entregar, costos
│   ├── oc/[id]/                Orden de compra imprimible
│   ├── dashboard/              Tablero
│   ├── admin/perfiles/         Personas, roles, blanqueo de contraseña
│   ├── admin/areas/            Áreas
│   ├── admin/categorias/       Categorías: renombrar y fusionar
│   │
│   └── components/
│       ├── Navegacion.tsx      Nav lateral con menú móvil
│       ├── Aviso.tsx           Avisos emergentes
│       ├── EstadoPedido.tsx    Línea de progreso del estado
│       ├── SelectorCategoria.tsx  Categoría/subcategoría con alta al vuelo
│       ├── AccionConMotivo.tsx    Confirmación que pide motivo
│       ├── FiltrosPedidos.tsx     Filtros de Gestión
│       ├── FiltrosTablero.tsx     Filtros del tablero
│       └── BotonImprimir.tsx      Dispara la impresión del navegador
│
├── lib/
│   ├── supabase/client.ts      Cliente para el navegador
│   ├── supabase/server.ts      Cliente para el servidor + getPerfilActual()
│   ├── supabase/admin.ts       Cliente con service role (solo servidor)
│   ├── flash.ts                Mensajes de un solo uso
│   └── empresa.ts              Datos que salen en la OC
│
├── middleware.ts               Verificación de sesión en cada petición
├── public/rv-logo.jpg          Logo
├── docs/                       Esta documentación
└── supabase/
    ├── migraciones/            Esquema SQL
    └── functions/              Avisos por correo (preparado, sin activar)
```

---

## Modelo de datos

```
auth.users (Supabase)
     │ 1:1
     ▼
  perfiles ──────────────┐
     │ solicitante_id    │ aprobado_por / entregado_por
     ▼                   │
  pedidos ◄──────────────┘
     │ 1:N                    1:N
     ├──────────► items_pedido ──────► subcategorias ──► categorias
     │
     └──────────► historial_estados

  areas          (lista controlada, no relacionada por clave foránea)
  configuracion  (clave/valor)
```

### Notas sobre el diseño

**`pedidos.area` es una copia, no una referencia.** Guarda el área que tenía el
solicitante cuando cargó el pedido. Si mañana esa persona cambia de área, los
pedidos viejos siguen contando para el área original, que es lo correcto para
analizar el gasto histórico.

**`items_pedido.costo_unitario` y `proveedor` son opcionales.** Un pedido sirve
igual sin ellos; cuando están, habilitan todo el análisis de gasto del tablero.

**`historial_estados` lo escribe un trigger, nunca la aplicación.** Así no hay
forma de cambiar un estado sin dejar rastro.

**La numeración usa una secuencia de Postgres.** Garantiza unicidad aun con
varias personas cargando al mismo tiempo. Ver OPERACION.md sobre el reinicio
anual.

---

## Seguridad

### Autenticación

Correo y contraseña, gestionado por Supabase Auth. Las contraseñas se guardan
con hash bcrypt; el sistema nunca las ve. La sesión viaja en cookies firmadas
que el middleware refresca en cada petición.

No hay recuperación por correo (el envío de mails está desactivado). El
superusuario asigna una contraseña nueva desde Perfiles.

### Autorización

Toda en políticas RLS, sobre la tabla `perfiles` y la función `rol_actual()`.

**El detalle que más cuesta encontrar si se rompe:** una política sobre
`perfiles` no puede hacer `select` sobre `perfiles`, porque la política se
dispara a sí misma y Postgres corta con error de recursión infinita. Por eso
existe `rol_actual()`, declarada `SECURITY DEFINER`: lee la tabla salteando las
políticas y rompe el ciclo. Si en el futuro se agrega una política que consulte
`perfiles`, hay que hacerlo a través de esa función.

### Las tres claves

| Clave | Dónde vive | Qué puede |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Navegador y servidor | Nada por sí sola |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Navegador y servidor | Solo lo que las políticas RLS permitan al usuario que la use. Es pública por diseño |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo servidor** | **Todo, salteando las políticas** |

La tercera solo se usa en `lib/supabase/admin.ts`, para blanquear contraseñas, y
la acción verifica que quien la ejecuta sea superusuario antes de usarla. Si se
filtra, hay que rotarla desde el panel de Supabase de inmediato.

---

## Cómo fluyen los datos

### Lectura

Las pantallas son Server Components: consultan la base en el servidor con la
sesión del usuario y mandan HTML ya armado. La clave pública nunca se usa desde
el navegador para leer datos sensibles, y las políticas RLS se aplican igual.

Todas las páginas con datos declaran `export const dynamic = "force-dynamic"`
para que no queden cacheadas entre usuarios.

### Escritura

Todas las escrituras pasan por `app/acciones.ts`, marcado `"use server"`. Una
acción típica:

1. Recibe los datos del formulario.
2. Verifica la sesión con `getPerfilActual()`.
3. Escribe; las políticas RLS validan el permiso real.
4. Deja un mensaje con `ponerFlash()`.
5. Invalida el caché de las rutas afectadas con `revalidatePath()`.

**Por qué del lado del servidor y no del navegador:** al escribir desde el
cliente, la sesión puede estar vencida en el momento del envío y el usuario
termina expulsado al login perdiendo lo que cargó. En el servidor la sesión ya
está validada. Esto fue un error real del desarrollo, corregido.

### Avisos emergentes

Las server actions no pueden devolver un valor a una página que se está
revalidando. Se resuelve con una cookie de un solo uso: la acción escribe el
mensaje, el layout lo lee al renderizar, el componente `Aviso` lo muestra y
borra la cookie desde el navegador. Vida útil: 15 segundos.

---

## Decisiones y sus motivos

**Sin librería de componentes.** Un solo archivo CSS, sin dependencias que
actualizar ni que se rompan entre versiones. Para un sistema de este tamaño, el
costo de mantener un framework de estilos supera el beneficio.

**Sin librería de gráficos.** El tablero dibuja SVG y barras con CSS. Evita
sumar un paquete grande, problemas de renderizado en servidor, y da control
total sobre el aspecto.

**El PDF lo hace el navegador.** No hay generador de PDF en el servidor: la
página de la OC tiene reglas de impresión (`@media print`, tamaño A4) y el botón
llama al diálogo de impresión, desde donde se imprime o se guarda como PDF. Una
dependencia menos y el resultado es idéntico.

**Los avisos por correo quedaron preparados pero apagados.** La decisión fue no
depender de un proveedor de correo. El código está en `supabase/functions/` y la
tabla `configuracion` guarda los destinatarios. Activarlo requiere una cuenta en
un servicio de envío y desplegar la función.

**Categorías abiertas con curación posterior.** Cualquiera puede crear una
categoría al cargar un pedido, porque bloquearlo lleva a que la gente escriba
todo en "Otros" y se pierde el dato. El riesgo es la duplicación ("Cables" y
"cables"), y se compensa con la pantalla de fusión del superusuario.

---

## Modificaciones frecuentes

**Agregar un campo al pedido**

1. `alter table pedidos add column mi_campo tipo;`
2. Agregarlo al formulario en `app/pedidos/nuevo/FormularioPedido.tsx`
3. Incluirlo en el insert de `crearPedido()` en `app/acciones.ts`
4. Mostrarlo donde corresponda

**Agregar un estado**

1. `alter type estado_pedido add value 'nuevo_estado';` (fuera de transacción)
2. Actualizar `PASOS` en `app/components/EstadoPedido.tsx`
3. Agregar el estilo `.badge.nuevo_estado` en `globals.css`
4. Revisar la política `gestionar_pedidos`: define quién puede llegar a él
5. Agregar la acción en `app/aprobacion/page.tsx`

**Cambiar quién puede hacer qué**

Solo en las políticas RLS. Cambiarlo únicamente en la interfaz esconde el botón
pero no impide la operación.

**Cambiar el aspecto de la orden de compra**

`app/oc/[id]/page.tsx` para la estructura, y el bloque `.oc` de `globals.css`
para el estilo. Probar siempre con la vista previa de impresión: la pantalla y
el papel no se ven igual.
