-- Amplía el check de default_view para aceptar 'proximos' (vista Próximos
-- de fase 2), sin reemplazar la tabla ni tocar la migración original
-- (20260726011559_user_preferences.sql).
alter table public.user_preferences
  drop constraint user_preferences_default_view_check;

alter table public.user_preferences
  add constraint user_preferences_default_view_check
  check (default_view in ('bandeja', 'hoy', 'proximos'));
