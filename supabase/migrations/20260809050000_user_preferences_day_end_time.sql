-- Hora de fin del día (el-dia-que-entra, D-C): hasta qué hora se considera que
-- dura la jornada a los efectos del tiempo libre que muestra Hoy (capacidad
-- `carga-del-dia`). Se guarda como hora de reloj (`time`), no como instante: el
-- momento real se resuelve combinándola con el día de hoy y la zona horaria del
-- usuario (columna `timezone`, ya existente en `user_preferences`) — mismo patrón
-- que `reference_time` (`20260802030000_user_preferences_reference_time.sql`).
--
-- No es lo mismo que `reference_time`: esa fija a qué hora se considera vencida
-- una tarea o hábito con día pero sin hora; esta fija hasta qué hora se considera
-- que dura la jornada completa. Cambiar una no afecta a la otra (D-C del design).
--
-- Valor inicial: 22:00, pedido explícito de la propuesta.
--
-- RLS no se toca: las políticas de `20260726011559_user_preferences.sql` son por
-- fila y ya cubren cualquier columna (mismo precedente que `reference_time`).
alter table public.user_preferences
  add column day_end_time time not null default '22:00:00';
