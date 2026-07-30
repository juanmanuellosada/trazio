## Why

Trazio hoy guarda tareas bien, pero no ayuda a decidir sobre ellas: no hay forma de
preguntar "qué tengo urgente esta semana sin lo que está esperando", ni de ver la
semana que viene, ni de que la aplicación avise a tiempo. Todo lo que se anota hay
que volver a encontrarlo a mano.

La fase 2 cierra esa brecha: consultar, ver hacia adelante, encontrar, recordar y
operar rápido. Es lo que separa una lista de un sistema.

## What Changes

**Consultar y encontrar**

- Lenguaje de consulta con los diez campos del spec (`priority`, `due`, `label`,
  `project`, `completed`, `search`, `recurring`, `subtask`, `created`, `no_project`),
  combinables con `&`, `|`, `!` y paréntesis. Errores de sintaxis en español que
  señalan la posición. Vista previa en vivo de cuántas tareas coinciden.
- Filtros guardados: crear, nombrar, colorear, marcar como favoritos, y su propia
  página de resultados.
- Buscador con full-text en español sobre título y descripción: configuración
  `spanish` de Postgres más `unaccent`, con índice GIN. "reunion" encuentra
  "reunión". La búsqueda sigue siendo literal: no corrige errores de tipeo.
- Página propia por etiqueta, y etiquetas favoritas en el panel lateral. La columna
  `labels.is_favorite` ya existe y hoy no se usa.

**Ver hacia adelante**

- Vista Próximos, con ventana configurable de una semana a tres meses.
- Modo panel en Bandeja, Proyecto y Próximos. En Bandeja y Proyecto las columnas son
  las secciones; en Próximos, un día por columna más "Sin fecha". Arrastrar entre
  columnas cambia sección o fecha.
- Barra de opciones de vista (forma de ver, orden, agrupación, qué mostrar, cuántos
  días adelante, filtros rápidos, restablecer), con memoria **por pantalla**.

**Recordar y responder**

- Recordatorios push: suscripción por dispositivo, momentos puntuales y relativos,
  edge function con cron, **entrega única sin reintento**, y badge en el ícono con
  los pendientes del día.
- Comentarios por tarea, con el mismo editor Tiptap que la descripción, marcados
  como "editado" cuando corresponde.

**Operar rápido**

- Atajos de teclado completos, incluido el acorde `G` para navegar. Ninguno se
  dispara con el foco en un campo de texto, salvo `Ctrl/Cmd+Z`.
- Selección múltiple con barra de acciones en lote: seleccionar todas, mover,
  cambiar prioridad, cambiar fecha y eliminar.
- Deshacer con `Ctrl/Cmd+Z` sobre una pila de acciones, más toast con deshacer en
  toda acción destructiva. La restauración de una tarea pasa a incluir sus
  etiquetas y comentarios, que hoy se pierden.
- Tareas recurrentes que se interpretan: al completar una, se crea la siguiente
  heredando proyecto, sección, título, descripción, prioridad, duración, fecha
  límite y etiquetas. Las columnas y el RRULE que produce el parser ya existen;
  falta leerlos.

**Esquema**

- Tablas nuevas: `comments`, `reminders`, `push_subscriptions`, `filters`,
  `view_preferences`. Cada una con su RLS en la misma migración que la crea.
- `user_preferences.default_view` pasa a aceptar `proximos`, hoy prohibido por el
  check constraint.
- Índice GIN de búsqueda sobre `tasks`, e índice parcial sobre
  `reminders(remind_at) where delivered_at is null` para el cron.

Nada de esto es **BREAKING**: son capacidades nuevas sobre contratos existentes. El
único cambio de comportamiento observable sobre algo ya entregado es que el
deshacer de una tarea eliminada ahora restaura también sus etiquetas.

## Capabilities

### New Capabilities

- `lenguaje-de-consulta`: sintaxis, precedencia, tokens, evaluación contra la base y
  errores en español posicionados.
- `filtros-guardados`: crear, editar, colorear, favoritos, página de resultados y
  vista previa de coincidencias.
- `buscador`: full-text en español, insensible a acentos, mínimo dos caracteres,
  hasta 50 resultados, pendientes primero.
- `navegacion-por-etiqueta`: página propia por etiqueta y etiquetas favoritas.
- `vista-proximos`: ventana hacia adelante, agrupación por día, atrasadas.
- `modo-panel`: columnas, arrastre entre columnas y dónde aplica.
- `opciones-de-vista`: la barra, sus opciones y su memoria por pantalla.
- `comentarios`: hilo por tarea, edición marcada, eliminación.
- `recordatorios-push`: suscripción, programación, entrega única, badge.
- `atajos-de-teclado`: el mapa completo, la resolución de colisiones por contexto y
  la regla del foco en campos de texto.
- `seleccion-multiple`: entrada al modo, acciones en lote y su reversibilidad.
- `deshacer`: la pila, su alcance y qué restaura cada acción.
- `tareas-recurrentes`: interpretación del RRULE, herencia, ancla y fin de la serie.

### Modified Capabilities

- `etiquetas`: cae el requisito "Fuera de alcance en fase 1" — la página propia,
  las favoritas y el acceso del panel lateral pasan a existir.
- `administracion-de-etiquetas`: cae el requisito que excluía explícitamente la
  página propia y las favoritas de esa capacidad.
- `esquema-datos`: cinco tablas nuevas con su RLS, el índice de búsqueda, el índice
  parcial del cron y la ampliación del check de `default_view`.
- `tareas`: completar una tarea recurrente genera la siguiente; una tarea tiene
  comentarios y recordatorios asociados.
- `vistas-lista`: las vistas de lista pasan a tener barra de opciones, modo panel
  alternativo y selección múltiple.
- `configuracion`: aparece la sección de notificaciones push.
- `sincronizacion-tiempo-real`: `comments`, `reminders` y `filters` entran en la
  publicación de realtime.
- `parser-lenguaje-natural`: el RRULE que ya produce el parser pasa a determinar
  también el ancla de la recurrencia (vencimiento o completado).

## Impact

**Código.** Rutas nuevas `/proximos`, `/buscar`, `/filtros`, `/filtros/[id]`,
`/etiquetas/[id]` — las tres primeras ya figuran como protegidas en
`lib/supabase/proxy.ts` sin existir. Módulos nuevos `lib/query-language/`,
`lib/filters/`, `lib/search/`, `lib/comments/`, `lib/reminders/`, `lib/undo/`,
`lib/shortcuts/`, `lib/view-options/`, `lib/recurrence/`. Se tocan
`lib/tasks/mutations.ts` (recurrencia al completar, lote, deshacer),
`lib/tasks/restore.ts` (restaurar `task_labels` y comentarios),
`lib/labels/use-labels.ts` (seleccionar `is_favorite`),
`components/layout/sidebar-content.tsx` y `public/sw.js` (handler de `push`).

**Infraestructura.** Primer uso de `supabase/functions/` y de `pg_cron`. Claves
VAPID nuevas como variables de entorno, en Vercel y en Supabase. La extensión
`unaccent` de Postgres.

**Dependencias.** `rrule` ya está en `package.json` sin usarse. Se suma una
librería de web push para la edge function. El parser del lenguaje de consulta se
escribe a mano, sin dependencia.

**Fuera de alcance.** El modo calendario de la barra de opciones y de Próximos es
fase 4. Los hábitos que Próximos y el badge muestran junto a las tareas son fase 3:
acá se deja el punto de extensión, no la funcionalidad. Nada de modo offline,
caché de datos, exportar, equipos ni recordatorios por email.
