-- Marca de filtro de ejemplo (openspec/changes/onboarding-con-ejemplos, ampliación
-- decidida con el dueño: el contenido sembrado suma un filtro guardado, la
-- función de fase 2 que motivó este pedido porque hasta el propio dueño se había
-- olvidado de que existe). Mismo criterio que `projects.is_example` y
-- `habits.is_example` (20260808020000_projects_habits_is_example.sql): "Borrar
-- los ejemplos" tiene que encontrar el filtro sin depender de su nombre, y el
-- índice único parcial hace que, como máximo, exista un filtro de ejemplo por
-- cuenta (el sembrado corre una sola vez, D-B).
alter table public.filters
  add column is_example boolean not null default false;

create unique index filters_one_example_per_user_idx on public.filters (user_id)
  where is_example = true;
