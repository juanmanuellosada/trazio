-- Ajuste para apagar el sonido de confirmación al completar (sonido-al-completar,
-- D-D): primer booleano de `user_preferences` (hoy son todos enumerados de texto o
-- numéricos). Viene encendido, decisión del dueño. RLS no se toca: las políticas de
-- 20260726011559_user_preferences.sql son por fila y ya cubren cualquier columna.
alter table public.user_preferences
  add column sound_on_complete boolean not null default true;
