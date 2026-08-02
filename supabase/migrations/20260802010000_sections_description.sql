-- sections: agrega `description`, opcional, igual que `projects.description`
-- (20260726011602_projects.sql). Sin backfill: las secciones existentes
-- quedan con descripción vacía, que es exactamente lo que significa.
--
-- No hace falta tocar RLS: las políticas de `sections`
-- (20260726011607_sections.sql) son por fila (`user_id = auth.uid()`), no
-- por columna, y el `grant` tampoco enumera columnas.
alter table public.sections add column description text;
