-- Habilita la replicación de Realtime sobre las cinco tablas de fase 1
-- que la necesitan. profiles, user_preferences no van: no hay interfaz que
-- se suscriba a cambios ahí.
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.sections;
alter publication supabase_realtime add table public.labels;
alter publication supabase_realtime add table public.task_labels;
