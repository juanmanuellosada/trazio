## Why

Trazio hoy es solo documentación: siete especificaciones y un commit, sin una línea de código. La fase 1 del roadmap existe para cerrar esa brecha con un objetivo concreto y verificable: *"que puedas usar Trazio todos los días para tus tareas reales, y que alguien más pueda registrarse y hacer lo mismo."*

Es la única fase que no se puede recortar. Sin auth, esquema con RLS, tareas y vistas no hay producto que probar; y sin el parser de lenguaje natural no hay diferencial que justifique que alguien migre desde otra herramienta. Las tres fases siguientes dependen enteramente de que esta quede completa: el roadmap es explícito en que *"no se empieza la siguiente con la anterior a medias."*

## What Changes

**Infraestructura**
- Proyecto Next.js (App Router) con TypeScript `strict`, Tailwind y shadcn/ui instalado por componente.
- Supabase conectado: esquema completo de fase 1, migraciones versionadas, RLS habilitado en la misma migración que crea cada tabla, tipos de TypeScript generados.
- Deploy en Vercel desde GitHub con entornos de preview.
- Se fijan versiones exactas de Node, Next.js, React, TypeScript y Tailwind, hoy indefinidas en toda la documentación.
- Se documenta el conjunto de variables de entorno de Supabase y Resend (las de Google quedan para la fase 4; VAPID para la fase 2).

**Autenticación**
- Registro con nombre, correo y contraseña de 8 caracteres o más.
- Registro e inicio de sesión con Google.
- Confirmación de correo vía Resend.
- Recuperación de contraseña funcionando de punta a punta, con página de reset real.
- Middleware que protege las rutas privadas.
- Trigger que al registrarse crea perfil, preferencias y Bandeja de entrada, con la Bandeja protegida a nivel base de datos contra borrado y archivado.

**Producto**
- Proyectos: crear, editar, anidar hasta 3 niveles, favoritos, archivar, eliminar con confirmación que muestra cuántas tareas se pierden, reordenar.
- Secciones: crear, renombrar, reordenar, colapsar, eliminar (sus tareas quedan sin sección, no se borran).
- Tareas: crear, editar, completar, descompletar, duplicar, mover, reordenar, eliminar, copiar enlace directo.
- Subtareas anidadas sin límite de niveles.
- Prioridades, fecha de vencimiento con hora opcional, duración estimada, fecha límite.
- Descripción con Tiptap.
- Vistas Bandeja de entrada, Hoy, Proyecto y Completado, **solo en modo lista**.
- Alta rápida con parseo de lenguaje natural en español, según el contrato de `docs/parser-test-cases.md`.
- Etiquetas, alcance mínimo: se crea una etiqueta por `#` desde el alta rápida, se asigna a la tarea y se muestra el chip; desde el detalle de la tarea se agregan o quitan etiquetas, reemplazando el conjunto completo al editar. La administración de etiquetas, la página propia por etiqueta, las favoritas y el acceso "Etiquetas" del panel lateral quedan para fase 2.
- Configuración: perfil, tema, zona horaria, formatos de fecha y hora, día de inicio de semana.
- Sincronización en tiempo real entre pestañas y dispositivos.
- Optimistic updates en completar, editar, mover y reordenar, con reversión y aviso si el servidor rechaza.
- Estado sin conexión: la app avisa y bloquea la escritura, sin prometer nada que no pueda cumplir.

**Landing**
- Landing pública según `docs/landing.md`: hero, demo del parser en vivo, problema, funcionalidades, lo que viene, cierre y pie. Server Components enteros salvo la demo del parser, única isla cliente.

**PWA**
- Manifest, íconos e instalación desde el navegador con apertura a pantalla completa. Hace falta un service worker registrado para que los navegadores basados en Chromium ofrezcan la instalación, así que se crea uno mínimo: sin manejador de `fetch` y sin caché de ningún tipo, para no violar D1. En la fase 2 ese mismo archivo suma el manejador de push.

**Correcciones de documentación** (decididas por el dueño del proyecto, entran en este cambio)
- `docs/roadmap.md`: el criterio de aceptación deja de decir *"los 30 casos de prueba del spec"* y pasa a apuntar a `docs/parser-test-cases.md`, que tenía 53 casos y queda en 56 al sumarse los tres nuevos. Se corrige el mismo número desactualizado en la línea 6 de ese archivo.
- `docs/product-spec.md` §6: referencia cruzada al contrato del parser, sin duplicar la tabla. Se reformula el blockquote de la regla crítica, que hoy afirma que *"esta mañana"* no se interpreta cuando el caso 45 sí emite `due_date = hoy`.
- `docs/landing.md`: el bloque *"Atajos de teclado — sin soltar las manos"* sale de la grilla de Funcionalidades (los atajos son fase 2) y se reemplaza por *"Sincronización al instante — abrís en la compu y en el teléfono, siempre igual"*. Los atajos pasan a "Lo que viene".
- `AGENTS.md` y `docs/decisions.md`: se adopta React Hook Form y se registra como **D13**.
- `docs/decisions.md`: se registran las siete reglas de desambiguación del parser (R1–R7), que hoy viven solo en `docs/parser-test-cases.md` pese a que ese archivo manda anotarlas en el log de decisiones.

**Fuera de esta fase** (no son omisiones): modo panel, vista de calendario, vista Próximos, administración de etiquetas, página propia por etiqueta, etiquetas favoritas, acceso "Etiquetas" del panel lateral, filtros, buscador, comentarios, recordatorios y push, atajos de teclado, selección múltiple, deshacer con `Ctrl/Cmd+Z`, barra de opciones de vista, ejecución de recurrencia, hábitos y Google Calendar.

## Capabilities

### New Capabilities

- `infraestructura-base`: Scaffolding del proyecto, versiones fijadas, Tailwind y shadcn/ui, variables de entorno, deploy en Vercel con previews y el gate de verificación `pnpm lint && pnpm typecheck && pnpm test`.
- `esquema-datos`: Tablas de fase 1 con RLS habilitado y políticas en la misma migración, `user_id` en todas, constraint de exclusión entre `due_date` y `due_at`, índices, triggers de integridad y generación de tipos.
- `autenticacion`: Registro, inicio de sesión, Google OAuth, confirmación por correo, recuperación de contraseña de punta a punta, protección de rutas y aprovisionamiento inicial de la cuenta.
- `proyectos-secciones`: Ciclo de vida de proyectos con anidamiento de hasta 3 niveles, favoritos, archivado, borrado con confirmación y reordenamiento; y secciones dentro de cada proyecto.
- `tareas`: Ciclo de vida de tareas y subtareas, atributos, completado, duplicado, movimiento, reordenamiento y enlace directo.
- `etiquetas`: Creación de una etiqueta por `#` desde el alta rápida, asignación a la tarea y chip visible; agregar o quitar etiquetas desde el detalle de la tarea, reemplazando el conjunto completo al editar. Sin administración de etiquetas, sin página propia por etiqueta, sin favoritas y sin acceso "Etiquetas" en el panel lateral: eso es fase 2.
- `vistas-lista`: Bandeja de entrada, Hoy, Proyecto y Completado en modo lista, con sus reglas de composición, orden y contadores.
- `parser-lenguaje-natural`: Extracción de atributos desde el título en español rioplatense según el contrato de 56 casos y sus reglas de desambiguación, más la superficie de alta rápida con resaltado reversible.
- `sincronizacion-tiempo-real`: Realtime por tabla filtrado por usuario, optimistic updates con reversión, y comportamiento de la app sin conexión.
- `configuracion`: Preferencias de perfil, tema, zona horaria, formatos y día de inicio de semana.
- `landing-publica`: Landing de conversión única con demo del parser en vivo, rendimiento y accesibilidad medidos.
- `pwa-instalable`: Manifest, íconos e instalación desde el navegador.

### Modified Capabilities

Ninguna. `openspec/specs/` está vacío: es el primer cambio del proyecto y las doce capacidades son nuevas.

## Impact

**Código.** El repositorio pasa de cero código a la estructura completa declarada en `AGENTS.md`: `app/` con los grupos `(marketing)`, `(auth)` y `(app)`; `components/` con `ui/`, `tasks/`, `projects/` y `layout/`; `lib/` con `supabase/`, `parser/` y `validation/`; y `supabase/migrations/`. `lib/recurrence/` no se crea todavía: la ejecución de RRULE es fase 2.

**Base de datos.** Se crean las tablas de fase 1: `profiles`, `user_preferences`, `projects`, `sections`, `tasks`, `labels`, `task_labels`. Quedan para fases posteriores `comments`, `reminders`, `push_subscriptions`, `filters`, `habits`, `habit_completions`, `habit_schedule_overrides` y `calendar_connections`. Toda tabla nace con RLS y su política en la misma migración.

**Servicios externos.** Supabase (base de datos, auth, realtime), Resend (confirmación y reset de contraseña), Vercel (hosting y previews), Google Cloud (solo el cliente OAuth para el login con Google; la API de Calendar es fase 4).

**Dependencias.** Se incorporan las librerías ya decididas que la fase 1 necesita: TanStack Query, dnd-kit, Tiptap, Zod, date-fns y date-fns-tz, Vitest y Playwright. Se suma React Hook Form como D13. `rrule` se instala igual porque el parser emite RRULE, aunque la ejecución de la recurrencia sea fase 2.

**Documentación.** Se modifican `docs/roadmap.md`, `docs/product-spec.md`, `docs/landing.md`, `docs/decisions.md`, `docs/parser-test-cases.md` y `AGENTS.md` según el detalle de arriba.

**Riesgo principal.** El alcance es grande y el parser es la pieza que define la arquitectura del alta rápida. `design.md` levantó 27 huecos de la documentación; los 8 que necesitaban que decidiera el dueño del proyecto ya están resueltos en la sección "Decisiones resueltas" de ese documento. Varios de ellos (tokenización de `@` y `#`, semana del usuario, hora ya pasada) cambian el resultado de casos del contrato y no se podían diferir.
