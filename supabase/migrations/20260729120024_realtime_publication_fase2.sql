-- Suma a la publicación de Realtime las tres tablas nuevas de esta fase que
-- la necesitan: comments, reminders y filters. push_subscriptions y
-- view_preferences no van, igual que profiles y user_preferences en fase 1
-- (20260726013253_realtime_publication.sql): no hay interfaz que se
-- suscriba a cambios ahí.
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.reminders;
alter publication supabase_realtime add table public.filters;
