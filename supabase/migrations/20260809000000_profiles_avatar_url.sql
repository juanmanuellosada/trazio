-- Foto de perfil de Google (openspec/changes/foto-de-perfil-de-google).
--
-- `profiles.avatar_url` existe desde `20260726011557_profiles.sql` pero
-- `handle_new_user()` nunca la llenó: solo copiaba `full_name`. Google manda
-- la foto en los mismos metadatos, bajo 'avatar_url' o 'picture' según el
-- flujo (D-A) — mismo `coalesce` que ya se usa para el nombre.
--
-- El backfill de las cuentas existentes va en este mismo archivo (D-C,
-- mismo criterio que `20260808010000_user_preferences_seeded_at.sql`): la
-- foto ya está en los metadatos de esas cuentas y nunca se copió, así que
-- sin backfill la única forma de verla sería desloguearse.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text;
  v_avatar_url text;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name'
  );
  v_avatar_url := coalesce(
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'picture'
  );

  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, v_full_name, v_avatar_url);

  insert into public.user_preferences (user_id)
  values (new.id);

  insert into public.projects (user_id, name, is_inbox, color, icon, position, parent_id)
  values (new.id, 'Bandeja de entrada', true, null, null, 0, null);

  return new;
end;
$$;

update public.profiles p
set avatar_url = coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
where u.id = p.id
  and p.avatar_url is null
  and coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') is not null;

-- Refresco al iniciar sesión (D-B): una foto copiada una sola vez al
-- registrarse queda vieja para siempre si la persona la cambia en Google.
-- `handle_new_user()` solo corre en el INSERT del alta, así que este es un
-- trigger aparte sobre `UPDATE` de `auth.users` — Supabase Auth reescribe
-- `raw_user_meta_data` en cada login con Google (resincroniza los claims
-- del proveedor), lo que dispara el `WHEN` de abajo. El login con correo y
-- contraseña no toca `raw_user_meta_data`, así que nunca lo dispara — no
-- hace falta distinguir el proveedor a mano. Solo `avatar_url`: el nombre
-- queda fuera del alcance de esta propuesta.
create or replace function public.handle_user_login_avatar_refresh()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_avatar_url text;
begin
  v_avatar_url := coalesce(
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'picture'
  );

  update public.profiles
  set avatar_url = v_avatar_url
  where id = new.id
    and avatar_url is distinct from v_avatar_url;

  return new;
end;
$$;

create trigger on_auth_user_login_avatar_refresh
  after update on auth.users
  for each row
  when (new.raw_user_meta_data is distinct from old.raw_user_meta_data)
  execute function public.handle_user_login_avatar_refresh();

-- Mismo criterio que el resto de las funciones de trigger de esta tabla:
-- sin razón para quedar expuestas como RPC.
revoke execute on function public.handle_user_login_avatar_refresh() from anon, authenticated;
