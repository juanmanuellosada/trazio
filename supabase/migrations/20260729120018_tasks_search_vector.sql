-- Búsqueda de tareas (D-B de design.md): description_text es una copia en
-- texto plano de la descripción (jsonb de Tiptap, no indexable
-- directamente), que la aplicación escribe en el mismo update que
-- description. search_vector es una columna generada sobre título y
-- descripción, con la configuración spanish_unaccent creada en
-- 20260729120000_extensions_and_spanish_unaccent.sql — tiene que existir
-- antes de esta migración o la columna generada no se puede crear, porque
-- to_tsvector('spanish_unaccent', …) solo es IMMUTABLE una vez que esa
-- configuración ya existe.
alter table public.tasks add column description_text text;

-- La configuración va como 'extensions.spanish_unaccent'::regconfig (no como
-- texto plano sin calificar): el cast texto->regconfig se resuelve al correr
-- este ALTER TABLE, con el search_path del rol que aplica la migración, que
-- en Supabase hosteado no siempre incluye `extensions` (mismo motivo que en
-- 20260729120000_extensions_and_spanish_unaccent.sql).
alter table public.tasks add column search_vector tsvector
  generated always as (
    to_tsvector('extensions.spanish_unaccent'::regconfig, title || ' ' || coalesce(description_text, ''))
  ) stored;

create index tasks_search_vector_idx on public.tasks using gin (search_vector);
