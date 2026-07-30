/**
 * Opciones relativas de recordatorio (bloque 4.11, spec
 * `recordatorios-push`): "a la hora de la tarea", minutos, horas, días y
 * una semana antes. `offsetMinutes` es el desplazamiento respecto de
 * `due_at` (negativo = antes), y es exactamente lo que se guarda en
 * `reminders.offset_minutes` — así la base puede recalcular `remind_at`
 * sola cuando cambia la fecha u hora de la tarea (tarea 4.12, trigger de
 * la migración `20260729140000`).
 */
export type RelativeReminderOption = { offsetMinutes: number; label: string };

export const RELATIVE_REMINDER_OPTIONS: RelativeReminderOption[] = [
  { offsetMinutes: 0, label: "A la hora de la tarea" },
  { offsetMinutes: -10, label: "10 minutos antes" },
  { offsetMinutes: -30, label: "30 minutos antes" },
  { offsetMinutes: -45, label: "45 minutos antes" },
  { offsetMinutes: -60, label: "1 hora antes" },
  { offsetMinutes: -120, label: "2 horas antes" },
  { offsetMinutes: -180, label: "3 horas antes" },
  { offsetMinutes: -1440, label: "1 día antes" },
  { offsetMinutes: -2880, label: "2 días antes" },
  { offsetMinutes: -4320, label: "3 días antes" },
  { offsetMinutes: -10080, label: "1 semana antes" },
];

export function relativeOffsetLabel(offsetMinutes: number): string {
  const found = RELATIVE_REMINDER_OPTIONS.find((option) => option.offsetMinutes === offsetMinutes);
  return found?.label ?? `${offsetMinutes} min`;
}
