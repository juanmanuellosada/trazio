-- Bug de fase 1 que llegó intacto hasta acá: los DELETE nunca se propagaban
-- por Realtime a ninguna tabla. Causa: con `replica identity default` (el
-- default de Postgres), la fila vieja que Postgres manda al WAL en un
-- DELETE trae solo la primary key. Los ocho canales de
-- `lib/realtime/subscribe.ts` se suscriben filtrando por
-- `filter: user_id=eq.<uuid>`, y como esa columna no viaja en el DELETE,
-- Realtime no puede evaluar el filtro y descarta el evento sin avisar.
--
-- La solución estándar de Supabase para este caso —filtrar por una columna
-- que no es la PK— es `replica identity full`: manda la fila vieja
-- completa (no solo la PK) en cada UPDATE y DELETE, así el filtro por
-- `user_id` sí se puede evaluar. El costo es más bytes en el WAL por cada
-- UPDATE/DELETE (la fila vieja completa en vez de solo la PK); para una
-- app personal con el volumen de escritura de Trazio es despreciable, y es
-- preferible a más ida y vuelta con vistas o columnas replicadas.
--
-- Se aplica a las ocho tablas que hoy suscribe un cliente con filtro por
-- `user_id` (ver `lib/realtime/subscribe.ts`). `labels` y `task_labels`
-- están en la publicación `supabase_realtime` desde fase 1 mirando a
-- fases futuras, pero ningún cliente se suscribe a ellas todavía — no
-- tiene sentido pagar el costo de `full` para un filtro que nadie evalúa.
-- Si en algún momento se agrega una suscripción a `labels` o
-- `task_labels`, hay que sumarlas acá también.
alter table public.tasks replica identity full;
alter table public.projects replica identity full;
alter table public.sections replica identity full;
alter table public.comments replica identity full;
alter table public.reminders replica identity full;
alter table public.filters replica identity full;
alter table public.habits replica identity full;
alter table public.habit_completions replica identity full;
