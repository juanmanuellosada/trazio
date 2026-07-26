## ADDED Requirements

### Requirement: Versiones fijadas de la plataforma

El proyecto SHALL fijar Node 24 LTS (declarado en `.nvmrc` y en `engines` de
`package.json`), Next.js 16 con App Router, React 19, TypeScript 5.9 o superior
con `strict` habilitado, Tailwind v4 y pnpm 11. Estas versiones SHALL quedar
congeladas en `package.json` al momento del scaffolding. Como Tailwind v4
configura el tema por CSS y no por `tailwind.config.js`, shadcn/ui SHALL
instalarse y configurarse siguiendo ese esquema por CSS, y esa instalación
SHALL verificarse contra la documentación de `context7` o la skill
`vercel:shadcn` en lugar de improvisarse.

#### Scenario: El scaffolding declara las versiones fijadas

- **WHEN** se inspecciona el `package.json` y el `.nvmrc` generados por el scaffolding
- **THEN** `.nvmrc` contiene una versión de la línea Node 24 LTS
- **AND** `engines.node` en `package.json` exige la línea Node 24 LTS
- **AND** las dependencias `next`, `react`, `react-dom` y `typescript` resuelven a
  Next.js 16, React 19 y TypeScript 5.9 o superior respectivamente
- **AND** `tsconfig.json` tiene `"strict": true`
- **AND** Tailwind está configurado en su versión 4

#### Scenario: shadcn/ui se instala componente por componente

- **WHEN** se agrega un componente de interfaz nuevo al proyecto
- **THEN** se instala con el comando de shadcn/ui para ese componente puntual
- **AND** no se agrega la librería completa de shadcn/ui como una única dependencia empaquetada

#### Scenario: shadcn/ui se configura por CSS y se verifica contra la documentación

- **WHEN** se inicializa o se agrega un componente de shadcn/ui en el proyecto
- **THEN** la configuración del tema vive en CSS, no en un archivo `tailwind.config.js`
- **AND** esa instalación se verifica contra `context7` o la skill `vercel:shadcn`, no se improvisa

### Requirement: Variables de entorno de fase 1

El sistema SHALL definir exactamente las variables de entorno de fase 1:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` y `RESEND_API_KEY`.
`SUPABASE_SERVICE_ROLE_KEY` SHALL permanecer exclusivamente del lado servidor: MUST
NOT declararse con el prefijo `NEXT_PUBLIC_`, MUST NOT pasarse a un componente
cliente y MUST NOT aparecer en ningún log de la aplicación.

#### Scenario: Documentación de variables de entorno

- **WHEN** se revisa el archivo de ejemplo de variables de entorno del proyecto (por ejemplo `.env.example`)
- **THEN** figuran las cinco variables de fase 1 con su alcance (cliente+servidor o solo servidor)
- **AND** no figuran las variables de Google OAuth (fase 4) ni las de VAPID (fase 2)

#### Scenario: La service role key nunca llega al cliente

- **WHEN** se audita el código fuente en busca de referencias a `SUPABASE_SERVICE_ROLE_KEY`
- **THEN** ninguna referencia está en un archivo marcado `'use client'`
- **AND** ninguna referencia usa el prefijo `NEXT_PUBLIC_`
- **AND** ninguna llamada de logging (`console.*` o equivalente) incluye su valor

### Requirement: Estructura de carpetas del proyecto

La estructura de carpetas SHALL seguir la declarada en `AGENTS.md`, con la
corrección de que la ruta de la Bandeja de entrada dentro del grupo `(app)` SHALL
ser `app/(app)/bandeja/` y no `app/(app)/inbox/`.

#### Scenario: La ruta de la Bandeja está en español

- **WHEN** se navega a la pantalla de Bandeja de entrada de la app privada
- **THEN** la URL corresponde a `app/(app)/bandeja/`
- **AND** no existe ninguna ruta `app/(app)/inbox/`

#### Scenario: Los grupos de rutas y carpetas base existen

- **WHEN** se inspecciona el árbol del repositorio tras el scaffolding
- **THEN** existen los grupos `app/(marketing)/`, `app/(auth)/` y `app/(app)/`
- **AND** existen `components/ui/`, `components/tasks/`, `components/projects/` y `components/layout/`
- **AND** existen `lib/supabase/`, `lib/parser/` y `lib/validation/`
- **AND** existe `supabase/migrations/`
- **AND** `lib/recurrence/` no se crea en esta fase

### Requirement: Origen de los íconos de la aplicación

`logo.png` SHALL moverse de la raíz del repositorio a `public/`, y SHALL ser la
fuente a partir de la cual se derivan los íconos de la PWA.

#### Scenario: logo.png vive en public/

- **WHEN** se inspecciona el repositorio tras aplicar este cambio
- **THEN** `logo.png` está en `public/logo.png`
- **AND** no queda ninguna copia de `logo.png` en la raíz del repositorio

### Requirement: Deploy en Vercel con entornos de preview

El proyecto SHALL desplegarse en Vercel conectado al repositorio de GitHub, con un
entorno de preview generado automáticamente para cada pull request y un entorno de
producción para la rama principal.

#### Scenario: Un pull request genera un preview

- **WHEN** se abre un pull request contra la rama principal
- **THEN** Vercel genera un deployment de preview con una URL propia
- **AND** ese deployment usa las variables de entorno del entorno de preview, no las de producción

#### Scenario: La rama principal despliega a producción

- **WHEN** se mergea un pull request a la rama principal
- **THEN** Vercel dispara un deployment al entorno de producción

### Requirement: Gate de verificación antes de cerrar una tarea

Ninguna tarea de implementación SHALL darse por terminada sin que
`pnpm lint && pnpm typecheck && pnpm test` termine en verde, ejecutados con los
comandos pnpm declarados en `AGENTS.md` (`pnpm dev`, `pnpm build`, `pnpm lint`,
`pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm db:migrate`, `pnpm db:types`).

#### Scenario: El gate corre y pasa antes de cerrar una tarea

- **WHEN** se completa la implementación de una tarea de esta fase
- **THEN** ejecutar `pnpm lint && pnpm typecheck && pnpm test` termina sin errores
- **AND** la tarea no se marca como terminada si alguno de los tres comandos falla

#### Scenario: Los comandos pnpm base están disponibles

- **WHEN** se inspecciona el `package.json` generado por el scaffolding
- **THEN** existen los scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `db:migrate` y `db:types`
