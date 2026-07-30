-- Extensiones de fase 2: unaccent para normalizar acentos en la búsqueda de
-- texto (D-B de design.md), y pg_cron + pg_net para programar y despachar
-- el envío de recordatorios (D-C). En Supabase las tres viven en el
-- esquema `extensions`, no en `public`.
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Configuración de búsqueda propia: unaccent() no es IMMUTABLE, así que no
-- puede usarse dentro de una columna generada (ver tasks.search_vector,
-- agregada más adelante en esta misma tanda). Copiando la configuración
-- `spanish` y alterando su mapeo para pasar primero por unaccent y después
-- por spanish_stem, to_tsvector('spanish_unaccent', …) queda IMMUTABLE y
-- sigue derivando correctamente: "reunion" encuentra "reunión" por el
-- unaccent, "reuniones" encuentra "reunión" por el spanish_stem, y
-- "renuion" no encuentra nada porque no hay corrección de tipeos.
-- El diccionario va calificado con su esquema (`extensions.unaccent`): en
-- Supabase hosteado el `search_path` del rol que corre las migraciones no
-- siempre incluye `extensions`, y sin calificar esto falla con "text search
-- dictionary unaccent does not exist" (reproducido localmente forzando un
-- search_path sin extensions). spanish_stem no necesita calificarse: vive en
-- pg_catalog, que Postgres busca siempre sin importar el search_path.
create text search configuration extensions.spanish_unaccent (copy = spanish);
alter text search configuration extensions.spanish_unaccent
  alter mapping for hword, hword_part, word with extensions.unaccent, spanish_stem;
