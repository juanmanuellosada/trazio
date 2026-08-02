-- Amplía el disparador de recálculo de recordatorios relativos
-- (recordatorios-con-hora-de-referencia, D-B/D-D): los relativos ahora también
-- valen sobre tareas con solo fecha (`due_date`, sin `due_at`), así que hacen
-- falta dos cambios sobre `recalculate_relative_reminders`
-- (`20260729140000_reminders_claim_recalc_and_cron.sql`):
--
--   1. Escuchar también los cambios de `due_date`, no solo los de `due_at` — sin
--      esto, un relativo sobre una tarea con solo fecha nunca se movería al
--      cambiarle el día.
--   2. Dejar de BORRAR los relativos pendientes cuando la tarea se queda sin hora
--      pero conserva su día. Antes, quedarse sin hora equivalía a quedarse sin
--      referencia, así que se borraban. Ahora la referencia es
--      `user_preferences.reference_time`: quitarle la hora a una tarea que
--      conserva su día recalcula contra esa hora, en vez de borrar. Solo se
--      borra cuando la tarea queda sin ninguna fecha (`due_at` y `due_date`
--      ambos null): ahí sí deja de haber cualquier referencia.
--
-- El cálculo para una tarea con solo fecha combina `due_date` + `reference_time`
-- + `user_preferences.timezone` con `at time zone`, el mismo patrón que usa
-- `calcular_racha_habito`/`buscar_tareas` para ir de fecha local a instante (ver
-- comentario de `20260729180000_calcular_racha_habito.sql`). Sin `security
-- definer`, igual que antes: corre con el rol de quien edita su propia tarea, y
-- la RLS de `user_preferences`/`reminders` (`auth.uid() = user_id`) ya lo deja
-- leer/tocar sus propias filas.
create or replace function public.recalculate_relative_reminders()
returns trigger
language plpgsql
as $$
begin
  if new.due_at is null and new.due_date is null then
    delete from public.reminders
    where task_id = new.id
      and offset_minutes is not null
      and delivered_at is null;
  elsif new.due_at is not null then
    if new.due_at is distinct from old.due_at then
      update public.reminders
      set remind_at = new.due_at + make_interval(mins => offset_minutes)
      where task_id = new.id
        and offset_minutes is not null
        and delivered_at is null;
    end if;
  elsif new.due_date is distinct from old.due_date then
    update public.reminders r
    set remind_at = (
      (new.due_date::timestamp + up.reference_time) at time zone up.timezone
    ) + make_interval(mins => r.offset_minutes)
    from public.user_preferences up
    where r.task_id = new.id
      and r.offset_minutes is not null
      and r.delivered_at is null
      and up.user_id = r.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_recalculate_relative_reminders on public.tasks;

create trigger tasks_recalculate_relative_reminders
  after update of due_at, due_date on public.tasks
  for each row
  execute function public.recalculate_relative_reminders();
