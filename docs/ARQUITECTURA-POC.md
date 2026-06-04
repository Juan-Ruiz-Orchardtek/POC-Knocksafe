# POC Knocksafe — Documento de arquitectura e investigación

> **Propósito:** entender cómo administrar un monorepo Nx y validar si NestJS (con microservicios) es viable antes de decidir la arquitectura definitiva del proyecto.

---

## Tabla de contenidos

1. [Visión general propuesta](#1-visión-general-propuesta)
2. [Nx Monorepo: apps vs libs](#2-nx-monorepo-apps-vs-libs)
3. [Compartir código entre apps y libs](#3-compartir-código-entre-apps-y-libs)
4. [Pipeline CI/CD: ¿se puede dividir?](#4-pipeline-cicd-se-puede-dividir)
5. [NestJS y microservicios](#5-nestjs-y-microservicios)
6. [Cloud: Vercel vs infraestructura de producción](#6-cloud-vercel-vs-infraestructura-de-producción)
7. [Autenticación: NestJS vs Supabase vs Auth0](#7-autenticación-nestjs-vs-supabase-vs-auth0)
8. [Storage: Supabase → AWS S3](#8-storage-supabase--aws-s3)
9. [Estructura sugerida para el POC](#9-estructura-sugerida-para-el-poc)
10. [Decisiones pendientes y criterios de éxito](#10-decisiones-pendientes-y-criterios-de-éxito)

---

## 1. Visión general propuesta

El objetivo del POC es simular un escenario real:


| Capa           | Cantidad                | Rol                                          |
| -------------- | ----------------------- | -------------------------------------------- |
| **Frontend**   | 2 apps independientes   | Ej. portal cliente + panel admin             |
| **Backend**    | Varios servicios NestJS | API pública (gateway) + servicios de dominio |
| **Compartido** | Librerías Nx            | DTOs, tipos, utilidades, contratos           |


```
┌─────────────────────────────────────────────────────────────┐
│                     Nx Monorepo (Git)                       │
├─────────────────────────────────────────────────────────────┤
│  apps/                                                      │
│    ├── web-client/          (React/Next — deployable)       │
│    ├── web-admin/           (React/Next — deployable)       │
│    ├── api-gateway/         (NestJS HTTP — deployable)      │
│    ├── auth-service/        (NestJS — deployable)           │
│    └── notifications-service/ (NestJS — deployable)         │
├─────────────────────────────────────────────────────────────┤
│  libs/                                                      │
│    ├── shared/types/        (interfaces, enums)             │
│    ├── shared/dto/          (DTOs compartidos)              │
│    └── shared/config/       (constantes, env helpers)       │
└─────────────────────────────────────────────────────────────┘
```

**Importante:** un monorepo **no** implica un monolito desplegado. Cada `app` se construye, testea y despliega de forma independiente. Nx solo centraliza código, tooling y CI.

---

## 2. Nx Monorepo: apps vs libs

### ¿Qué es una `app`?

- Unidad **desplegable** (frontend, API, worker, gateway).
- Tiene un punto de entrada (`main.ts`, `index.html`, etc.).
- Produce un artefacto: bundle estático, contenedor Docker, binario Node, etc.
- Se ejecuta con `nx serve <app>` o `nx build <app>`.

### ¿Qué es una `lib`?

- Código **reutilizable** que **no se despliega solo**.
- Se importa desde apps u otras libs.
- Ejemplos: DTOs, validadores, clientes HTTP, componentes UI compartidos, lógica de dominio pura.
- Se testea con `nx test <lib>` pero no tiene servidor propio.

### Analogía rápida


| Concepto       | Multirepo tradicional      | Nx Monorepo                                   |
| -------------- | -------------------------- | --------------------------------------------- |
| App            | Repositorio `frontend-web` | `apps/web-client`                             |
| Lib compartida | Paquete npm `@org/types`   | `libs/shared/types`                           |
| Dependencia    | `npm install @org/types`   | `import { X } from '@knocksafe/shared/types'` |


### Grafo de dependencias

Nx construye un **project graph**: si cambias `libs/shared/dto`, Nx sabe qué apps dependen de ella y solo reconstruye/testea lo afectado.

```bash
nx graph          # visualizar dependencias
nx affected -t test   # solo tests de proyectos afectados por el diff
```

### Regla práctica

- Si **corre en producción como proceso/sitio** → `app`.
- Si **solo existe para ser importado** → `lib`.
- Si un módulo NestJS crece mucho (auth, users, billing), puede vivir como `lib` importada por una o varias apps.

---

## 3. Compartir código entre apps y libs

**Sí, es uno de los motivos principales del monorepo.**

### Qué se suele compartir


| Tipo                                 | Ubicación típica        | Consumidores           |
| ------------------------------------ | ----------------------- | ---------------------- |
| Tipos TypeScript / interfaces        | `libs/shared/types`     | Frontends + backends   |
| DTOs y schemas (Zod/class-validator) | `libs/shared/dto`       | APIs + frontends       |
| Constantes, enums de negocio         | `libs/shared/constants` | Todos                  |
| Componentes UI (si mismo framework)  | `libs/ui/components`    | web-client + web-admin |
| Lógica de dominio pura               | `libs/domain/`*         | Varios microservicios  |
| Configuración ESLint/TS              | raíz + `libs/`          | Todo el workspace      |


### Cómo funciona en Nx

1. Nx genera **path aliases** en `tsconfig.base.json`:

```json
{
  "paths": {
    "@knocksafe/shared/types": ["libs/shared/types/src/index.ts"]
  }
}
```

1. Las apps importan directamente:

```typescript
import { CreateUserDto } from '@knocksafe/shared/dto';
```

1. El bundler/webpack de cada app incluye solo lo que usa (tree-shaking según configuración).

### Límites a tener en cuenta

- **No compartir secretos** en libs (API keys, tokens).
- **Cuidado con dependencias de Node en frontends**: una lib usada en React no debería importar `@nestjs/common`.
- Solución: separar libs por scope, por ejemplo `@knocksafe/shared/types` (isomórfico) vs `@knocksafe/server/database` (solo backend).
- Usar **tags** en Nx (`scope:frontend`, `scope:backend`) + reglas ESLint para evitar imports cruzados incorrectos.

---

## 4. Pipeline CI/CD: ¿se puede dividir?

**Sí.** Nx está diseñado para pipelines incrementales y paralelos.

### Estrategias principales

#### A) `nx affected` — solo lo que cambió

```bash
nx affected -t lint,test,build --base=origin/main
```

Nx usa Git + project graph para calcular el **mínimo conjunto** de proyectos afectados. Si solo cambias `web-admin`, no rebuilds `auth-service`.

#### B) Pipeline por etapas (stages)

Ejemplo en GitHub Actions / Azure DevOps:

```
Stage 1: install + nx affected -t lint
Stage 2: nx affected -t test  (paralelo por proyecto)
Stage 3: nx affected -t build
Stage 4: deploy (solo apps afectadas)
```

#### C) Deploy independiente por app

Cada app puede tener su propio job de deploy condicionado:

```yaml
# Pseudocódigo CI
- if: affected includes 'web-client' → deploy to Vercel (web-client)
- if: affected includes 'api-gateway' → deploy to AWS ECS (api-gateway)
```

#### D) Nx Cloud (opcional)

- **Remote caching:** si CI ya buildó algo, tu máquina local reutiliza el cache.
- **Distributed Task Execution (DTE):** reparte tareas entre varios agents.

### División recomendada para este POC


| Pipeline            | Qué ejecuta                      | Cuándo                    |
| ------------------- | -------------------------------- | ------------------------- |
| **PR checks**       | `lint`, `test`, `build` affected | Cada pull request         |
| **Deploy frontend** | build + deploy `web-`*           | Merge a main, si affected |
| **Deploy backend**  | build Docker + deploy servicios  | Merge a main, si affected |
| **Nightly**         | `nx run-many -t test --all`      | Opcional, suite completa  |


### Respuesta directa

> **¿Can we split the pipeline into parts?**  
> **Sí.** Por proyecto (app/lib), por tipo de tarea (lint/test/build/deploy) y por entorno (staging/prod). Nx `affected` + tags + jobs condicionales lo hacen viable y es la práctica estándar.

---

## 5. NestJS y microservicios

### Concepto clave: dos significados de "microservicio"

En NestJS hay que distinguir:

1. **Arquitectura de microservicios (deploy):** varios procesos independientes, cada uno con su `main.ts`, desplegados por separado. **Recomendado para producción.**
2. **Modo microservice de NestJS (transport):** un proceso que escucha por TCP, Redis, NATS, Kafka, gRPC, MQTT, etc., usando `@MessagePattern()` / `@EventPattern()` en lugar de (o además de) HTTP.

### ¿Cómo funciona el modo microservice de NestJS?

Referencia: [NestJS Microservices — Basics](https://docs.nestjs.com/microservices/basics)

```
Cliente HTTP (browser)
       │
       ▼
┌──────────────────┐     TCP/gRPC/Kafka      ┌──────────────────┐
│   API Gateway    │ ──────────────────────► │  Auth Service    │
│  (NestFactory    │                         │  @MessagePattern │
│   .create())     │ ──────────────────────► │  Notifications   │
└──────────────────┘                         └──────────────────┘
```

- **Transporters soportados:** TCP (default), Redis, NATS, MQTT, Kafka, gRPC, RMQ (RabbitMQ).
- **Patrones de mensaje:**
  - `@MessagePattern({ cmd: 'getUser' })` → request/response (como RPC).
  - `@EventPattern('user.created')` → fire-and-forget (eventos).
- **Cliente:** `ClientProxy` via `ClientsModule.register()` → `client.send()` / `client.emit()`.

### ¿Múltiples servicios en el mismo proyecto NestJS?

**Depende de qué entiendas por "mismo proyecto":**


| Escenario                                            | ¿Posible?                        | ¿Recomendado para prod?           |
| ---------------------------------------------------- | -------------------------------- | --------------------------------- |
| Varios **módulos** NestJS en una sola app HTTP       | Sí                               | Solo al inicio / monolito modular |
| Una app **híbrida** (HTTP + microservice listener)   | Sí                               | Gateway sí; dominio no            |
| Varios listeners microservice en **una** app híbrida | Sí (`connectMicroservice()` × N) | No para servicios de dominio      |
| **Varias apps Nx**, cada una un servicio NestJS      | Sí                               | **Sí — patrón recomendado**       |


#### App híbrida (gateway típico)

```typescript
const app = await NestFactory.create(AppModule);

app.connectMicroservice({
  transport: Transport.TCP,
  options: { port: 3001 },
});

await app.startAllMicroservices();
await app.listen(3000); // HTTP público
```

Referencia: [Hybrid applications](https://docs.nestjs.com/faq/hybrid-application)

#### Varias apps en el monorepo Nx (recomendado)

```bash
nx g @nx/nest:app apps/api-gateway
nx g @nx/nest:app apps/auth-service
nx g @nx/nest:app apps/notifications-service
```

Cada una:

- Tiene su `main.ts` y su Dockerfile.
- Se despliega y escala por separado.
- Comparte código vía `libs/`.

### ¿Se pueden partir endpoints en servicios distintos?

**Sí**, con dos enfoques:

#### Enfoque 1 — Microservicios NestJS (comunicación interna)

- Gateway expone REST/GraphQL al cliente.
- Gateway llama a servicios internos vía TCP/gRPC/Kafka.
- Cada servicio tiene sus `@MessagePattern` handlers.
- **Pros:** desacoplamiento real, escalado independiente.
- **Contras:** más infra (message broker o service mesh), latencia, debugging más complejo.

#### Enfoque 2 — Monolito modular + extracción gradual

- Una sola app NestJS con módulos (`AuthModule`, `UsersModule`, etc.).
- Cuando un módulo madura, se extrae a app Nx separada.
- **Pros:** más simple al inicio; migración incremental.
- **Contras:** no es microservicios desde el día 1.

### Matriz de decisión para el POC


| Pregunta                                | Respuesta                             |
| --------------------------------------- | ------------------------------------- |
| ¿NestJS soporta microservicios?         | Sí, nativamente                       |
| ¿Nx + NestJS funcionan juntos?          | Sí, plugin `@nx/nest`                 |
| ¿Varios servicios en un repo?           | Sí, varias **apps** Nx                |
| ¿Varios servicios en un solo `main.ts`? | Posible (híbrido), no ideal para prod |
| ¿Partir endpoints entre servicios?      | Sí, vía gateway + message patterns    |


### Recomendación para el POC

1. **3 apps backend:** `api-gateway` (HTTP), `auth-service`, `notifications-service` (microservice TCP o gRPC).
2. **2 apps frontend:** `web-client`, `web-admin`.
3. **2–3 libs:** `shared/types`, `shared/dto`, opcional `shared/auth`.
4. Demostrar: `nx affected`, deploy selectivo, comunicación gateway → servicio.

Esto valida Nx + NestJS sin sobrecomplicar con Kafka/K8s en la primera iteración.

---

## 6. Cloud: Vercel vs infraestructura de producción

### Preferencia del cliente: Vercel


| Ventaja                                   | Limitación                                       |
| ----------------------------------------- | ------------------------------------------------ |
| Deploy frontend excelente (Next.js, edge) | No ideal para backends NestJS long-running       |
| Preview URLs por PR                       | Timeouts en serverless (10s–60s según plan)      |
| Zero-config para frontends                | Microservicios TCP/gRPC no encajan en serverless |
| DX muy buena para equipos frontend        | Costos pueden escalar con tráfico                |


**Vercel encaja para:** `web-client`, `web-admin` (si son Next.js o SPA estáticos).

**Vercel no encaja bien para:** servicios NestJS con WebSockets persistentes, workers, colas, gRPC, TCP entre servicios.

### Preferencia equipo: algo más "prod level"

Opciones habituales para backend + microservicios:


| Plataforma                         | Perfil                              | NestJS / microservicios             |
| ---------------------------------- | ----------------------------------- | ----------------------------------- |
| **AWS** (ECS Fargate, EKS, Lambda) | Máximo control, estándar enterprise | Excelente con Docker                |
| **GCP** (Cloud Run, GKE)           | Balance simplicidad/escala          | Muy bueno con contenedores          |
| **Azure** (Container Apps, AKS)    | Ecosistema Microsoft                | Muy bueno                           |
| **Railway / Render / Fly.io**      | PaaS intermedio, buen POC→prod      | Fácil para POC                      |
| **Supabase**                       | BaaS (DB, auth, storage)            | Complemento, no reemplazo de NestJS |


### Arquitectura híbrida recomendada (realista)

```
┌─────────────┐     ┌─────────────┐
│ web-client  │     │ web-admin   │   → Vercel (frontends)
└──────┬──────┘     └──────┬──────┘
       │                   │
       └─────────┬─────────┘
                 ▼
         ┌───────────────┐
         │  API Gateway  │  → AWS ECS / Cloud Run / Railway
         └───────┬───────┘
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
┌─────────────┐    ┌─────────────────┐
│ auth-svc    │    │ notifications   │  → mismos contenedores
└─────────────┘    └─────────────────┘
       │
       ▼
┌─────────────┐    ┌─────────────┐
│ PostgreSQL  │    │ S3 / Redis  │  → AWS RDS + S3 + ElastiCache
└─────────────┘    └─────────────┘
```

### Para el POC


| Componente | Sugerencia POC                               | Producción futura         |
| ---------- | -------------------------------------------- | ------------------------- |
| Frontends  | Vercel (satisface al cliente)                | Vercel o CloudFront+S3    |
| Backends   | Railway o Docker local + 1 cloud simple      | AWS ECS Fargate o EKS     |
| DB         | Supabase Postgres (rápido) o Docker Postgres | AWS RDS                   |
| Storage    | Supabase Storage                             | AWS S3                    |
| CI         | GitHub Actions + Nx affected                 | Igual + Nx Cloud opcional |


**Conclusión:** no es Vercel **o** AWS; es **Vercel para front** + **AWS (u otro) para back**. Argumento para el cliente: Vercel brilla en frontend; backend con microservicios necesita contenedores y redes internas que Vercel no ofrece bien.

---

## 7. Autenticación: NestJS vs Supabase vs Auth0

### Opción A — Auth propio en NestJS

Implementar JWT + refresh tokens, guards, bcrypt, etc.


| Pros                 | Contras                                            |
| -------------------- | -------------------------------------------------- |
| Control total        | Más código y responsabilidad de seguridad          |
| Sin vendor lock-in   | OAuth social, MFA, recovery emails = mucho trabajo |
| Costo $0 de licencia | Auditorías, rotación de secrets, compliance manual |


**Cuándo elegir:** requisitos muy específicos, equipo con experiencia en seguridad, o política de no depender de terceros.

### Opción B — Supabase Auth

Auth gestionado + Postgres + Storage en un solo ecosistema.


| Pros                                                           | Contras                             |
| -------------------------------------------------------------- | ----------------------------------- |
| Rápido de integrar (SDK JS + JWT verificable en Nest)          | Acoplamiento al ecosistema Supabase |
| OAuth, magic links, MFA incluidos                              | Menos enterprise features que Auth0 |
| JWT estándar: Nest puede validar con `@nestjs/passport` + JWKS | Migrar después requiere plan        |
| Bueno para POC y MVPs                                          |                                     |


**Integración NestJS:** el gateway valida el JWT de Supabase (issuer + secret/JWKS). No necesitas reimplementar login en Nest si el frontend usa Supabase client.

### Opción C — Auth0 (u Okta, Cognito)

Identity Provider enterprise.


| Pros                         | Contras                      |
| ---------------------------- | ---------------------------- |
| SSO, SAML, MFA, compliance   | Costo por MAU                |
| Documentación y SDKs maduros | Curva de configuración       |
| Estándar en empresas         | Otro proveedor que gestionar |


**Integración NestJS:** `@nestjs/passport` + `passport-jwt` con JWKS de Auth0.

### Comparativa resumida


| Criterio                 | NestJS propio | Supabase     | Auth0      |
| ------------------------ | ------------- | ------------ | ---------- |
| Time-to-market POC       | Lento         | **Rápido**   | Medio      |
| Costo inicial            | Bajo          | Bajo/medio   | Medio/alto |
| OAuth / social login     | Manual        | Incluido     | Incluido   |
| Enterprise SSO           | No            | Limitado     | **Sí**     |
| Ya usan Supabase storage | —             | **Sinergia** | Neutro     |
| Verificación en NestJS   | Custom        | JWT + JWKS   | JWT + JWKS |


### Recomendación para el POC

1. **Supabase Auth** si ya están en Supabase (storage + DB) — menor fricción.
2. En NestJS solo: **validar JWT** + guards de roles; no reimplementar registro/login.
3. Si el cliente exige SSO corporativo a futuro, planificar migración a **Auth0** o **AWS Cognito** (ambos compatibles con el mismo patrón JWT en Nest).

```
Frontend → Supabase Auth (login) → obtiene JWT
Frontend → API Gateway (Authorization: Bearer <jwt>)
Gateway  → JwtAuthGuard valida token → delega a microservicios
```

---

## 8. Storage: Supabase → AWS S3

### Situación actual

Storage en Supabase (S3-compatible bajo el capó, API propia).

### ¿Se puede migrar a AWS S3?

**Sí.** Supabase Storage usa un modelo similar a S3 (buckets, objects, URLs firmadas).

### Estrategia de abstracción (recomendada desde el POC)

No acoplar la lógica de negocio a `supabase.storage` directamente. Crear una interfaz:

```typescript
// libs/shared/storage — concepto
interface StorageService {
  upload(key: string, file: Buffer, meta?: object): Promise<string>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
}
```

Implementaciones:

- `SupabaseStorageAdapter` (POC)
- `S3StorageAdapter` (producción AWS, via `@aws-sdk/client-s3`)

### Diferencias a considerar en migración


| Aspecto         | Supabase Storage            | AWS S3                          |
| --------------- | --------------------------- | ------------------------------- |
| Auth            | Supabase RLS + policies     | IAM + bucket policies           |
| URLs públicas   | Configuración bucket        | CloudFront recomendado          |
| Signed URLs     | SDK Supabase                | `@aws-sdk/s3-request-presigner` |
| Costo           | Incluido en plan Supabase   | Pay per use                     |
| Migración datos | Export/import o script sync | `aws s3 sync`                   |


### Respuesta directa

> **If we move to AWS, can we use S3?**  
> **Sí.** Es el destino natural. Con un adapter en NestJS, el cambio es principalmente de configuración e infra, no de lógica de negocio.

---

## 9. Estructura sugerida para el POC

### Fase 0 — Setup (1–2 días)

```bash
npx create-nx-workspace@latest knocksafe --preset=apps
cd knocksafe
nx add @nx/nest
nx add @nx/next   # o @nx/react según stack frontend
```

### Fase 1 — Scaffold (1 día)

```bash
# Frontends
nx g @nx/next:app web-client
nx g @nx/next:app web-admin

# Backends
nx g @nx/nest:app api-gateway --frontendProject=web-client
nx g @nx/nest:app auth-service
nx g @nx/nest:app notifications-service

# Shared
nx g @nx/js:lib shared/types
nx g @nx/js:lib shared/dto
```

### Fase 2 — Validaciones del POC


| #   | Experimento                                          | Qué demuestra            |
| --- | ---------------------------------------------------- | ------------------------ |
| 1   | Cambiar solo `web-admin` → `nx affected -t build`    | Pipeline dividido        |
| 2   | DTO en `libs/shared/dto` usado en gateway + frontend | Código compartido        |
| 3   | Gateway HTTP llama a `auth-service` vía TCP          | Microservicios NestJS    |
| 4   | Login con Supabase + JWT validado en gateway         | Auth integrada           |
| 5   | Upload archivo vía adapter abstracto                 | Storage desacoplado      |
| 6   | Deploy web a Vercel + gateway a Railway/Docker       | Cloud híbrido            |
| 7   | `nx graph`                                           | Comprensión del monorepo |


### Fase 3 — No hacer en el POC (evitar scope creep)

- Kubernetes completo
- Kafka / service mesh
- Multi-región
- Auth0 + migración simultánea
- Más de 2–3 microservicios

---

## 10. Decisiones pendientes y criterios de éxito

### Decisiones que el POC debe desbloquear


| #   | Pregunta                       | Señal verde (GO)                                           | Señal roja (replantear)                                |
| --- | ------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------ |
| 1   | ¿Nx aporta valor vs multirepo? | CI 50%+ más rápido con affected; sharing DTOs sin fricción | Equipo confundido con graph; imports circulares        |
| 2   | ¿NestJS microservices viables? | Gateway → servicio estable en local y deploy               | Debugging transport insoportable; latencia inaceptable |
| 3   | ¿2 frontends en monorepo OK?   | Componentes/tipos compartidos sin duplicar                 | Builds siempre reconstruyen todo (mal config inputs)   |
| 4   | ¿Cloud híbrido aceptable?      | Cliente acepta Vercel front + AWS/Railway back             | Cliente exige todo en Vercel (limitación backend)      |
| 5   | ¿Supabase Auth suficiente?     | JWT flow claro; roles en Nest                              | Requisito SSO enterprise inmediato → Auth0             |


### Criterios de éxito del POC

- Monorepo Nx con al menos 2 frontends + 2 backends desplegables por separado
- Al menos 1 lib compartida consumida por front y back
- CI con `nx affected` funcionando
- Comunicación gateway → microservicio demostrada
- Auth end-to-end (login frontend → API protegida)
- Documento de lecciones aprendidas (este doc + notas post-POC)

### Próximo paso

Una vez leído y acordado este documento:

1. Confirmar stack frontend (Next.js vs React SPA).
2. Confirmar transport interno POC (TCP simple vs gRPC).
3. Confirmar entorno deploy POC (Railway vs Docker local).
4. Ejecutar Fase 0 del scaffold.

---

## Referencias

- [Nx — Run only affected tasks](https://nx.dev/docs/features/ci-features/affected)
- [Nx — NestJS plugin](https://nx.dev/docs/technologies/node/nest/introduction)
- [NestJS — Microservices basics](https://docs.nestjs.com/microservices/basics)
- [NestJS — Hybrid applications](https://docs.nestjs.com/faq/hybrid-application)
- [Supabase Auth — JWT verification](https://supabase.com/docs/guides/auth/jwts)
- [AWS S3 — SDK for JavaScript v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-examples.html)

---

*Documento generado para el POC Knocksafe — OrchardTek. Revisar antes de iniciar implementación.*