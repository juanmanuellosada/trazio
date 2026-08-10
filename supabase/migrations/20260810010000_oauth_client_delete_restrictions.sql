-- Ola 4 de `servidor-mcp` (D-C de design.md, hallazgo de la Ola 1): "el MCP
-- no borra" no puede ser solo una propiedad de qué herramientas construimos
-- — si el access token se filtra, cualquiera puede ir directo contra
-- PostgREST salteándose por completo el servidor MCP. Sí se puede
-- enforcear en la base: un token emitido por el servidor OAuth de Supabase
-- trae el claim `client_id`; una sesión normal de la app, autenticada por
-- cookie, no lo trae. Verificado de forma empírica contra el stack local
-- (no solo leído en la documentación de Supabase): un login por contraseña
-- (`grant_type=password`) da un JWT sin `client_id`; el mismo usuario
-- completando el flujo OAuth 2.1 + PKCE (`/oauth/authorize` ->
-- `/oauth/authorizations/:id/consent` -> `/oauth/token`) da un JWT con
-- `client_id` igual al id del cliente OAuth registrado. Con eso, una
-- política puede distinguir el origen sin ambigüedad:
--
--   (select auth.jwt() ->> 'client_id') is null      -- sesión de la app
--   (select auth.jwt() ->> 'client_id') is not null  -- vino por OAuth
--
-- El `select` que envuelve `auth.jwt()` es el mismo truco que ya usan todas
-- las políticas de este proyecto para `auth.uid()`: promueve la llamada a
-- un initplan que Postgres evalúa una sola vez por sentencia, no una vez
-- por fila.
--
-- Esta migración agrega, a la condición `USING` de la política de DELETE
-- de cada tabla bloqueada, `and (select auth.jwt() ->> 'client_id') is
-- null`. La condición existente (`(select auth.uid()) = user_id`, o `= id`
-- en `profiles`) queda intacta: una sesión normal de la app sigue
-- pudiendo borrar exactamente lo mismo que hoy, en las mismas filas. Se usa
-- `alter policy` sobre la política ya creada en la migración que dio de
-- alta cada tabla (no `drop`/`create`): mismo nombre, mismo `for delete`,
-- solo cambia la expresión.
--
-- Verificado también de forma empírica (tabla descartable en el stack
-- local, no asumido): un borrado en cascada (`on delete cascade`) NO pasa
-- por la política de RLS de la tabla hija — lo ejecuta el sistema con el
-- mismo privilegio que hace cumplir la restricción de clave foránea. Una
-- tabla hija con una política de DELETE que rechaza absolutamente todo
-- (`using (false)`) igual pierde sus filas cuando se borra el padre. Por
-- eso alcanza con bloquear la tabla padre (`tasks`, `projects`, `habits`,
-- ...): no hace falta blindar por esta vía a `task_labels`,
-- `habit_completions` ni ninguna otra tabla que cuelgue de un `on delete
-- cascade`, y bloquearla igual (donde se bloquea) es una decisión aparte,
-- no una necesidad del cascade.
--
-- Qué tabla se bloquea y cuál no, decisión por decisión: la pregunta para
-- cada una es "¿alguna de las nueve herramientas del MCP (`specs/mcp/
-- spec.md`) necesita un DELETE contra esta tabla para hacer su trabajo?".
--
-- BLOQUEADAS — contenido que el usuario reconoce como una cosa que existe.
-- Borrarlo es destructivo y se queda en la app, con su confirmación y su
-- deshacer; ninguna herramienta del MCP lo necesita (el MCP no ofrece
-- borrar, ver el requirement "El servidor MCP nunca ofrece borrar" del
-- spec delta):
--   tasks, projects, sections, habits, labels, filters, comments.
--
-- BLOQUEADAS — tablas de soporte, ajuste o detalle que ninguna herramienta
-- del MCP toca ni de lectura ni de escritura, así que bloquear su DELETE
-- no le quita ninguna capacidad prometida:
--   habit_completions, habit_skips, habit_schedule_overrides (estado de
--     marcar/saltear/reprogramar un hábito día a día: no hay herramienta
--     de "completar hábito" ni "reprogramar" entre las nueve);
--   reminders, habit_reminders, habit_reminder_deliveries (recordatorios:
--     Non-Goal explícito del diseño, "ni lectura ni escritura");
--   push_subscriptions, calendar_connections (credenciales/integraciones
--     del dispositivo o de terceros, ajenas a las nueve herramientas);
--   user_preferences, profiles, view_preferences (configuración de la
--     cuenta; ninguna herramienta del MCP la crea, edita ni borra).
--
-- NO BLOQUEADA — la excepción real:
--   task_labels. Es una tabla puente (tarea <-> etiqueta), no contenido
--   por sí misma. Quitarle una etiqueta a una tarea es, para el usuario,
--   editar la tarea — y `editar` sí es una herramienta del MCP. La propia
--   app lo implementa así (`useReplaceTaskLabels`,
--   `lib/tasks/mutations.ts`): borra todas las filas de `task_labels` de
--   la tarea e inserta las nuevas, nunca altas/bajas incrementales. Si esta
--   tabla se bloqueara, `editar` con `tipo: tarea` dejaría de poder
--   cambiar las etiquetas de una tarea para un cliente OAuth — se rompería
--   una capacidad que el MCP promete, por una vía que no es "borrar la
--   tarea" desde el punto de vista del usuario.

alter policy "tasks_delete_own" on public.tasks
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'client_id') is null);

alter policy "projects_delete_own" on public.projects
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'client_id') is null);

alter policy "sections_delete_own" on public.sections
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'client_id') is null);

alter policy "habits_delete_own" on public.habits
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'client_id') is null);

alter policy "labels_delete_own" on public.labels
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'client_id') is null);

alter policy "filters_delete_own" on public.filters
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'client_id') is null);

alter policy "comments_delete_own" on public.comments
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'client_id') is null);

alter policy "habit_completions_delete_own" on public.habit_completions
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'client_id') is null);

alter policy "habit_skips_delete_own" on public.habit_skips
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'client_id') is null);

alter policy "habit_schedule_overrides_delete_own" on public.habit_schedule_overrides
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'client_id') is null);

alter policy "reminders_delete_own" on public.reminders
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'client_id') is null);

alter policy "habit_reminders_delete_own" on public.habit_reminders
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'client_id') is null);

alter policy "habit_reminder_deliveries_delete_own" on public.habit_reminder_deliveries
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'client_id') is null);

alter policy "push_subscriptions_delete_own" on public.push_subscriptions
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'client_id') is null);

alter policy "calendar_connections_delete_own" on public.calendar_connections
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'client_id') is null);

alter policy "user_preferences_delete_own" on public.user_preferences
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'client_id') is null);

alter policy "profiles_delete_own" on public.profiles
  using ((select auth.uid()) = id and (select auth.jwt() ->> 'client_id') is null);

alter policy "view_preferences_delete_own" on public.view_preferences
  using ((select auth.uid()) = user_id and (select auth.jwt() ->> 'client_id') is null);

-- task_labels: sin cambios a propósito (ver el comentario de cabecera).
-- No hay ningún `alter policy` para esta tabla en este archivo.
