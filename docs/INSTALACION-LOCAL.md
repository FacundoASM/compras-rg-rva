# Instalación en servidor local

Guía para el área de Sistemas. Al final del documento hay una lista de
verificación.

---

## Antes de empezar: elegir el escenario

El sistema tiene dos piezas separables: **la aplicación web** (Next.js) y **la
base de datos con autenticación** (Supabase). Se pueden ubicar de forma
independiente.

| Escenario | Aplicación | Base de datos | Cuándo conviene |
|---|---|---|---|
| **A** | Vercel (nube) | Supabase (nube) | Es lo que está funcionando hoy. Cero infraestructura propia |
| **B** | Servidor local | Supabase (nube) | Se quiere control del acceso a la app, sin administrar una base |
| **C** | Servidor local | Supabase local (Docker) | Todo puertas adentro. Sin dependencia de internet ni de terceros |

**Recomendación honesta:** el escenario C da autonomía total, pero el costo real
no es la instalación (es sencilla) sino el mantenimiento: copias de seguridad,
actualizaciones de seguridad, monitoreo y un plan de recuperación. Si Sistemas
no tiene capacidad de sostener eso, el escenario B da la mayor parte del control
con una fracción del trabajo.

Este documento cubre B y C.

---

## Requisitos del servidor

Para la aplicación sola (escenario B):

- Linux (Ubuntu Server 22.04 LTS o similar), Windows Server o macOS
- **Node.js 20 LTS o superior**
- 2 GB de RAM, 2 núcleos, 10 GB de disco
- Salida a internet hacia el dominio de Supabase (HTTPS, puerto 443)

Sumando Supabase local (escenario C):

- **Docker Engine 24+** y **Docker Compose v2**
- 4 GB de RAM como mínimo, 8 GB recomendado
- 40 GB de disco, más lo que crezca la base
- Git

---

## Escenario B: aplicación local, base en la nube

### 1. Instalar Node.js

Ubuntu:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version    # debe decir v20.x o superior
```

### 2. Traer el código

```bash
sudo mkdir -p /opt/compras-rg-rva
sudo chown $USER:$USER /opt/compras-rg-rva
git clone https://github.com/FacundoASM/compras-rg-rva.git /opt/compras-rg-rva
cd /opt/compras-rg-rva
npm ci
```

`npm ci` en vez de `npm install`: instala exactamente las versiones del
`package-lock.json`, sin sorpresas entre entornos.

### 3. Configurar las variables

```bash
cp .env.example .env.local
nano .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

Las tres claves salen del panel de Supabase, en **Project Settings → API**.

> **Importante:** `SUPABASE_SERVICE_ROLE_KEY` saltea todas las reglas de
> seguridad de la base. Solo se usa del lado del servidor, para que el
> superusuario pueda blanquear contraseñas. Nunca debe llegar al navegador ni
> subirse al repositorio. El archivo `.env.local` está excluido por
> `.gitignore`; verificar que siga así.

```bash
chmod 600 .env.local
```

### 4. Compilar y probar

```bash
npm run build
npm run start          # queda escuchando en el puerto 3000
```

Probar desde otra máquina de la red: `http://IP-DEL-SERVIDOR:3000`

### 5. Dejarlo como servicio

Para que arranque solo y se reinicie ante una caída:

```bash
sudo nano /etc/systemd/system/compras.service
```

```ini
[Unit]
Description=Compras RG-RVA
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/compras-rg-rva
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo chown -R www-data:www-data /opt/compras-rg-rva
sudo systemctl daemon-reload
sudo systemctl enable --now compras
sudo systemctl status compras
```

### 6. Poner Nginx adelante

Sirve para atender en el puerto 80/443 con un nombre de dominio interno y
terminar el HTTPS.

```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/compras
```

```nginx
server {
    listen 80;
    server_name compras.radiovictoria.local;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 10M;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/compras /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Agregar `compras.radiovictoria.local` al DNS interno apuntando al servidor.

**HTTPS:** aunque sea red interna, conviene. Con un certificado propio de la
organización, o con Let's Encrypt si el nombre resuelve desde afuera. Las
cookies de sesión funcionan igual por HTTP en red local, pero las contraseñas
viajan en claro.

### 7. Actualizar

```bash
cd /opt/compras-rg-rva
git pull
npm ci
npm run build
sudo systemctl restart compras
```

Conviene hacerlo fuera del horario de uso: el reinicio corta las peticiones en
curso (no las sesiones, que sobreviven).

---

## Escenario C: todo local con Supabase autoalojado

### 1. Levantar Supabase

```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

Editar `.env` y cambiar **obligatoriamente**:

| Variable | Qué es |
|---|---|
| `POSTGRES_PASSWORD` | Contraseña de la base. Larga y aleatoria |
| `JWT_SECRET` | Secreto para firmar los tokens. Mínimo 32 caracteres aleatorios |
| `ANON_KEY` / `SERVICE_ROLE_KEY` | Se generan a partir del `JWT_SECRET`. La documentación de Supabase explica cómo |
| `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` | Acceso al panel de administración |
| `SITE_URL` | `http://compras.radiovictoria.local` |

Generar secretos:

```bash
openssl rand -base64 48
```

Levantar:

```bash
docker compose up -d
docker compose ps      # todos los servicios en "healthy"
```

El panel queda en `http://IP-DEL-SERVIDOR:8000`.

> **No dejar los valores de ejemplo.** El archivo `.env.example` de Supabase
> trae claves públicas y conocidas. Un despliegue con esas claves es un
> despliegue abierto a cualquiera que llegue al puerto.

### 2. Crear el esquema

Desde el panel, sección **SQL Editor**, pegar y ejecutar el contenido de:

```
supabase/migraciones/esquema-completo.sql
```

Ese archivo crea tablas, tipos, funciones, triggers, políticas de seguridad y
los datos iniciales (áreas y categorías).

Alternativa por línea de comandos:

```bash
docker compose exec -T db psql -U postgres -d postgres \
  < /ruta/al/proyecto/supabase/migraciones/esquema-completo.sql
```

### 3. Configurar autenticación

En el panel, **Authentication → Providers → Email**:

- **Enable email provider:** activado
- **Confirm email:** **desactivado** ← imprescindible

El sistema no envía correos. Si queda activada la confirmación, nadie va a poder
completar el registro.

En **Authentication → URL Configuration**, poner en *Site URL* la dirección
interna de la app (`http://compras.radiovictoria.local`).

### 4. Apuntar la aplicación a la instancia local

En `.env.local` del proyecto:

```
NEXT_PUBLIC_SUPABASE_URL=http://compras.radiovictoria.local:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<el ANON_KEY generado>
SUPABASE_SERVICE_ROLE_KEY=<el SERVICE_ROLE_KEY generado>
```

Después seguir desde el paso 4 del escenario B (compilar, servicio, Nginx).

> La URL de Supabase la usa también el navegador de cada usuario, así que tiene
> que ser una dirección alcanzable desde las máquinas de la red, no `localhost`.

### 5. Cerrar los puertos

Con Nginx adelante, los puertos internos no deberían quedar expuestos:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3000/tcp
sudo ufw deny 8000/tcp
sudo ufw deny 5432/tcp
sudo ufw enable
```

---

## Migrar los datos desde la nube

Si el sistema ya está en uso y se quiere pasar a local sin perder lo cargado:

```bash
# 1. Exportar (la cadena de conexión está en Project Settings → Database)
pg_dump "postgresql://postgres:CLAVE@db.xxxx.supabase.co:5432/postgres" \
  --schema=public --schema=auth \
  --no-owner --no-privileges \
  -f respaldo-produccion.sql

# 2. Importar en la instancia local
docker compose exec -T db psql -U postgres -d postgres < respaldo-produccion.sql
```

Incluir el esquema `auth` es lo que preserva los usuarios y sus contraseñas. Si
se omite, todos tienen que registrarse de nuevo y se pierde el vínculo con los
pedidos ya cargados.

**Verificar después de migrar:**

```sql
select count(*) from pedidos;
select count(*) from auth.users;
select nombre, rol from perfiles where rol = 'superusuario';
```

---

## Primer superusuario

Sin esto no hay quien administre el sistema.

1. La persona entra a la app y crea su cuenta con "Crear cuenta".
2. Ejecutar en el SQL Editor:

```sql
update perfiles
set rol = 'superusuario',
    nombre = 'Nombre Apellido',
    area = 'Sistemas'
where id = (select id from auth.users
            where email = 'correo@radiovictoria.com.ar');
```

3. Esa persona recarga la app y ya tiene el menú de administración.

De ahí en más todo se administra desde la interfaz.

---

## Personalizar los datos de la empresa

En `lib/empresa.ts` están los datos que salen en el encabezado de la orden de
compra. Completar antes de poner en producción:

```typescript
export const EMPRESA = {
  nombre: "Radio Victoria",
  razonSocial: "Radio Victoria S.A.",
  cuit: "30-XXXXXXXX-X",
  domicilio: "Calle 123, Río Grande, Tierra del Fuego",
  telefono: "+54 2964 XXXXXX",
  email: "compras@radiovictoria.com.ar",
  web: "radiovictoria.com.ar",
};
```

El logo es `public/rv-logo.jpg`. Para cambiarlo, reemplazar el archivo
manteniendo el nombre, y ajustar `width`/`height` en `app/layout.tsx` y
`app/oc/[id]/page.tsx` si cambian las proporciones.

Después de cualquier cambio: `npm run build` y reiniciar el servicio.

---

## Lista de verificación

**Instalación**

- [ ] Node.js 20+ instalado
- [ ] Código clonado y `npm ci` sin errores
- [ ] `.env.local` con las tres variables, permisos 600
- [ ] `npm run build` termina sin errores
- [ ] La app responde en el puerto 3000

**Escenario C**

- [ ] Todos los secretos de Supabase cambiados (ninguno de ejemplo)
- [ ] Contenedores en estado "healthy"
- [ ] Esquema creado y verificado
- [ ] "Confirm email" desactivado
- [ ] Site URL apuntando a la dirección interna

**Puesta en marcha**

- [ ] Servicio systemd activo y habilitado al arranque
- [ ] Nginx sirviendo en el nombre interno
- [ ] Nombre resuelto en el DNS interno
- [ ] Firewall cerrando los puertos internos
- [ ] Primer superusuario designado y probado
- [ ] Datos de la empresa completados en `lib/empresa.ts`

**Antes de anunciarlo al personal**

- [ ] Copias de seguridad automáticas configuradas (ver OPERACION.md)
- [ ] Restauración de una copia probada en un entorno de prueba
- [ ] Circuito completo probado: pedido → aprobación → costo → entrega → OC impresa
- [ ] Probado desde un celular en la red
