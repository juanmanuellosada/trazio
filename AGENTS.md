# Trazio — AGENTS.md

Gestor de tareas personal. Web app en español, para Argentina.

Este archivo describe el stack, la estructura y los comandos. Es portable entre
agentes. Las reglas específicas de Claude Code están en `CLAUDE.md`.

---

## Qué es Trazio

Un gestor de tareas **personal**: una sola persona por cuenta, sin equipos, sin
compartir, sin gamificación. Cada cuenta ve únicamente lo suyo.

La propuesta central: **tu día completo en una sola pantalla** — lo que tenés que
hacer, lo que querés sostener y lo que ya está agendado.

El detalle completo del producto está en `docs/product-spec.md`.

---

## Stack

| Capa | Tecnología | Notas |
| --- | --- | --- |
| Runtime | Node 24 LTS | |
| Framework | Next.js 16 (App Router) | Landing con SSR + app privada como cliente, React 19 |
| Lenguaje | TypeScript 5.9+ | `strict: true` |
| Estilos | Tailwind CSS v4 | |
| Gestor de paquetes | pnpm 11 | |
| Componentes | shadcn/ui | Instalar por componente, no la librería entera |
| Base de datos | Supabase (Postgres) | RLS obligatorio en todas las tablas |
| Auth | Supabase Auth | Email/contraseña + Google OAuth |
| Email | Resend | Confirmación de cuenta y reset de contraseña |
| Tiempo real | Supabase Realtime | Sincronización entre pestañas y dispositivos |
| Jobs | Supabase Edge Functions + pg_cron | Disparo de recordatorios |
| Hosting | Vercel | Deploy desde GitHub |

### Librerías decididas

- **TanStack Query** — estado del servidor y optimistic updates.
- **dnd-kit** — drag & drop (reordenar tareas, secciones, proyectos).
- **Tiptap** — editor de texto enriquecido para la descripción de tareas y
  comentarios. Además del `starter-kit`, `extension-highlight` (resaltado),
  `extension-task-list` y `extension-task-item` (listas de tareas), y
  `extension-table` + `extension-table-row` + `extension-table-cell` +
  `extension-table-header` (tabla) — decisión D31.
- **emojibase-data** — datos de emojis categorizados y con texto de búsqueda
  en español, para el selector de emojis del modal de proyecto; se importa
  solo el locale español y de forma diferida al abrir el selector —
  decisión D31.
- **Zod** — validación de entrada, compartida entre cliente y servidor.
- **React Hook Form** — formularios, junto con Zod; el esquema se define una vez
  en `lib/validation/` y se comparte entre cliente y servidor.
- **date-fns** + **date-fns-tz** — fechas y zonas horarias.
- **rrule** — recurrencia según RFC 5545.
- **Vitest** — tests unitarios.
- **Testing Library** (`@testing-library/react`, `@testing-library/jest-dom`,
  `@testing-library/user-event`) — tests de componente, con `jsdom` como entorno.
- **Playwright** — tests end-to-end.

No agregar librerías fuera de esta lista sin decisión explícita. Si hace falta
una nueva, registrarla en `docs/decisions.md`.

---

## Restricciones no negociables

Estas decisiones ya se tomaron. No re-litigar sin hablarlo con el dueño del proyecto.

1. **100% online.** No hay modo offline, no hay caché de datos, no hay cola de
   mutaciones. Sin conexión, la app no funciona y lo dice claramente.
2. **PWA acotada.** Instalable (manifest + íconos) y service worker **solo** para
   push notifications. Nada de caché de assets para uso offline.
3. **Español únicamente.** No hay i18n, no hay archivos de traducción, no se
   planea inglés. Escribir los textos directamente en el código.
4. **El título de una tarea es texto plano.** Sin markdown, sin links, sin
   formato. La descripción y los comentarios sí son enriquecidos.
5. **Sin exportar ni importar datos.** No entra en ninguna versión.
6. **Una persona por cuenta.** No existe compartir, invitar ni asignar a terceros.

---

## Estructura del proyecto

```
app/
  (marketing)/            Landing pública, SSR
  (auth)/                 Registro, login, callback de OAuth
  (app)/                  App privada, protegida por middleware
    bandeja/
    hoy/
    proximos/
    proyecto/[id]/
    tarea/[id]/
    completado/
    etiquetas/
    filtros/
    habitos/
    configuracion/
  api/                    Route handlers
components/
  ui/                     shadcn/ui
  tasks/
  projects/
  layout/
lib/
  supabase/               Clientes de servidor y navegador, middleware
  parser/                 Lenguaje natural en español y lenguaje de filtros
  recurrence/             Lógica de RRULE
  validation/             Esquemas de Zod
supabase/
  migrations/             SQL versionado
  functions/              Edge functions
docs/                     Especificaciones (ver más abajo)
openspec/                 Planificación SDD
```

---

## Comandos

```bash
pnpm dev                  # desarrollo local
pnpm build                # build de producción
pnpm lint                 # eslint
pnpm typecheck            # tsc --noEmit
pnpm test                 # vitest
pnpm test:e2e             # playwright
pnpm db:migrate           # aplicar migraciones a Supabase
pnpm db:types             # regenerar tipos de TypeScript desde el esquema
```

Antes de dar por terminada cualquier tarea: `pnpm lint && pnpm typecheck && pnpm test`.

---

## Documentación del proyecto

| Archivo | Contiene |
| --- | --- |
| `docs/product-spec.md` | El funcional completo: entidades, vistas, flujos, reglas |
| `docs/data-model.md` | Tablas, relaciones, índices, políticas de RLS |
| `docs/landing.md` | Especificación de la landing page |
| `docs/design-system.md` | Sistema visual: paleta, tipografía, espaciado, estados de interacción |
| `docs/roadmap.md` | Las cuatro fases y sus criterios de aceptación |
| `docs/decisions.md` | Decisiones tomadas y su razón |
| `docs/setup-google-calendar.md` | Paso a paso de credenciales en Google Cloud (fase 4) |

---

## Convenciones

- Archivos de componentes en `kebab-case.tsx`. Componentes exportados en `PascalCase`.
- Server Components por defecto. `'use client'` solo donde hace falta interactividad,
  y lo más abajo posible en el árbol.
- Toda tabla nueva nace con RLS habilitado y su política escrita en la misma migración.
- Nunca exponer la `service_role` key al cliente.
- Los textos de interfaz van en español rioplatense, tratamiento de "vos".
- Sin comentarios de código que expliquen lo obvio. Comentar el porqué, no el qué.
