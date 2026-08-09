-- Marca de proyecto/hábito de ejemplo (openspec/changes/onboarding-con-ejemplos,
-- D-D): la acción "Borrar los ejemplos" tiene que encontrar el proyecto y el
-- hábito que sembró la cuenta sin depender de su nombre (la persona puede
-- renombrarlos) ni de una coincidencia de fecha con `seeded_at`. `is_example` es
-- esa marca explícita, mismo criterio que `is_inbox`/`is_favorite`/`is_archived`
-- que ya tiene `projects`.
--
-- El índice único parcial replica el de `projects_one_inbox_per_user_idx`
-- (20260726011602_projects.sql): el sembrado corre como máximo una vez por
-- cuenta (D-B), así que a lo sumo puede existir un proyecto y un hábito de
-- ejemplo por usuario — el índice lo hace imposible de violar en la base, no
-- solo una convención del código que siembra.
alter table public.projects
  add column is_example boolean not null default false;

alter table public.habits
  add column is_example boolean not null default false;

create unique index projects_one_example_per_user_idx on public.projects (user_id)
  where is_example = true;

create unique index habits_one_example_per_user_idx on public.habits (user_id)
  where is_example = true;
