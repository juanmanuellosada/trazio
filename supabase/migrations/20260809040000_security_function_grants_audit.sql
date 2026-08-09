-- Auditoría de seguridad: cuatro funciones ejecutables por `anon` o
-- `authenticated` que no debían serlo. Las dos más graves son
-- `security definer` y existen para que el cron reclame recordatorios sin
-- sesión de por medio — por diseño pasan por encima de RLS y devuelven
-- `user_id`, `task_id` y el título de la tarea de CUALQUIER usuario. Con
-- la clave publicable (en el bundle del navegador) cualquiera podía
-- llamarlas por PostgREST, leer títulos ajenos y marcar recordatorios como
-- entregados para que esa persona nunca los reciba.
--
-- La causa es la misma que ya corrigió
-- 20260726014219_security_revoke_public_execute.sql, pero en la mitad
-- inversa. Ese archivo explica que `revoke execute ... from anon,
-- authenticated` no alcanza porque el privilegio de PUBLIC (el `=X` del
-- ACL, que `create function` otorga solo por crear la función) es
-- aditivo: un rol lo tiene si se lo dieron a él O a PUBLIC, sin importar
-- qué se le revocó a él en particular. Las migraciones de esta tanda
-- cometieron el error espejado: hicieron `revoke execute ... from public`
-- (o directamente no revocaron nada) y confiaron en que el `grant ...
-- to <rol>` puntual alcanzaba — pero según qué rol y con qué privilegios
-- por defecto corrió el `create function` (difiere entre este Supabase
-- local y producción; ver el comentario de cada bloque abajo), el rol
-- objetivo puede terminar con EXECUTE por una vía distinta a la que la
-- migración creyó usar. La regla, para toda función nueva de acá en
-- adelante: revocar de los TRES roles (`public`, `anon`, `authenticated`)
-- y otorgar explícitamente solo al que corresponda. Nunca alcanza con
-- revocar de uno o dos.

-- 1. claim_due_reminders: la llama el cron sin sesión
-- (20260729140000_reminders_claim_recalc_and_cron.sql). Solo
-- `service_role`.
revoke execute on function public.claim_due_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_due_reminders(integer) to service_role;

-- 2. claim_due_habit_reminders: mismo motivo
-- (20260808000000_habit_reminders.sql). Solo `service_role`.
revoke execute on function public.claim_due_habit_reminders(integer, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_due_habit_reminders(integer, timestamptz) to service_role;

-- 3. get_shared_project: la única función pensada para `anon`
-- (20260809030000_get_shared_project.sql) — pero `authenticated` no tiene
-- ninguna razón para necesitarla tampoco (la app logueada nunca la llama).
revoke execute on function public.get_shared_project(text) from public, anon, authenticated;
grant execute on function public.get_shared_project(text) to anon;

-- 4. handle_user_login_avatar_refresh: función de trigger
-- (20260809000000_profiles_avatar_url.sql), no se invoca directamente —
-- ningún rol la necesita como RPC. En la práctica Postgres ya rechaza
-- invocarla fuera de un trigger ("trigger functions can only be called as
-- triggers"), así que el EXECUTE de más no es explotable, pero tampoco
-- tiene que estar.
revoke execute on function public.handle_user_login_avatar_refresh() from public, anon, authenticated;

-- Las cuatro de abajo no son `security definer` — corren con los
-- privilegios de quien invoca y quedan acotadas por la RLS de las tablas
-- que tocan, así que `anon` ejecutándolas no filtraba datos (sin sesión,
-- `auth.uid()` es null y ninguna fila matchea). Igual no era la intención:
-- las migraciones que las crearon solo hicieron `grant ... to
-- authenticated` sin revocar de `public` primero, y quedaron abiertas a
-- cualquiera igual que las de arriba. Se corrigen acá por la misma regla,
-- no porque hubiera una fuga real.

-- 5. calcular_racha_habito (20260729180000_calcular_racha_habito.sql).
revoke execute on function public.calcular_racha_habito(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.calcular_racha_habito(uuid, timestamptz) to authenticated;

-- 6-8. rebalance_{task,project,section}_positions
-- (20260726013250_position_rebalance_functions.sql).
revoke execute on function public.rebalance_task_positions(uuid, uuid) from public, anon, authenticated;
grant execute on function public.rebalance_task_positions(uuid, uuid) to authenticated;

revoke execute on function public.rebalance_project_positions(uuid) from public, anon, authenticated;
grant execute on function public.rebalance_project_positions(uuid) to authenticated;

revoke execute on function public.rebalance_section_positions(uuid) from public, anon, authenticated;
grant execute on function public.rebalance_section_positions(uuid) to authenticated;
