-- Infraestructura de envío de recordatorios (bloque 4, decisión D-C de
-- design.md): la función que reclama recordatorios vencidos antes de
-- enviarlos, el trigger que recalcula los relativos cuando cambia la fecha
-- u hora de la tarea (bloque 4.12), y el `pg_cron` que dispara la edge
-- function cada minuto. `pg_cron` y `pg_net` ya están instalados
-- (`20260729120000_extensions_and_spanish_unaccent.sql`) y sus funciones
-- viven en los esquemas fijos `cron`/`net` (no relocalizables: la cláusula
-- `with schema extensions` de esa migración no los mueve).

-- 1. Reclamar antes de enviar (D-C): un único `update ... returning`, con
-- `for update skip locked`, en lote de 200. Es la sentencia atómica que la
-- edge function invoca por `rpc`: dos ejecuciones solapadas del cron nunca
-- pueden reclamar el mismo recordatorio, porque `skip locked` hace que la
-- segunda transacción salte las filas que la primera ya bloqueó.
-- `security definer` es necesario acá: el cron no tiene un usuario
-- autenticado detrás, así que sin esto la RLS de `reminders` (acotada a
-- `auth.uid() = user_id`) no dejaría ver los recordatorios de nadie. El
-- `join` a `tasks` es para el título de la notificación (D2, texto plano);
-- sigue siendo una única sentencia con el `update` en la CTE, así que el
-- reclamo ocurre una sola vez.
create or replace function public.claim_due_reminders(p_limit integer default 200)
returns table (
  id uuid,
  user_id uuid,
  task_id uuid,
  title text
)
language sql
security definer
set search_path = public
as $$
  with claimed as (
    update public.reminders
    set delivered_at = now()
    where id in (
      select id from public.reminders
      where delivered_at is null and remind_at <= now()
      order by remind_at
      limit p_limit
      for update skip locked
    )
    returning id, user_id, task_id
  )
  select claimed.id, claimed.user_id, claimed.task_id, tasks.title
  from claimed
  join public.tasks on tasks.id = claimed.task_id;
$$;

revoke all on function public.claim_due_reminders(integer) from public;
grant execute on function public.claim_due_reminders(integer) to service_role;

-- 2. Recalcular los recordatorios relativos no entregados cuando cambia
-- `due_at` (bloque 4.12, requirement "Recálculo de recordatorios relativos
-- ante cambios de fecha u hora"). Sin `security definer`: corre con el
-- mismo rol que hizo el `update` sobre `tasks` (la persona autenticada
-- dueña de la tarea), y esa misma RLS de `reminders` ya la deja tocar sus
-- propias filas — igual que D-A, la RLS queda como última línea de
-- defensa, no hace falta levantarla acá.
--
-- Interpretación explícita, más allá de lo que el spec dice en forma
-- literal: si `due_at` pasa a NULL (se saca la hora, o se reemplaza por
-- `due_date`), un recordatorio relativo pendiente queda sin ancla válida.
-- El spec solo cubre el caso "cambia la hora", no "se saca la hora"; dejar
-- el `remind_at` viejo sin tocar dispararía en un momento que ya no tiene
-- sentido, así que acá se eliminan en vez de dejarlos con un valor stale.
create or replace function public.recalculate_relative_reminders()
returns trigger
language plpgsql
as $$
begin
  if new.due_at is null then
    delete from public.reminders
    where task_id = new.id
      and offset_minutes is not null
      and delivered_at is null;
  elsif new.due_at is distinct from old.due_at then
    update public.reminders
    set remind_at = new.due_at + make_interval(mins => offset_minutes)
    where task_id = new.id
      and offset_minutes is not null
      and delivered_at is null;
  end if;
  return new;
end;
$$;

create trigger tasks_recalculate_relative_reminders
  after update of due_at on public.tasks
  for each row
  execute function public.recalculate_relative_reminders();

-- 3. `pg_cron` cada minuto invocando la edge function con `pg_net` (bloque
-- 4.15). El proyecto todavía no tiene ni la edge function desplegada ni
-- las claves VAPID, así que el job se agenda ya, pero inerte: las dos
-- condiciones `exists` de más abajo hacen que no llame a nada hasta que en
-- Supabase (dashboard o SQL) se creen los dos secretos de Vault que
-- siguen. Sin esto, cada minuto intentaría un `net.http_post` con `url`
-- nulo.
--
--   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/enviar-recordatorios', 'edge_function_url');
--   select vault.create_secret('<la service_role key del proyecto>', 'service_role_key');
--
-- (En local, Docker expone la función en http://kong:8000/functions/v1/enviar-recordatorios
-- y la service_role key la da `supabase status`.)
select cron.schedule(
  'enviar-recordatorios',
  '* * * * *',
  $cron$
  select
    net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_url' limit 1),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
      ),
      body := '{}'::jsonb
    )
  where exists (select 1 from vault.decrypted_secrets where name = 'edge_function_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'service_role_key');
  $cron$
);
