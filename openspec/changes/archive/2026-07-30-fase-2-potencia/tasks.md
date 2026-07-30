> **Cómo se ejecutan estas tandas.** El grupo 1 es bloqueante: casi todo depende del
> esquema. Después, los grupos 2, 3, 4 y 5 se pueden delegar **en paralelo** porque no
> comparten archivos. Los grupos 6 y 7 esperan porque tocan componentes de lista que
> los anteriores crean. El grupo 8 es dueño único de `components/layout/sidebar-content.tsx`:
> ninguna otra tanda lo edita, para que dos agentes no se pisen ahí.
>
> Nadie corre `git stash`, `git reset` ni `git checkout` en una tanda paralela.
> Los archivos de migración se numeran de antemano (grupo 1) para que dos tandas no
> colisionen en el nombre.
>
> `pnpm lint && pnpm typecheck && pnpm test` en verde no alcanza para dar una tanda
> por terminada: cada una se verifica abriendo el navegador.

## 1. Esquema y base (bloqueante — nada arranca hasta que esto esté)

- [x] 1.1 Migración de extensiones: `unaccent`, `pg_cron`, `pg_net`, y la configuración de búsqueda `spanish_unaccent` copiada de `spanish` con el mapeo `unaccent, spanish_stem`
- [x] 1.2 Migración `comments` con su RLS estándar en el mismo archivo (`user_id`, `task_id` con `on delete cascade`, `content jsonb`, `created_at`, `updated_at`)
- [x] 1.3 Migración `reminders` con su RLS (`task_id` cascade, `remind_at`, `offset_minutes` nullable, `delivered_at` nullable) más el índice parcial sobre `remind_at where delivered_at is null`
- [x] 1.4 Migración `push_subscriptions` con su RLS (`endpoint` único, `p256dh`, `auth`)
- [x] 1.5 Migración `filters` con su RLS (`name`, `query text`, `color`, `icon`, `is_favorite`) y el check de color contra la paleta fija
- [x] 1.6 Migración `view_preferences` con su RLS, PK compuesta `(user_id, view_key)` y `options jsonb`
- [x] 1.7 Migración sobre `tasks`: columna `description_text`, columna generada `search_vector` con `to_tsvector('spanish_unaccent', title || ' ' || coalesce(description_text,''))` e índice GIN
- [x] 1.8 Migración que amplía el check de `user_preferences.default_view` para aceptar `proximos`
- [x] 1.9 Migración que suma `comments`, `reminders` y `filters` a la publicación de realtime
- [x] 1.10 Backfill opcional de `description_text` para las tareas existentes con descripción
- [x] 1.11 Regenerar tipos con `pnpm db:types` y verificar que las cinco tablas nuevas aparecen en `lib/supabase/database.types.ts`
- [x] 1.12 Tests de RLS para las cinco tablas nuevas en `supabase/tests/`, siguiendo el patrón de los existentes: un usuario no ve ni escribe filas de otro

## 2. Lenguaje de consulta, filtros y buscador *(paralelo tras el grupo 1)*

- [x] 2.1 Tokenizador en `lib/query-language/tokenize.ts`: campos, valores, comillas dobles, comas, operadores, paréntesis, con posición y longitud de cada token
- [x] 2.2 Parser de descenso recursivo en `lib/query-language/parse.ts` con precedencia `!` > `&` > `|`, que devuelve un AST o un error con posición
- [x] 2.3 Mensajes de error en español en `lib/query-language/errors.ts`, señalando la posición y el fragmento problemático
- [x] 2.4 Esquema Zod del AST en `lib/query-language/ast.ts`, usado para validar antes de mandarlo al servidor
- [x] 2.5 Validación semántica de valores: `priority` 1-4, formatos de fecha, tokens de `due` y `created` reconocidos
- [x] 2.6 Migración con la función `buscar_tareas(ast jsonb)` en Postgres, `SECURITY INVOKER`, que compila el AST desde una lista blanca de campos y operadores, con todo valor parametrizado
- [x] 2.7 En `buscar_tareas`: `label` y `project` sin distinguir mayúsculas ni acentos; `!label:x` como no-existencia sobre `task_labels`; `completed` afuera por defecto si la consulta no lo menciona
- [x] 2.8 En `buscar_tareas`: el campo `search` resuelve contra `search_vector` con la configuración `spanish_unaccent`, igual que el buscador
- [x] 2.9 Tests de la función con un AST hostil: campos inexistentes, tipos equivocados, AST vacío — devuelve error, nunca filas de otro usuario
- [x] 2.10 Tests unitarios del parser: los diez campos, precedencia, paréntesis, negación de grupo, comillas, y el caso del roadmap `(priority:1,2 & due:next7days) & !label:espera`
- [x] 2.11 `lib/filters/get-filters.ts` y `use-filters.ts` siguiendo el patrón `initialData` + TanStack Query
- [x] 2.12 `lib/filters/mutations.ts`: crear, renombrar, cambiar consulta, color, ícono, favorito y eliminar, con optimistic updates
- [x] 2.13 Ruta `app/(app)/filtros/page.tsx`: administración de filtros guardados
- [x] 2.14 Ruta `app/(app)/filtros/[id]/page.tsx`: resultados de un filtro
- [x] 2.15 Formulario de filtro con el selector de color de proyectos y el selector de emoji ya existentes
- [x] 2.16 Vista previa en vivo del conteo de coincidencias mientras se escribe la consulta, con debounce
- [x] 2.17 Un filtro que referencia una etiqueta o proyecto eliminado informa el problema en español en vez de romper la página
- [x] 2.18 `lib/search/` y ruta `app/(app)/buscar/page.tsx`: mínimo dos caracteres, tope de 50 resultados, pendientes primero y después por fecha
- [x] 2.19 Tests de búsqueda: "reunion" encuentra "reunión", "reuniones" encuentra "reunión", "renuion" no encuentra nada

## 3. Navegación por etiqueta y vista Próximos *(paralelo tras el grupo 1)*

- [x] 3.1 `lib/labels/use-labels.ts` y `get-labels.ts` pasan a seleccionar `is_favorite`, y el tipo de etiqueta lo incluye
- [x] 3.2 Mutación para marcar y desmarcar una etiqueta como favorita, con optimistic update
- [x] 3.3 Control de favorita en la pantalla de administración de etiquetas
- [x] 3.4 Ruta `app/(app)/etiquetas/[id]/page.tsx`: todas las tareas con esa etiqueta, sin importar el proyecto
- [x] 3.5 Encabezado de la página de etiqueta con su nombre, color y conteo
- [x] 3.6 `lib/tasks/get-upcoming-tasks.ts` y su hook, con la ventana de días como parámetro
- [x] 3.7 Ruta `app/(app)/proximos/page.tsx` en modo lista: agrupada por día, con "Hoy" y "Mañana" resaltados y contador por día
- [x] 3.8 Botón por día para agregar una tarea con esa fecha ya puesta
- [x] 3.9 Las tareas sin fecha quedan fuera de la lista de Próximos
- [x] 3.10 Bloque de atrasadas arriba de todo, fuera de la ventana
- [x] 3.11 `lib/validation/preferences.ts` acepta `proximos` como `default_view`, y la configuración lo ofrece
- [x] 3.12 Tests de la ventana: 7 días por defecto, borde de fin de mes, tarea de hoy con hora ya pasada

## 4. Comentarios y recordatorios push *(paralelo tras el grupo 1)*

- [x] 4.1 `lib/comments/get-comments.ts` y `use-comments.ts`
- [x] 4.2 `lib/comments/mutations.ts`: crear, editar y eliminar con optimistic updates
- [x] 4.3 Hilo de comentarios en el modal de detalle de la tarea, con el editor Tiptap ya configurado y sin fórmulas
- [x] 4.4 Un comentario con `updated_at` distinto de `created_at` se muestra como "editado"
- [x] 4.5 `lib/realtime/handlers.ts` invalida la query de comentarios al recibir su evento
- [x] 4.6 Generar el par de claves VAPID y documentar las variables de entorno en `.env.example`, Vercel y Supabase
- [x] 4.7 Handler de `push` y de `notificationclick` en `public/sw.js`: la notificación muestra el título en texto plano y al tocarla abre esa tarea
- [x] 4.8 `lib/reminders/subscribe.ts`: pedir permiso, suscribir el dispositivo y guardar la fila en `push_subscriptions`
- [x] 4.9 Sección Notificaciones en Configuración: activar, desactivar y ver los dispositivos suscritos
- [x] 4.10 `lib/reminders/mutations.ts`: agregar y quitar recordatorios de una tarea, puntuales y relativos
- [x] 4.11 Selector de recordatorios en el detalle de la tarea, con las opciones relativas del spec; las relativas exigen que la tarea tenga fecha y hora
- [x] 4.12 Recalcular los recordatorios relativos no entregados cuando cambia la fecha o la hora de la tarea
- [x] 4.13 Edge function en `supabase/functions/enviar-recordatorios/`: reclama con `update … returning` y `for update skip locked`, lote de 200, y recién ahí envía
- [x] 4.14 La edge function elimina la suscripción cuando el envío devuelve 404 o 410
- [x] 4.15 Programar `pg_cron` cada minuto invocando la función con `pg_net`
- [x] 4.16 Badge en el ícono de la aplicación con los pendientes de hoy, con el punto de extensión para sumar hábitos en la fase 3
- [x] 4.17 Test de entrega única: dos ejecuciones solapadas del cron sobre el mismo recordatorio producen un solo envío

## 5. Recurrencia y deshacer *(paralelo tras el grupo 1 — dueño único de `lib/tasks/mutations.ts` y `restore.ts`)*

- [x] 5.1 `lib/recurrence/anchor.ts`: función pura que deriva el ancla del RRULE — `BYDAY`/`BYMONTHDAY`/`BYMONTH` ancla en vencimiento, intervalo puro ancla en completado
- [x] 5.2 `lib/recurrence/next.ts` usando la dependencia `rrule` ya instalada: próxima ocurrencia estrictamente posterior a hoy, descartando las perdidas
- [x] 5.3 Respetar el fin de serie: `recurrence_ends_at` vencido o `recurrence_count` agotado no genera nada
- [x] 5.4 Completar una tarea recurrente crea la siguiente heredando proyecto, sección, título, descripción, prioridad, duración, fecha límite y etiquetas — no subtareas, comentarios ni recordatorios
- [x] 5.5 Una recurrente vencida no se adelanta sola: sigue apareciendo en el bloque de atrasadas
- [x] 5.6 Editor de recurrencia en el detalle de la tarea: elegir frecuencia, fin por fecha o por cantidad, y quitar la repetición
- [x] 5.7 Tests de recurrencia: "cada lunes" vencida tres semanas, "cada 3 días" completada tarde, "cada día laborable" en fin de semana, borde de fin de mes
- [x] 5.8 `lib/undo/`: contexto con `useReducer`, pila acotada a 20, descriptores con etiqueta en español y thunk inverso
- [x] 5.9 Listener de `Ctrl/Cmd+Z` en fase de captura, que sí actúa con el foco en un campo de texto pero cede ante el historial propio de Tiptap
- [x] 5.10 `lib/tasks/restore.ts` restaura también `task_labels` y los comentarios de la tarea
- [x] 5.11 Empujar a la pila: eliminar tarea, completar y descompletar, y la última edición
- [x] 5.12 Toast de deshacer en toda acción destructiva, compartiendo descriptor con la pila; deshacer desde el toast la saca de la pila
- [x] 5.13 El borrado de proyecto y el de etiqueta no entran en la pila y conservan su confirmación explícita
- [x] 5.14 Tests de deshacer: restaurar una tarea con subtareas, etiquetas y comentarios devuelve todo; la pila no pasa de 20

## 6. Opciones de vista y modo panel *(tras los grupos 2, 3 y 5)*

- [x] 6.1 `lib/view-options/schema.ts`: esquema Zod de `options`, con los defaults de D25 y los de Próximos, Etiqueta y Filtro; una clave desconocida se ignora
- [x] 6.2 `lib/view-options/get-view-preferences.ts`, su hook y su mutación, con `view_key` por pantalla
- [x] 6.3 Componente de barra de opciones con: forma de ver, mostrar completadas, días adelante, orden, agrupar por, filtros rápidos y restablecer
- [x] 6.4 Las claves de hábitos y repeticiones futuras quedan reservadas en el esquema, sin control visible en fase 2
- [x] 6.5 Montar la barra en Bandeja, Hoy, Próximos, Proyecto, Etiqueta y Filtro, cada una con su `view_key`
- [x] 6.6 Aplicar orden y agrupación a las vistas de lista existentes
- [x] 6.7 Componente de panel con `@dnd-kit`, arrastre horizontal entre columnas además del vertical
- [x] 6.8 Columnas por sección en Bandeja y Proyecto; arrastrar entre columnas cambia de sección
- [x] 6.9 Columnas por día más "Sin fecha" en Próximos; arrastrar entre columnas cambia la fecha
- [x] 6.10 El arrastre solo está habilitado con orden manual y sin agrupación activa
- [x] 6.11 Verificar que mover de sección y cambiar la fecha siguen disponibles desde el menú contextual (D24)
- [x] 6.12 Tests: las opciones sobreviven a recargar y aparecen en otro dispositivo; una `view_key` sin fila usa los defaults

## 7. Atajos de teclado y selección múltiple *(tras el grupo 6)*

- [x] 7.1 `lib/shortcuts/`: un único listener en la raíz y una pila de contextos donde gana el binding más específico
- [x] 7.2 Guarda de foco: ningún atajo se dispara en `input`, `textarea` o `contenteditable`, salvo `Ctrl/Cmd+Z`
- [x] 7.3 Acorde `G` con timeout de 1,5 s, cancelable con `Escape` o con una tecla ajena; mientras está pendiente ninguna tecla suelta se dispara
- [x] 7.4 Atajos generales: `G I`, `G T`, `G U`, `G C`, `G A`, más `S`, `Q` y `E`
- [x] 7.5 `G A` (Hábitos) y `E` (nuevo evento) se registran pero no navegan a nada: son fases 3 y 4
- [x] 7.6 Atajos del detalle de tarea: `Ctrl+S`, `D`, `L`, `F`, `R`, `O`, `E`, `N`
- [x] 7.7 Atajos por pantalla: `S` en Bandeja abre secciones, `⇧S` en proyecto agrega sección, `Escape` cierra menús y modales
- [x] 7.8 Atajos del menú contextual: `T`, `Y`, `V`, `⇧Ctrl+C`, `Ctrl⇧N`, `⇧Supr`
- [x] 7.9 Verificar la resolución de las tres colisiones de la tabla de D-G: `S`, `E` y `T`
- [x] 7.10 Modo de selección múltiple: entrar, salir con `Escape`, y selección de rango con `⇧`+clic
- [x] 7.11 Barra de acciones en lote: seleccionar todas, mover a proyecto o sección, cambiar prioridad, cambiar fecha con Hoy / Mañana / Sin fecha, y eliminar
- [x] 7.12 Una acción en lote entra en la pila de deshacer como una sola acción
- [x] 7.13 Habilitar selección múltiple en Bandeja, Hoy, Próximos, Proyecto, Etiqueta y Filtro
- [x] 7.14 Tests de atajos: ninguno se dispara escribiendo en el alta rápida; `Ctrl/Cmd+Z` sí

## 8. Panel lateral e integración *(dueño único de `components/layout/sidebar-content.tsx`)*

- [x] 8.1 Sección Favoritos con proyectos, etiquetas y filtros marcados como tales
- [x] 8.2 Acceso "Próximos" en la navegación principal
- [x] 8.3 Acceso "Etiquetas" y lista colapsable de etiquetas
- [x] 8.4 Acceso "Filtros" y lista colapsable de filtros
- [x] 8.5 Acceso al buscador
- [x] 8.6 Revisar `lib/supabase/proxy.ts`: `/proximos`, `/filtros` y `/buscar` ya figuran como protegidas y ahora existen

## 9. Verificación de la fase

- [x] 9.1 `pnpm lint && pnpm typecheck && pnpm test` en verde
- [x] 9.2 Criterio: `(priority:1,2 & due:next7days) & !label:espera` devuelve exactamente lo esperado, y un error de sintaxis se explica en español señalando la posición
- [ ] 9.3 Criterio: un recordatorio programado llega una vez, a horario, en todos los dispositivos suscritos, y no llega dos veces (verificado solo el mecanismo de entrega única de `claim_due_reminders`; la entrega real por push no se puede probar en local — ver informe de verificación)
- [x] 9.4 Criterio: completar una tarea recurrente genera la siguiente con todos los atributos heredados
- [x] 9.5 Criterio: eliminar una tarea y hacer `Ctrl+Z` la restaura completa, con subtareas, etiquetas y comentarios
- [ ] 9.6 Criterio: todos los atajos funcionan y ninguno se dispara escribiendo en un campo de texto, salvo deshacer (verificado también el menú contextual de tarea — `T`, `V`, `⇧Ctrl+C`, `Ctrl⇧N`, `⇧Supr` — y `⇧S` en un proyecto, y la guarda de foco nueva: Ctrl/Cmd se dispara en campos de texto, teclas sueltas no, `⇧Supr` sigue bloqueado; sin marcar porque `Y` abre el detalle pero no abre el selector de prioridad como debería — bug nuevo, ver informe de verificación)
- [x] 9.7 Criterio: la búsqueda encuentra "reunión" buscando "reunion"
- [x] 9.8 Recorrido manual en el navegador de las doce funcionalidades, en escritorio y en teléfono (escritorio: recorrido amplio, dos bugs encontrados en una pasada previa; teléfono: completado en esta pasada — comentarios, selección múltiple, recordatorios, etiquetas, buscador, modo panel y deshacer, sin bugs nuevos — ver informe de verificación)
- [x] 9.9 Tests e2e de los flujos nuevos: guardar un filtro y abrirlo, comentar una tarea, completar una recurrente, deshacer una eliminación
- [x] 9.10 Marcar los criterios de aceptación de la fase 2 en `docs/roadmap.md`
