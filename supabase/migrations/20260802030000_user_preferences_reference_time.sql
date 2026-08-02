-- Hora de referencia (recordatorios-con-hora-de-referencia, D-A): a qué hora se
-- considera que vence una tarea que tiene día pero no hora. Se guarda como hora de
-- reloj (`time`), no como instante: el momento real se resuelve combinándola con el
-- día de la tarea y la zona horaria del usuario (columna `timezone`, ya existente en
-- `user_preferences`).
--
-- Valor inicial: 09:00. Es la pregunta abierta del design (D-A/OQ1); se elige 09:00
-- porque es una hora despierta y razonable para recibir un aviso, sin inventar una
-- convención rara como medianoche o fin del día.
--
-- RLS no se toca: las políticas de `20260726011559_user_preferences.sql` son por
-- fila y ya cubren cualquier columna (mismo precedente que
-- `20260802020000_user_preferences_sound_on_complete.sql`).
alter table public.user_preferences
  add column reference_time time not null default '09:00:00';
