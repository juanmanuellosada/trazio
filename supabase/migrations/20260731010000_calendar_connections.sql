-- calendar_connections: conexión de un usuario con su cuenta de Google
-- Calendar (docs/data-model.md, capacidad `esquema-datos` de
-- openspec/changes/fase-4-calendario). Última tabla del esquema completo.
--
-- `user_id` es la clave primaria, no un id propio: igual que en profiles
-- (20260726011557_profiles.sql), un usuario tiene a lo sumo una conexión,
-- así que no hace falta una columna id redundante.
--
-- `refresh_token` guarda únicamente el resultado de cifrarlo con
-- AES-256-GCM (decisión D-A de design.md): nonce, tag de autenticación y
-- ciphertext, nunca el token de Google en claro. Cifrar y descifrar es
-- responsabilidad exclusiva de lib/calendar/crypto.ts, del lado servidor.
create table public.calendar_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null default 'google',
  refresh_token text not null,
  enabled_calendar_ids text[],
  status text not null default 'active'
    check (status in ('active', 'needs_reauth'))
);

alter table public.calendar_connections enable row level security;

-- Ver el comentario equivalente en 20260726011557_profiles.sql: sin este
-- grant, las tablas creadas por el rol `postgres` (el que usan las
-- migraciones) quedan inaccesibles para `authenticated`/`service_role`
-- aunque RLS esté bien configurado.
grant select, insert, update, delete on public.calendar_connections to authenticated, service_role;

create policy "calendar_connections_select_own" on public.calendar_connections
  for select using ((select auth.uid()) = user_id);

create policy "calendar_connections_insert_own" on public.calendar_connections
  for insert with check ((select auth.uid()) = user_id);

create policy "calendar_connections_update_own" on public.calendar_connections
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "calendar_connections_delete_own" on public.calendar_connections
  for delete using ((select auth.uid()) = user_id);

-- La primary key ya es un índice sobre `user_id`, que cumple acá el rol que
-- en el resto de las tablas cumple el índice explícito sobre `user_id`.

-- No se suma a la publicación de Realtime: `sincronizacion-tiempo-real`
-- fija que calendar_connections no se replica (spec de esquema-datos de
-- esta fase), a diferencia de las tablas de fase 1, 2 y 3.
