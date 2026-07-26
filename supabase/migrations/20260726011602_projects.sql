-- projects: proyectos del usuario, en árbol de hasta 3 niveles.
--
-- El anidamiento (máximo 3 niveles, sin ciclos) no se puede expresar como
-- check constraint simple porque depende de leer otras filas de la misma
-- tabla (la cadena de `parent_id`). Se resuelve con una función + trigger
-- que camina esa cadena en cada insert/update relevante.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- on delete cascade: borrar un proyecto borra su subárbol completo
  -- (subproyectos, y por sus propios FK, las secciones y tareas de cada
  -- uno), coherente con que el borrado de un proyecto ya se documenta
  -- como cascada hacia sus secciones y tareas.
  parent_id uuid references public.projects (id) on delete cascade,
  name text not null,
  -- Paleta fija: los mismos diez colores con nombre de
  -- lib/validation/colors.ts (PROJECT_COLOR_IDS), para que la base y Zod
  -- no diverjan.
  color text not null
    check (color in (
      'amarillo', 'lima', 'verde', 'turquesa', 'celeste',
      'indigo', 'violeta', 'purpura', 'magenta', 'marron'
    )),
  icon text,
  description text,
  preferred_view text not null default 'list'
    check (preferred_view in ('list', 'board')),
  is_inbox boolean not null default false,
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  position numeric not null
);

alter table public.projects enable row level security;

-- Ver el comentario equivalente en 20260726011557_profiles.sql: sin este
-- grant, las tablas creadas por el rol `postgres` (el que usan las
-- migraciones) quedan inaccesibles para `authenticated`/`service_role`
-- aunque RLS esté bien configurado.
grant select, insert, update, delete on public.projects to authenticated, service_role;

create policy "projects_select_own" on public.projects
  for select using ((select auth.uid()) = user_id);

create policy "projects_insert_own" on public.projects
  for insert with check ((select auth.uid()) = user_id);

create policy "projects_update_own" on public.projects
  for update using ((select auth.uid()) = user_id)
             with check ((select auth.uid()) = user_id);

create policy "projects_delete_own" on public.projects
  for delete using ((select auth.uid()) = user_id);

create index projects_user_id_idx on public.projects (user_id);

-- Un solo proyecto con is_inbox = true por usuario.
create unique index projects_one_inbox_per_user_idx on public.projects (user_id)
  where is_inbox = true;

-- Anidamiento: máximo 3 niveles, sin ciclos. Camina la cadena de
-- parent_id hacia la raíz. security definer + search_path vacío para que
-- la validación vea la cadena completa sin depender de qué filas expone
-- RLS a quien dispara el trigger. No es invocable como RPC —devuelve
-- trigger, y PostgREST no expone funciones de ese tipo— así que definer
-- no amplía superficie de ataque.
create or replace function public.projects_check_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_id uuid;
  depth int := 1;
begin
  if new.parent_id is null then
    return new;
  end if;

  current_id := new.parent_id;

  loop
    if current_id = new.id then
      raise exception 'Un proyecto no puede ser su propio ancestro';
    end if;

    select parent_id into current_id
    from public.projects
    where id = current_id;

    exit when current_id is null;

    depth := depth + 1;

    if depth >= 3 then
      raise exception 'Los proyectos admiten como máximo 3 niveles de anidamiento';
    end if;
  end loop;

  return new;
end;
$$;

create trigger projects_check_hierarchy_trigger
  before insert or update of parent_id on public.projects
  for each row
  execute function public.projects_check_hierarchy();

-- FK de user_preferences.default_project_id, agregada acá porque
-- `projects` no existía todavía en la migración que crea
-- user_preferences (20260726011559_user_preferences.sql).
alter table public.user_preferences
  add constraint user_preferences_default_project_id_fkey
  foreign key (default_project_id) references public.projects (id) on delete set null;
