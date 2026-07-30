-- push_subscriptions: una fila por dispositivo suscripto a notificaciones
-- push. Si el envío devuelve 404 o 410, la edge function borra la fila.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Ver el comentario equivalente en 20260726011557_profiles.sql: sin este
-- grant, las tablas creadas por el rol `postgres` (el que usan las
-- migraciones) quedan inaccesibles para `authenticated`/`service_role`
-- aunque RLS esté bien configurado.
grant select, insert, update, delete on public.push_subscriptions to authenticated, service_role;

create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using ((select auth.uid()) = user_id);

create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check ((select auth.uid()) = user_id);

create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using ((select auth.uid()) = user_id);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
