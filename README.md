# Compras RG-RVA

Sistema interno de pedidos de compra de **Radio Victoria**. Cubre el circuito
completo: alguien pide algo, alguien lo aprueba, compras lo gestiona y entrega,
y queda una orden de compra imprimible y un registro histórico para analizar el
gasto.

---

## Qué resuelve

Antes: los pedidos iban por planilla de Excel, correo o mensajes sueltos. No
había forma de saber en qué estado estaba un pedido sin preguntar, ni de saber
cuánto se gastó en el año por área o por rubro.

Ahora:

- Cada pedido tiene un número, un estado y un responsable en cada etapa.
- Quien pide ve el estado sin preguntarle a nadie.
- Quien aprueba ve el detalle completo antes de decidir, y deja constancia del
  motivo cuando rechaza.
- Compras registra costo y proveedor, y marca la entrega.
- La orden de compra se imprime en A4 con membrete.
- El tablero muestra en qué se gasta, por área, categoría y proveedor, y cuánto
  se tarda en aprobar y en entregar.

---

## El circuito

```
                         ┌──────────────┐
                         │  PENDIENTE   │ ← lo crea el solicitante
                         └──────┬───────┘
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
             ┌───────────┐ ┌─────────┐ ┌───────────┐
             │ APROBADO  │ │RECHAZADO│ │ CANCELADO │
             └─────┬─────┘ └─────────┘ └───────────┘
                   │        (con motivo)  (con motivo)
                   ▼
            ┌─────────────┐
            │  ENTREGADO  │ ← lo marca compras
            └─────────────┘
```

Una vez aprobado, existe una orden de compra en circulación: el solicitante ya
no puede cancelarlo por su cuenta. Solo compras o quien aprueba pueden hacerlo.

---

## Roles

| Rol | Puede |
|---|---|
| **solicitante** | Cargar pedidos · editar y cancelar los propios mientras están pendientes · ver el estado de los suyos |
| **compras** | Todo lo del solicitante · ver todos los pedidos · cargar costo y proveedor · marcar entregas · cancelar · imprimir OC · ver el tablero |
| **aprobador** | Todo lo del solicitante · ver todos los pedidos · aprobar y rechazar · cancelar · ver el tablero |
| **superusuario** | Todo lo anterior · administrar personas, áreas y categorías · blanquear contraseñas |

El rol lo asigna el superusuario desde la pantalla de Perfiles. Quien crea su
cuenta entra siempre como `solicitante` con área "Sin asignar".

---

## Tecnología

| Pieza | Qué es | Por qué |
|---|---|---|
| **Next.js 14** (App Router) | Framework web, React con renderizado en servidor | Una sola base de código para pantallas y lógica de servidor |
| **Supabase** | PostgreSQL + autenticación + API | Base relacional de verdad, con la autorización dentro de la propia base |
| **TypeScript** | Tipado estático | Menos errores en tiempo de ejecución |
| **Vercel** (opcional) | Hosting | Despliegue automático con cada push. Se puede reemplazar por un servidor propio |

No hay librería de componentes ni framework de CSS: los estilos son un único
archivo `app/globals.css`, sin dependencias que mantener.

---

## Documentación

| Documento | Para quién |
|---|---|
| [docs/INSTALACION-LOCAL.md](docs/INSTALACION-LOCAL.md) | Sistemas. Cómo desplegar en un servidor propio, con o sin Supabase local |
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Sistemas y desarrollo. Cómo está armado, la base de datos, la seguridad |
| [docs/MANUAL-USUARIO.md](docs/MANUAL-USUARIO.md) | Todo el personal. Cómo se usa, pantalla por pantalla |
| [docs/OPERACION.md](docs/OPERACION.md) | Sistemas. Copias de seguridad, mantenimiento, problemas frecuentes |
| [supabase/migraciones/esquema-completo.sql](supabase/migraciones/esquema-completo.sql) | Sistemas. Recrea la base desde cero |

---

## Arranque rápido (desarrollo)

```bash
npm install
cp .env.example .env.local     # completar las claves
npm run dev                    # http://localhost:3000
```

Variables necesarias:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # solo para blanquear contraseñas
```

Ver [docs/INSTALACION-LOCAL.md](docs/INSTALACION-LOCAL.md) para el detalle.

---

## Estado del proyecto

**En producción.** Funcionalidad pendiente identificada y no implementada:

- Avisos por correo (código preparado en `supabase/functions/`, sin activar)
- Entrega parcial: hoy la entrega se marca por pedido completo, no por ítem
- Exportar el tablero a Excel
- Adjuntar presupuestos del proveedor al pedido
- Mostrar el historial de estados en pantalla (se registra, pero no se muestra)
- Fecha de necesidad y prioridad en el pedido
