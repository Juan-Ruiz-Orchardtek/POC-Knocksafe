# Knocksafe POC

Monorepo Nx de prueba de concepto: CRUD de **organizaciones** y **reps** (vendedores), auth propio en NestJS, dos frontends Next.js y MySQL local.

## Arquitectura (resumen)

```
apps/
  web-client/              Next.js · portal rep (fondo azul claro)
  web-admin/               Next.js · consola admin (fondo verde claro)
  auth-service/            NestJS · login admin/rep + JWT (3001)
  organizations-service/   NestJS · CRUD organizaciones (3002)
  reps-service/            NestJS · CRUD reps + perfil (3003)

libs/
  shared/types/            Interfaces TypeScript compartidas
  shared/dto/              DTOs con class-validator (backend)
  shared/database/         Entidades TypeORM + config MySQL
  shared/auth/             JWT strategy y guards compartidos
  ui/components/           Header, Footer, Button, AppShell (frontends)
```

Comunicación entre servicios: **HTTP** (ej. `reps-service` valida organizaciones llamando a `organizations-service`).

Cada servicio expone `/health` y sus propios endpoints para probar con Postman.

---

## Requisitos previos

| Herramienta | Versión recomendada |
|-------------|---------------------|
| Node.js | 20.x o 22.x LTS |
| npm | 10+ (incluido con Node) |
| MySQL | Instancia local (recomendado) u opcional vía Docker |
| Docker Desktop | Solo si quieres correr backends/fronts en contenedores |
| Git | Cualquier versión reciente |

Opcional: [Nx CLI global](https://nx.dev) (`npm i -g nx`) — también funciona con `npx nx`.

---

## Instalación

### Windows

1. Instalar [Node.js LTS](https://nodejs.org/) (marca la opción "Add to PATH").
2. Instalar [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/).
3. Verificar:

```powershell
node -v
npm -v
docker -v
```

4. Clonar/abrir el repo y instalar dependencias:

```powershell
cd c:\Proyectos\OrchardTek\POC-Knocksafe
npm install --legacy-peer-deps
```

### macOS

1. Instalar Node (Homebrew):

```bash
brew install node
```

2. Instalar [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/).
3. Verificar:

```bash
node -v
npm -v
docker -v
```

4. Instalar dependencias:

```bash
cd POC-Knocksafe
npm install --legacy-peer-deps
```

---

## Base de datos (MySQL local — recomendado)

Usa el MySQL que ya tienes en tu máquina. No hace falta levantar MySQL en Docker.

### 1. Configurar `.env`

**Un solo archivo en la raíz del monorepo:**

```
POC-Knocksafe/
  .env          ← aquí (ya existe; solo edita DB_PASSWORD)
  apps/
  libs/
```

No hace falta un `.env` por servicio. Los tres backends cargan este archivo vía `libs/shared/database` al iniciar.

Edita `.env` con **tu** usuario y contraseña de MySQL:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_de_mysql
DB_NAME=knocksafe
DB_SYNC=true
```

**¿Qué es `DB_SYNC`?** Con `true`, TypeORM crea o actualiza las tablas (`organizations`, `admins`, `reps`) según las entidades al arrancar cada servicio. Útil en el POC; en producción pon `false` y usa migraciones o `database/init.sql`.

### 2. Crear base de datos y tablas

```bash
npm run db:init
```

Ejecuta `database/init.sql` contra tu MySQL. Si prefieres el cliente CLI:

```bash
mysql -u root -p < database/init.sql
```

### 3. Seed de usuarios

Al arrancar `auth-service`, se crean automáticamente el admin y el rep de prueba si no existen.

### MySQL en Docker (opcional)

Solo si no quieres usar tu MySQL local:

```bash
npm run docker:mysql
```

En ese caso usa en `.env`: `DB_USER=knocksafe`, `DB_PASSWORD=knocksafe`.

---

## Ejecutar en desarrollo (recomendado)

Asegúrate de tener `.env` configurado y haber ejecutado `npm run db:init` (una vez).

Terminales — servicios (desde la raíz del repo):

```bash
npx nx serve auth-service
npx nx serve organizations-service
npx nx serve reps-service
npx nx serve web-client --port=4200
npx nx serve web-admin --port=4201
```

Los servicios leen `.env` automáticamente. Sin `.env`, usan `localhost` y usuario `knocksafe` (poco habitual en local).

| Servicio | URL |
|----------|-----|
| auth-service | http://localhost:3001 |
| organizations-service | http://localhost:3002 |
| reps-service | http://localhost:3003 |
| web-client | http://localhost:4200 |
| web-admin | http://localhost:4201 |

El `auth-service` hace **seed** al arrancar si la BD está vacía.

---

## Usuarios de prueba (seed)

| Rol | Email | Password |
|-----|-------|----------|
| Admin | `admin@knocksafe.com` | `Admin123!` |
| Rep | `rep@knocksafe.com` | `Rep123!` |

Organización seed: **Acme Corp**.

---

## Probar con las webs

### Admin (`web-admin` · fondo verde claro)

1. Abrir http://localhost:4201
2. Login con admin
3. Crear organizaciones y reps

### Rep portal (`web-client` · fondo azul claro)

1. Abrir http://localhost:4200
2. Login con rep
3. Ver perfil (incluye organización vía `reps-service` → HTTP → `organizations-service`)

Ambas apps comparten componentes de `libs/ui/components` (Header, Footer, Button, AppShell).

---

## Probar con Postman

Importar:

```
postman/knocksafe-poc.postman_collection.json
```

Orden sugerido:

1. **Auth Service → Admin Login** (guarda `adminToken`)
2. **Organizations → Create Organization**
3. **Reps → Create Rep**
4. **Auth Service → Rep Login** (guarda `repToken`)
5. **Reps → My Profile (rep)**

La carpeta **Suggested Flow** repite el flujo completo.

---

## Probar servicios de forma independiente

Cada servicio tiene health check:

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

Endpoints principales:

| Servicio | Método | Ruta | Auth |
|----------|--------|------|------|
| auth | POST | `/auth/admin/login` | — |
| auth | POST | `/auth/rep/login` | — |
| orgs | GET | `/organizations` | — |
| orgs | POST | `/organizations` | Admin JWT |
| orgs | PUT | `/organizations/:id` | Admin JWT |
| orgs | DELETE | `/organizations/:id` | Admin JWT |
| reps | GET | `/reps` | Admin JWT |
| reps | POST | `/reps` | Admin JWT |
| reps | GET | `/reps/me` | Rep JWT |
| reps | GET | `/reps/:id` | Admin JWT |
| reps | PUT | `/reps/:id` | Admin JWT |
| reps | DELETE | `/reps/:id` | Admin JWT |

JWT: header `Authorization: Bearer <token>`.

---

## Docker (stack completo, opcional)

Con Docker Desktop en marcha, los contenedores usan **tu MySQL del host** (`host.docker.internal`). Pasa credenciales:

```bash
# PowerShell
$env:DB_USER="root"; $env:DB_PASSWORD="tu_password"; docker compose up --build

# bash
DB_USER=root DB_PASSWORD=tu_password docker compose up --build
```

MySQL en contenedor (alternativa): `docker compose --profile docker-db up --build`

Parar:

```bash
npm run docker:down
```

---

## Código compartido (qué demuestra el POC)

**Backend** — cambiar un DTO en `libs/shared/dto` afecta a todos los servicios que lo importan. Ejemplo: `CreateRepDto` usado en `reps-service` y validado con las mismas reglas.

**Frontend** — `Button`, `Header`, `Footer` y `AppShell` viven en `libs/ui/components` e importan:

```tsx
import { Button, AppShell } from '@knocksafe/ui/components';
```

**Nx affected** — tras el primer commit, probar qué rebuilds un cambio:

```bash
npx nx affected -t build --base=HEAD~1
```

---

## Build de producción

```bash
npx nx run-many -t build --all
```

---

## Documentación adicional

- [docs/ARQUITECTURA-POC.md](./docs/ARQUITECTURA-POC.md) — investigación de arquitectura previa al POC

---

## Notas

- Auth 100% en código NestJS (bcrypt + JWT). Sin Auth0 ni Supabase.
- `DB_SYNC=true` en POC sincroniza entidades TypeORM (no usar en producción).
- Imágenes/assets omitidos a propósito; UI minimalista sin dependencias de diseño externas.
