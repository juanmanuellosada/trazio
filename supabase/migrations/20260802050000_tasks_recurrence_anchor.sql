-- Ancla elegible de la recurrencia (repeticion-configurable, D-A): desde qué fecha
-- cuenta la próxima ocurrencia -- vencimiento o completado. Nace vacía a propósito:
-- vacía sigue significando "deducir de la forma de la regla", exactamente como hoy
-- (lib/recurrence/anchor.ts). Llenarla al migrar congelaría lo que hoy es dinámico,
-- así que ninguna tarea existente cambia de comportamiento con este alter.
--
-- RLS no se toca: las políticas de 20260726011609_tasks.sql son por fila y ya
-- cubren cualquier columna (mismo precedente que
-- 20260802020000_user_preferences_sound_on_complete.sql).
alter table public.tasks
  add column recurrence_anchor text
    check (recurrence_anchor is null or recurrence_anchor in ('due', 'completion'));
