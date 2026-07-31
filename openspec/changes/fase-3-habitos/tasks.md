> **Cómo se ejecutan estas tandas.** El grupo 1 es bloqueante: todo depende del
> esquema. Después, los grupos 2 y 3 corren **en paralelo** porque no comparten
> archivos. El grupo 4 espera al 3 porque monta la pantalla que este construye.
> El **grupo 5 es dueño único de los archivos compartidos** —panel lateral, los
> dos contadores, el acorde de atajos, la barra de opciones—: ninguna otra tanda
> los toca, para que dos agentes no se pisen ahí.
>
> Nadie corre `git stash`, `git reset` ni `git checkout` en una tanda paralela.
>
> `pnpm lint && pnpm typecheck && pnpm test` en verde no alcanza para dar una
> tanda por terminada: cada una se verifica abriendo el navegador.

## 1. Esquema y cálculo de racha (bloqueante)

- [x] 1.1 Migración `habits` con su RLS en el mismo archivo: `user_id` propio (D11), `name`, `icon`, `color`, `duration_minutes`, `scheduled_time` nullable, `frequency_type`, `times_per_week` nullable, `days_of_week` nullable, `is_archived`, `created_at`
- [x] 1.2 Check de `color` con el mismo criterio que `projects` y `labels`: paleta fija de diez colores o hex personalizado, con el contraste AA validado en `lib/validation/`, no en la base
- [x] 1.3 Checks de `frequency_type`: `times_per_week` entre 1 y 7 y no nulo solo para ese tipo; `days_of_week` no vacío y no nulo solo para `specific_days`; codificación ISO documentada en la migración (1 lunes … 7 domingo)
- [x] 1.4 Migración `habit_completions` con su RLS: `user_id` propio, `habit_id` con `on delete cascade`, `completed_on date` único junto con `habit_id`, e índice `(habit_id, completed_on desc)`
- [x] 1.5 Migración `habit_schedule_overrides` con su RLS: `user_id` propio, PK compuesta `(habit_id, date)`, `scheduled_time`
- [x] 1.6 Función `SECURITY INVOKER` que devuelve racha actual y mejor racha de un hábito, implementando las tres reglas de la decisión D-C
- [x] 1.7 En la función: margen de gracia del día en curso para `daily` y `specific_days`
- [x] 1.8 En la función: semana lunes a domingo fija, y la semana en curso fuera de la racha hasta que cierra
- [x] 1.9 En la función: la semana de creación se excluye, y ningún tipo evalúa fechas anteriores a `created_at`
- [x] 1.10 En la función: todo se resuelve en la zona horaria de `user_preferences.timezone`, reusando el mecanismo de las tareas atrasadas
- [x] 1.11 Migración que suma `habits` y `habit_completions` a la publicación de realtime — `habit_schedule_overrides` queda afuera
- [x] 1.12 Regenerar tipos con `pnpm db:types:local` (nunca `db:types`, que apunta al remoto)
- [x] 1.13 Tests de RLS de las tres tablas, siguiendo el patrón de `supabase/tests/`: un usuario no ve ni escribe filas de otro
- [x] 1.14 Tests de la función de racha con **fechas fijas, nunca `now()`**: los cuatro bordes del roadmap más el reinicio tras desarchivar

## 2. Capa de datos y mutaciones *(paralelo tras el grupo 1)*

- [x] 2.1 `lib/habits/get-habits.ts` y `use-habits.ts` con el patrón `initialData` + TanStack Query
- [x] 2.2 `lib/habits/mutations.ts`: crear, editar y eliminar, con optimistic updates
- [x] 2.3 Archivar y desarchivar, conservando el historial intacto
- [x] 2.4 Marcar y desmarcar el hábito de hoy, con optimistic update
- [x] 2.5 Rechazar en la capa de datos cualquier intento de marcar un día que no sea hoy
- [x] 2.6 `lib/habits/schedule-overrides.ts`: reprogramar y quitar el horario de un día puntual
- [x] 2.7 `lib/habits/streak.ts`: llamada por RPC a la función de racha, desde servidor y desde cliente
- [x] 2.8 `lib/habits/today.ts`: qué hábitos tocan hoy según su frecuencia, con su hora efectiva resolviendo el override si existe
- [x] 2.9 Handlers de realtime de `habits` y `habit_completions`, y sumarlos a `REALTIME_TABLES` — **las dos mitades**, o el realtime falla en silencio
- [x] 2.10 Validación con Zod en `lib/validation/habits.ts`, incluido el contraste del color personalizado
- [x] 2.11 Tests de `today.ts`: los tres tipos de frecuencia, un hábito creado hoy, y uno con override de horario

## 3. Pantalla Hábitos *(paralelo tras el grupo 1)*

- [x] 3.1 Ruta `app/(app)/habitos/page.tsx`
- [x] 3.2 Encabezado con los tres números: hábitos activos, mejor racha alcanzada, y cuántos de hoy se hicieron
- [x] 3.3 Hábitos agrupados por forma de repetirse
- [x] 3.4 Tarjeta de hábito: nombre, ícono, frecuencia con horario y duración, y casillero para marcar **solo si toca hoy**
- [x] 3.5 Mini-mapa de los últimos 14 días, de **solo lectura**
- [x] 3.6 Racha actual, o progreso semanal para `times_per_week`
- [x] 3.7 Mejor marca en la tarjeta
- [x] 3.8 Sección desplegable con los archivados
- [x] 3.9 Formulario de alta y edición, con el selector de emoji y el de color que ya existen
- [x] 3.10 Eliminar un hábito pide confirmación, avisando que se pierde el historial
- [x] 3.11 Reprogramar el horario de un día puntual desde la tarjeta
- [x] 3.12 La pantalla no ofrece selección múltiple

## 4. Hábitos en la vista Hoy *(tras el grupo 3)*

- [x] 4.1 Bloque de hábitos del día en Hoy, después de las tareas y antes de las completadas
- [x] 4.2 Contador de cuántos hábitos de hoy se hicieron
- [x] 4.3 Marcar y desmarcar desde Hoy, con el mismo comportamiento que en la pantalla propia
- [x] 4.4 Verificar que un hábito no queda atrapado en la selección múltiple de Hoy, ni al arrastrar ni con "seleccionar todas"
- [x] 4.5 El bloque respeta la opción "mostrar hábitos" de la barra de opciones

## 5. Integración *(dueño único de los archivos compartidos)*

- [x] 5.1 `lib/habits/pending-today.ts`: una **única** definición de "hábito pendiente de hoy", compartida por los dos contadores, con sus tests
- [x] 5.2 `lib/tasks/today-count.ts` suma los hábitos pendientes además de las tareas
- [x] 5.3 `lib/reminders/use-app-badge.ts` suma los hábitos pendientes — hoy cuenta solo recordatorios, que ya era una divergencia del spec
- [x] 5.4 Verificar que los dos contadores dan el mismo número
- [x] 5.5 `lib/shortcuts/chord.ts`: `CHORD_ROUTES.habitos` deja de ser `null` y apunta a `/habitos`; actualizar `chord.test.ts` y `shortcut-provider.test.tsx`
- [x] 5.6 Acceso "Hábitos" en `components/layout/sidebar-content.tsx` y en la barra inferior si corresponde
- [x] 5.7 `lib/view-options/schema.ts`: exponer el control "mostrar hábitos" en la barra — el de repeticiones futuras **sigue** reservado, es fase 4
- [x] 5.8 Confirmar que `/habitos` está en las rutas protegidas de `lib/supabase/proxy.ts`

## 6. Verificación de la fase

- [x] 6.1 `pnpm lint && pnpm typecheck && pnpm test` y `pnpm test:rls` en verde
- [x] 6.2 Criterio: las rachas son correctas en los tres tipos, incluidos los bordes — cambio de semana, día en curso con margen de gracia, y hábito creado a mitad de semana. Verificado en la app real (no solo con los tests unitarios): se sembró historial con fechas fijas por SQL directo contra el Docker local, reproduciendo los mismos casos de `supabase/tests/habit-streak.test.ts` (que coinciden con la fecha real de hoy), y se confirmó en pantalla cada racha mostrada
- [x] 6.3 Criterio: un hábito no aparece en fechas anteriores a su creación. Verificado en el mini-mapa: los días previos a la creación muestran la celda deshabilitada con el accesible "antes de crear el hábito"
- [x] 6.4 Criterio: archivar conserva el historial completo, y desarchivar lo devuelve intacto con la racha actual en cero. Verificado archivando y desarchivando un hábito con racha histórica de 10 días y ningún marcado reciente: la mejor racha se mantuvo en 10 todo el tiempo, y la racha actual quedó en 0 tras desarchivar
- [x] 6.5 Criterio: las rachas se calculan, no se guardan denormalizadas. Confirmado por inspección (no hay columnas de racha en `habits`, todo pasa por `calcular_racha_habito`) y por comportamiento: los números se recalculan solos al marcar/desmarcar y al archivar/desarchivar, sin ningún paso de sincronización manual
- [x] 6.6 Realtime verificado con dos contextos de navegador aislados vía Playwright (no dos pestañas manejadas a mano). En el camino se encontró que desmarcar un hábito no se propagaba por `replica identity default` en `habit_completions`; arreglado en la migración `20260731000000_realtime_replica_identity_full.sql` con tests de regresión en `e2e/realtime-sync.spec.ts` (ver D37).
- [x] 6.7 Recorrido manual de la pantalla Hábitos y del bloque en Hoy, en escritorio y en ancho de teléfono. Escritorio con la extensión de Chrome; 390×844 con Playwright directo (la extensión no pudo cambiar el tamaño de ventana en este entorno). Sin problemas de layout en ninguno de los dos anchos
- [x] 6.8 Tests e2e: crear un hábito, marcarlo, ver la racha, archivarlo y desarchivarlo. Agregado en `e2e/fase3-habitos-flows.spec.ts`, mismo patrón que `e2e/fase2-flows.spec.ts`. Pasa junto con toda la suite (14/14)
- [x] 6.9 Marcar los criterios de aceptación de la fase 3 en `docs/roadmap.md` — los cuatro, todos verificados
