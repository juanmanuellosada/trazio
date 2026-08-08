-- Recordatorios de hábito (openspec/changes/recordatorios-de-habitos):
-- dos tablas y la función de reclamo, todo en un mismo archivo (regla del
-- proyecto: la RLS va con la migración que crea la tabla).
--
-- D-A del design: un hábito no es una fila con un instante fijo, es una
-- regla. Por eso no hay una tabla de "ocurrencias futuras" — el cron
-- reevalúa cada minuto contra el estado actual de `habits`,
-- `habit_schedule_overrides`, `habit_skips` y `habit_completions`, en
-- `claim_due_habit_reminders` más abajo. Saltear, marcar, reprogramar,
-- archivar o editar un hábito cancela o corre su aviso sin que nada tenga
-- que invalidarse.

-- 1. habit_reminders: qué recordatorios tiene un hábito, siempre relativos
-- a su hora (nunca puntuales — un hábito se repite, un instante fijo solo
-- valdría el primer día). `offset_minutes <= 0`: nunca después de la hora
-- del hábito. `unique (habit_id, offset_minutes)` evita el desfase
-- duplicado sin necesidad de validarlo en la interfaz. `user_id` propio,
-- no derivado por join (D11 de decisions.md, mismo criterio que las otras
-- tablas de hábitos).
create table public.habit_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  offset_minutes integer not null check (offset_minutes <= 0),
  unique (habit_id, offset_minutes)
);

alter table public.habit_reminders enable row level security;

-- Ver el comentario equivalente en 20260726011557_profiles.sql: sin este
-- grant, las tablas creadas por el rol `postgres` (el que usan las
-- migraciones) quedan inaccesibles para `authenticated`/`service_role`
-- aunque RLS esté bien configurado.
grant select, insert, update, delete on public.habit_reminders to authenticated, service_role;

create policy "habit_reminders_select_own" on public.habit_reminders
  for select using ((select auth.uid()) = user_id);

create policy "habit_reminders_insert_own" on public.habit_reminders
  for insert with check ((select auth.uid()) = user_id);

create policy "habit_reminders_update_own" on public.habit_reminders
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "habit_reminders_delete_own" on public.habit_reminders
  for delete using ((select auth.uid()) = user_id);

create index habit_reminders_user_id_idx on public.habit_reminders (user_id);

-- Entra en la publicación de Realtime: editar los recordatorios de un
-- hábito en una pestaña tiene que verse en las demás (a diferencia de
-- `habit_schedule_overrides`/`habit_skips`, que nadie suscribe). El
-- cliente filtra por `user_id` (`lib/realtime/subscribe.ts`), así que hace
-- falta `replica identity full` para que el DELETE lleve la fila vieja
-- completa y el filtro se pueda evaluar (D37 de decisions.md, mismo bug
-- que arregló 20260731000000_realtime_replica_identity_full.sql).
alter table public.habit_reminders replica identity full;
alter publication supabase_realtime add table public.habit_reminders;

-- 2. habit_reminder_deliveries: el mecanismo de entrega única (D-B del
-- design). Una tarea marca `delivered_at` sobre una fila que ya existe; un
-- hábito no tiene esa fila de antemano, así que acá la garantía se
-- invierte: la fila se CREA al reclamar, y es la clave primaria compuesta
-- —no un índice cualquiera— la que impide el duplicado. Dos ejecuciones
-- solapadas del cron insertando la misma combinación: la primera inserta,
-- la segunda choca contra la PK y no inserta nada. Es la misma propiedad
-- que da `for update skip locked` en `claim_due_reminders`, obtenida por
-- la clave en vez de por el bloqueo.
--
-- `date` es la fecha LOCAL del usuario (no UTC): así "el aviso de las
-- 7:00 del martes" es una sola cosa aunque el usuario cambie de zona
-- horaria a mitad de día.
--
-- Fuera de la publicación de Realtime a propósito: ninguna interfaz se
-- suscribe a esta tabla, mismo criterio que `habit_schedule_overrides` y
-- `habit_skips`.
create table public.habit_reminder_deliveries (
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  offset_minutes integer not null,
  delivered_at timestamptz not null default now(),
  primary key (habit_id, date, offset_minutes)
);

alter table public.habit_reminder_deliveries enable row level security;

grant select, insert, update, delete on public.habit_reminder_deliveries to authenticated, service_role;

create policy "habit_reminder_deliveries_select_own" on public.habit_reminder_deliveries
  for select using ((select auth.uid()) = user_id);

create policy "habit_reminder_deliveries_insert_own" on public.habit_reminder_deliveries
  for insert with check ((select auth.uid()) = user_id);

create policy "habit_reminder_deliveries_update_own" on public.habit_reminder_deliveries
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "habit_reminder_deliveries_delete_own" on public.habit_reminder_deliveries
  for delete using ((select auth.uid()) = user_id);

create index habit_reminder_deliveries_user_id_idx on public.habit_reminder_deliveries (user_id);

-- 3. claim_due_habit_reminders: el reclamo (D-A/D-B/D-D/D-F/D-G del
-- design). `security definer` porque el cron no tiene un usuario
-- autenticado detrás (mismo motivo que `claim_due_reminders`).
--
-- El bloque `due` es, término por término, la definición de "hábito
-- pendiente de hoy" que ya vive en TypeScript
-- (`lib/habits/pending-today.ts`: `isHabitPendingToday`, más el salteo —
-- ver el comentario cruzado allá, D-G del design.md de este cambio): toca
-- por su frecuencia, la fecha no es anterior a su creación, el hábito no
-- está archivado, no tiene marca en `habit_completions` ni fila en
-- `habit_skips` para ese día. Son la misma regla en dos lenguajes porque
-- no hay forma razonable de unificarlas — la pantalla no puede llamar a la
-- base en cada render, y el cron no puede correr TypeScript del cliente —
-- así que si algún día se separan, tiene que ser con un test en rojo
-- (`supabase/tests/habit-reminders-claim.test.ts`), nunca en silencio.
--
-- `up` (lateral): la zona horaria y la hora de referencia del usuario, más
-- `fecha_local` ya resuelta en esa zona — sale de ahí, no del servidor,
-- para que un hábito de las 23:30 en Buenos Aires se evalúe contra el día
-- que corresponde. La hora efectiva de cada ocurrencia sigue la prioridad
-- completa en un solo `coalesce`: override del día → hora habitual del
-- hábito → hora de referencia (hábito "todo el día").
--
-- `at` es el instante que cuenta como "ahora": por defecto `now()`, como
-- toda llamada real desde la edge function (que invoca `rpc` solo con
-- `p_limit`, así que en producción esto se comporta exactamente como
-- `claim_due_habit_reminders(p_limit integer)`, la firma del spec). Se
-- recibe como parámetro, mismo patrón que `calcular_racha_habito`
-- (`20260729180000_calcular_racha_habito.sql`), para que los tests fijen
-- un instante exacto en vez de pelear contra el reloj real — indispensable
-- para casos como el cruce de medianoche o la ventana de gracia, donde el
-- resultado depende de estar a un minuto exacto de distancia.
create or replace function public.claim_due_habit_reminders(p_limit integer default 200, at timestamptz default now())
returns table (
  habit_id uuid,
  user_id uuid,
  name text
)
language plpgsql
security definer
set search_path = public
as $$
-- `returns table (habit_id, user_id, name)` declara esos tres nombres como
-- variables PL/pgSQL en todo el cuerpo de la función (no solo en el
-- `return`), y las CTEs de más abajo tienen columnas con esos mismos
-- nombres (`habits.id as habit_id`, `habits.user_id`, `habits.name`) — sin
-- este pragma, cada referencia sin calificar a `habit_id`/`user_id`/`name`
-- es ambigua entre la variable y la columna ("column reference ... is
-- ambiguous"). `use_column` resuelve siempre a favor de la columna de la
-- consulta, que es lo que se quiere acá.
#variable_conflict use_column
begin
  -- Purga de entregas viejas (D-I): una sentencia aparte, no forma parte
  -- del `insert ... on conflict` de más abajo — la entrega única no
  -- depende de que las dos ocurran juntas, solo de que el `insert` en sí
  -- sea una única sentencia.
  delete from public.habit_reminder_deliveries
  where delivered_at < at - interval '7 days';

  return query
  with due as (
    select
      h.id as habit_id,
      h.user_id,
      h.name,
      up.fecha_local,
      up.timezone,
      hr.offset_minutes,
      coalesce(hso.scheduled_time, h.scheduled_time, up.reference_time) as hora_efectiva
    from public.habits h
    join public.habit_reminders hr on hr.habit_id = h.id
    join lateral (
      select
        pref.timezone,
        pref.reference_time,
        (at at time zone pref.timezone)::date as fecha_local
      from public.user_preferences pref
      where pref.user_id = h.user_id
    ) up on true
    left join public.habit_schedule_overrides hso
      on hso.habit_id = h.id and hso.date = up.fecha_local
    where h.is_archived = false
      and up.fecha_local >= (h.created_at at time zone up.timezone)::date
      and (
        h.frequency_type <> 'specific_days'
        or extract(isodow from up.fecha_local)::smallint = any (h.days_of_week)
      )
      and not exists (
        select 1 from public.habit_completions hc
        where hc.habit_id = h.id and hc.completed_on = up.fecha_local
      )
      and not exists (
        select 1 from public.habit_skips hs
        where hs.habit_id = h.id and hs.date = up.fecha_local
      )
  ),
  momentos as (
    select
      habit_id, user_id, name, fecha_local, offset_minutes,
      ((fecha_local + hora_efectiva) at time zone timezone) + make_interval(mins => offset_minutes) as momento
    from due
  ),
  vencidos as (
    select habit_id, user_id, name, fecha_local, offset_minutes
    from momentos
    -- Ventana de gracia de 15 minutos, con cota inferior (D-D) — a
    -- diferencia de `claim_due_reminders`, que no la tiene. Ahí cada
    -- recordatorio es una fila que existe desde que se creó: "vencido
    -- hace tres días" es una sola fila vieja. Acá una ocurrencia se
    -- calcula al vuelo contra la regla (D-A), así que sin cota inferior
    -- la primera corrida después de este despliegue encontraría vencidas
    -- TODAS las ocurrencias pasadas de TODOS los hábitos con recordatorio
    -- y las mandaría juntas de una — el peor arranque posible para una
    -- función que depende de que el usuario confíe en el aviso.
    where momento <= at
      and momento > at - interval '15 minutes'
    order by momento
    limit p_limit
  ),
  inserted as (
    -- El reclamo: una única sentencia (D-B). `insert ... on conflict do
    -- nothing returning` devuelve solo las filas que efectivamente
    -- insertó — la clave primaria compuesta de `habit_reminder_deliveries`
    -- es el mecanismo de entrega única, no un `update` posterior.
    insert into public.habit_reminder_deliveries (habit_id, user_id, date, offset_minutes, delivered_at)
    select habit_id, user_id, fecha_local, offset_minutes, at
    from vencidos
    on conflict (habit_id, date, offset_minutes) do nothing
    returning habit_id, user_id, date
  )
  select inserted.habit_id, inserted.user_id, h.name
  from inserted
  join public.habits h on h.id = inserted.habit_id;
end;
$$;

revoke all on function public.claim_due_habit_reminders(integer, timestamptz) from public;
grant execute on function public.claim_due_habit_reminders(integer, timestamptz) to service_role;
