-- Revierte 20260726013242_projects_color_allow_inbox_blue.sql: en vez de que
-- `projects.color` acepte el hex '#283B56' como valor especial de la
-- Bandeja, pasa a ser nulo para ella. Mismo criterio que ya usa `icon`
-- (también nulo para la Bandeja, por ser un proyecto especial que no se
-- puede renombrar, borrar ni recolorear desde la interfaz): la paleta
-- seleccionable por el usuario queda como vocabulario cerrado de diez
-- colores, sin un valor ajeno colado en el medio. Detalle en D27 de
-- docs/decisions.md.
--
-- Orden dentro de esta migración: hay que sacar el `not null` y migrar los
-- datos existentes ANTES de poner el constraint nuevo, porque el
-- constraint nuevo ya no admite el hex viejo — si se pusiera primero,
-- cualquier Bandeja existente con '#283B56' lo violaría.

-- 1. `color` pasa a admitir nulo.
alter table public.projects alter column color drop not null;

-- 2. Bandejas existentes: el hex de marca se reemplaza por nulo. El
-- constraint viejo (`color in (..., '#283B56')`) no se ve afectado por
-- esto: un CHECK siempre deja pasar NULL.
update public.projects set color = null where is_inbox = true;

-- 3. Constraint nuevo: solo la Bandeja puede tener `color` nulo, y el
-- resto tiene que ser uno de los diez colores de la paleta (nunca el hex
-- viejo, nunca nulo). Se escribe con `is not null and color in (...)` en
-- vez de `not is_inbox and color in (...)` a secas porque un CHECK que da
-- NULL se considera cumplido: `color in (...)` con `color` nulo da NULL, no
-- false, así que sin el `is not null` explícito un proyecto normal con
-- color nulo pasaría el constraint sin querer.
alter table public.projects drop constraint projects_color_check;

alter table public.projects add constraint projects_color_check
  check (
    (is_inbox and color is null)
    or
    (not is_inbox and color is not null and color in (
      'amarillo', 'lima', 'verde', 'turquesa', 'celeste',
      'indigo', 'violeta', 'purpura', 'magenta', 'marron'
    ))
  );

-- 4. Trigger de aprovisionamiento: la Bandeja se crea con `color` nulo,
-- no con el hex de marca. El resto de la función queda igual que en
-- 20260726013248_account_provisioning_trigger.sql.
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
  values (new.id, 'Bandeja de entrada', true, null, null, 0, null);

  return new;
end;
$$;
