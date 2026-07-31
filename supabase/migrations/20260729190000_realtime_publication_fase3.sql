-- Suma a la publicación de Realtime las dos tablas de esta fase que la
-- necesitan: habits y habit_completions. habit_schedule_overrides queda
-- afuera: no hay interfaz que se suscriba a cambios ahí (D-A de design.md
-- de fase-3-habitos, igual que push_subscriptions y view_preferences en
-- fase 2).
alter publication supabase_realtime add table public.habits;
alter publication supabase_realtime add table public.habit_completions;
