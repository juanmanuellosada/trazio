-- Aprovisionamiento de cuenta: al insertarse una fila en auth.users, crea
-- en una sola transacción profiles, user_preferences (con sus defaults) y
-- el proyecto Bandeja de entrada. Los tres inserts corren dentro de la
-- misma transacción que el insert en auth.users porque los triggers de
-- Postgres son parte de la transacción que los dispara: si cualquiera de
-- los tres falla, el insert original se revierte y no queda ni perfil, ni
-- preferencias, ni Bandeja sueltos.
--
-- Corre en el contexto de Supabase Auth (no como el usuario recién
-- creado, que todavía no tiene sesión), así que necesita SECURITY DEFINER
-- para poder escribir en las tablas de public. search_path acotado y
-- nombres calificados, mismo patrón que projects_check_hierarchy() y
-- projects_protect_inbox(). Vale tanto para alta con contraseña como con
-- Google OAuth: Supabase Auth completa raw_user_meta_data en los dos
-- flujos, con 'full_name' en el primero y con 'full_name' o 'name' según
-- el proveedor en el segundo.
--
-- Valores iniciales de la Bandeja según la sección B3 del design: el
-- color '#283B56' lo admite projects_color_check desde la migración
-- 20260726013242_projects_color_allow_inbox_blue.sql.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name'
  );

  insert into public.profiles (id, full_name)
  values (new.id, v_full_name);

  insert into public.user_preferences (user_id)
  values (new.id);

  insert into public.projects (user_id, name, is_inbox, color, icon, position, parent_id)
  values (new.id, 'Bandeja de entrada', true, '#283B56', null, 0, null);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Mismo criterio que la corrección de seguridad de esta tanda: función de
-- trigger SECURITY DEFINER, sin razón para quedar expuesta como RPC.
revoke execute on function public.handle_new_user() from anon, authenticated;
