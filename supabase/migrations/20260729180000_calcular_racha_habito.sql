-- calcular_racha_habito: racha actual y mejor racha de un hábito (D10 de
-- decisions.md — se calculan, nunca se guardan; D-B de design.md de
-- fase-3-habitos). `security invoker` para que la RLS de habits,
-- habit_completions y user_preferences siga activa con el rol del usuario
-- que invoca: si el hábito no existe o es de otro usuario, la primera
-- select no encuentra fila y la función devuelve un conjunto vacío, igual
-- que un select común contra una tabla con RLS.
--
-- `at` es el instante que cuenta como "ahora": por defecto `now()`, como
-- toda llamada real. Se recibe como parámetro (mismo patrón que
-- `buscar_tareas` en 20260729130000_buscar_tareas.sql) para que los tests
-- puedan fijar un instante exacto y verificar los bordes de la racha sin
-- depender del día en que corra la suite.
--
-- "Hoy", "el día terminó" y "la semana cerró" (D-G) se resuelven en
-- `user_preferences.timezone` del dueño del hábito, con el mismo mecanismo
-- que `buscar_tareas.ast_to_sql`: `(instante at time zone tz)::date`.
--
-- Las tres reglas de racha (D-C):
--
-- 'daily' y 'specific_days' comparten granularidad de día. Se arma la
-- secuencia de días relevantes desde `created_at` hasta hoy (todos para
-- 'daily'; solo los de `days_of_week` para 'specific_days', codificados
-- ISO 1 lunes … 7 domingo) y se agrupan en "islas" de días consecutivos
-- marcados con la técnica estándar de gaps-and-islands: cada día sin marca
-- suma 1 a un contador acumulado por fecha, y agrupar los días marcados por
-- ese contador da, para cada isla, su largo. La mejor racha es el largo
-- máximo entre todas las islas — incluye la racha actual si ya es la más
-- larga, sin necesidad de compararla aparte. El margen de gracia del día en
-- curso (tareas 1.6/1.7) es la única excepción: si el día relevante más
-- reciente es hoy y no tiene marca, se descarta de la secuencia antes de
-- calcular islas — el día todavía no terminó, así que no corta la racha —,
-- pero como un día sin marca nunca pertenece a ninguna isla, descartarlo no
-- cambia el largo de ninguna racha ya cerrada: solo cambia qué día se usa
-- para decidir cuál isla (si alguna) es "la actual".
--
-- 'times_per_week' (D-D, D-C): la unidad es la semana, siempre lunes a
-- domingo fijo — `date_trunc('week', …)` de Postgres ya trunca al lunes,
-- sin importar `week_starts_on`. Se evalúan solo semanas cerradas: ni la
-- semana de creación ni la semana en curso entran en el `generate_series`,
-- así que ninguna de las dos cuenta como cumplida ni como fallida. La
-- misma técnica de gaps-and-islands se aplica sobre semanas en vez de días.
--
-- Ningún tipo evalúa fechas anteriores a `created_at`: el `generate_series`
-- de ambas ramas arranca en la fecha de creación, nunca antes.
--
-- Desarchivar (D-F) no necesita lógica propia acá: mientras el hábito
-- estuvo archivado no se generaron marcas (se lo impide la capa de datos,
-- no esta función), así que esos días aparecen como días sin marca comunes
-- y corriente, que la racha actual ya trata como cualquier interrupción. La
-- mejor racha, al ser el máximo histórico, sigue reflejando lo alcanzado
-- antes de archivar.
create or replace function public.calcular_racha_habito(p_habit_id uuid, at timestamptz default now())
returns table (current_streak integer, best_streak integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_habit record;
  v_tz text;
  v_today date;
  v_created_date date;
  v_current_streak integer;
  v_best_streak integer;
begin
  select h.frequency_type, h.times_per_week, h.days_of_week, h.created_at, h.user_id
    into v_habit
    from public.habits h
    where h.id = p_habit_id;

  if not found then
    return;
  end if;

  select coalesce(up.timezone, 'America/Argentina/Buenos_Aires') into v_tz
  from public.user_preferences up
  where up.user_id = v_habit.user_id;
  v_tz := coalesce(v_tz, 'America/Argentina/Buenos_Aires');

  v_today := (at at time zone v_tz)::date;
  v_created_date := (v_habit.created_at at time zone v_tz)::date;

  if v_habit.frequency_type = 'times_per_week' then
    with weeks as (
      select gs::date as week_start
      from generate_series(
        (date_trunc('week', v_created_date::timestamp)::date + 7)::timestamp,
        (date_trunc('week', v_today::timestamp)::date - 7)::timestamp,
        interval '7 days'
      ) as gs
    ),
    week_marks as (
      select
        w.week_start,
        (
          select count(*)
          from public.habit_completions hc
          where hc.habit_id = p_habit_id
            and hc.completed_on between w.week_start and w.week_start + 6
        ) >= v_habit.times_per_week as met
      from weeks w
    ),
    islands as (
      select
        week_start,
        met,
        sum(case when not met then 1 else 0 end) over (order by week_start) as gap_id
      from week_marks
    ),
    runs as (
      select gap_id, count(*)::integer as run_length, max(week_start) as run_end
      from islands
      where met
      group by gap_id
    )
    select
      coalesce((select run_length from runs where run_end = (select max(week_start) from weeks)), 0),
      coalesce((select max(run_length) from runs), 0)
    into v_current_streak, v_best_streak;
  else
    with relevant_days as (
      select gs::date as day
      from generate_series(v_created_date::timestamp, v_today::timestamp, interval '1 day') as gs
      where v_habit.frequency_type = 'daily'
         or extract(isodow from gs)::smallint = any (v_habit.days_of_week)
    ),
    marked_days as (
      select
        day,
        exists (
          select 1 from public.habit_completions hc
          where hc.habit_id = p_habit_id and hc.completed_on = day
        ) as marked
      from relevant_days
    ),
    graced as (
      select day, marked
      from marked_days
      where not (day = v_today and not marked)
    ),
    islands as (
      select
        day,
        marked,
        sum(case when not marked then 1 else 0 end) over (order by day) as gap_id
      from graced
    ),
    runs as (
      select gap_id, count(*)::integer as run_length, max(day) as run_end
      from islands
      where marked
      group by gap_id
    )
    select
      coalesce((select run_length from runs where run_end = (select max(day) from graced)), 0),
      coalesce((select max(run_length) from runs), 0)
    into v_current_streak, v_best_streak;
  end if;

  current_streak := v_current_streak;
  best_streak := v_best_streak;
  return next;
end;
$$;

grant execute on function public.calcular_racha_habito(uuid, timestamptz) to authenticated;
