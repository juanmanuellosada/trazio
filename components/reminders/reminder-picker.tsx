"use client";

import { useState } from "react";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { Bell, Check, Plus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OVERLAY_MODAL } from "@/components/primitives/overlay";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { DatePickerBody, type CommittedDate } from "@/components/selectors/date-picker-body";
import { TimeField, DEFAULT_TIME, type TimeValue } from "@/components/selectors/time-field";
import { toDueAt, type CalendarDate } from "@/lib/parser/dates";
import type { ParserContext } from "@/lib/parser/types";
import { useTask } from "@/lib/tasks/use-task";
import { useReminders, type DraftReminder, type ReminderRow } from "@/lib/reminders/use-reminders";
import { useAddReminder, useRemoveReminder, computeRemindAt, type NewReminderInput } from "@/lib/reminders/mutations";
import { RELATIVE_REMINDER_OPTIONS, relativeOffsetLabel } from "@/lib/reminders/relative-options";
import { cn } from "@/lib/utils";

function formatReminderMoment(iso: string): string {
  return format(new Date(iso), "d 'de' MMMM, HH:mm", { locale: es });
}

function toCalendarDate(dateStr: string): CalendarDate {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

function dayOf(iso: string, timezone: string): string {
  return formatInTimeZone(iso, timezone, "yyyy-MM-dd");
}

function timeOf(iso: string, timezone: string): TimeValue {
  const [hour, minute] = formatInTimeZone(iso, timezone, "HH:mm").split(":").map(Number);
  return { hour, minute };
}

/**
 * Selector de recordatorios del detalle de tarea (bloque 4.11, opciones
 * dinámicas ampliadas por `recordatorios-con-hora-de-referencia` D-B,
 * rediseñado por `sin-controles-nativos` D-C): lista los ya agregados y
 * ofrece agregar uno nuevo, con una elección explícita entre **relativo a
 * la tarea** y **fecha y hora fija** — ya no dos botones que solo cambian
 * de color. Lo que ofrece el modo relativo depende de lo que la tarea
 * tenga: con fecha y hora, las once opciones incluida "a la hora de la
 * tarea"; con solo fecha, los desfases (sin "a la hora de la tarea", que
 * afirmaría una hora que la tarea no tiene); sin ninguna fecha, ninguna —
 * solo queda el modo fijo. El modo fijo usa el calendario propio
 * (`DatePickerBody`) más el bloque de hora compartido con el selector de
 * vencimiento (`TimeField`), nunca el `<input type="datetime-local">` que
 * tenía antes.
 *
 * Modo borrador (`drafts`/`onChange`, sin `taskId`): el alta de una tarea
 * (bloque `alta-de-tareas-en-contexto`, D-E) lo usa antes de que la tarea
 * exista — no hay ningún `taskId` contra el cual mutar todavía, y crear uno
 * solo para poder agregar un recordatorio violaría "cancelar no crea nada".
 * `computeRemindAt` (la misma función pura que usa `useAddReminder`) resuelve
 * `remind_at`/`offset_minutes` acá también, para no duplicar esa cuenta; el
 * alta persiste los recordatorios elegidos en el mismo viaje que crea la
 * tarea (`useCreateTaskFromParse`).
 *
 * `dueDate` (`recordatorios-con-hora-de-referencia`, D-B): con `taskId`, se
 * resuelve de la caché de `useTask` en vez de pedir un prop nuevo al detalle
 * de tarea — comparte `queryKey` con el `useTask` que ya usa el panel de
 * detalle, así que no dispara un pedido extra. En modo borrador, lo pasa el
 * llamador (no hay tarea todavía de la que leerlo).
 */
export function ReminderPicker({
  taskId,
  dueAt,
  dueDate,
  drafts,
  onChange,
  variant = "chip",
}: {
  taskId?: string;
  dueAt: string | null;
  dueDate?: string | null;
  drafts?: DraftReminder[];
  onChange?: (drafts: DraftReminder[]) => void;
  /** `chip` (default): angosto, ajustado al texto — el de siempre, el que usa la alta. `row`: ocupa todo el ancho e iguala la altura del trigger de Etiquetas, para la columna del detalle de tarea. */
  variant?: "chip" | "row";
}) {
  const { data: taskFromCache } = useTask(taskId ?? null);
  const effectiveDueDate = taskId ? (taskFromCache?.due_date ?? null) : (dueDate ?? null);
  const hasTime = !!dueAt;
  const hasDateOnly = !hasTime && !!effectiveDueDate;
  const hasNoDate = !hasTime && !hasDateOnly;
  const relativeOptions = hasTime ? RELATIVE_REMINDER_OPTIONS : RELATIVE_REMINDER_OPTIONS.filter((o) => o.offsetMinutes !== 0);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"relativo" | "fijo">(hasNoDate ? "fijo" : "relativo");
  const [relativeChoice, setRelativeChoice] = useState<string | null>(null);
  const [fixedDate, setFixedDate] = useState<string | null>(null);
  const [fixedTime, setFixedTime] = useState<TimeValue>(DEFAULT_TIME);
  const { data: taskReminders } = useReminders(taskId ?? "");
  const addReminder = useAddReminder(taskId ?? "");
  const removeReminder = useRemoveReminder(taskId ?? "");
  const { timezone, referenceTime, timeFormat, weekStartsOn } = useUserPreferences();

  const ctx: Omit<ParserContext, "ahora"> = {
    zonaHoraria: timezone,
    semanaEmpiezaEn: weekStartsOn,
    proyectos: [],
    etiquetas: [],
  };

  const reminders: (ReminderRow | DraftReminder)[] = taskId ? (taskReminders ?? []) : (drafts ?? []);
  const pendingCount = reminders.filter((reminder) => !reminder.delivered_at).length;

  function addDraft(input: NewReminderInput) {
    const { remind_at, offset_minutes } = computeRemindAt(input, { timezone, referenceTime: referenceTime ?? "09:00:00" });
    onChange?.([...(drafts ?? []), { id: crypto.randomUUID(), remind_at, offset_minutes, delivered_at: null }]);
  }

  function applyParsedFixed(result: CommittedDate) {
    if (result.dueAt) {
      setFixedDate(dayOf(result.dueAt, timezone));
      setFixedTime(timeOf(result.dueAt, timezone));
    } else if (result.dueDate) {
      setFixedDate(result.dueDate);
    }
  }

  function addFixed() {
    if (!fixedDate) return;
    const input: NewReminderInput = {
      kind: "puntual",
      remindAt: toDueAt(toCalendarDate(fixedDate), fixedTime.hour, fixedTime.minute, timezone),
    };
    if (taskId) {
      addReminder.mutate(input);
    } else {
      addDraft(input);
    }
    setFixedDate(null);
    setFixedTime(DEFAULT_TIME);
  }

  function addRelative(offsetMinutes: number) {
    const input: NewReminderInput = { kind: "relativo", offsetMinutes, dueAt, dueDate: effectiveDueDate };
    if (taskId) {
      addReminder.mutate(input);
    } else {
      addDraft(input);
    }
  }

  function removeOne(id: string) {
    if (taskId) {
      removeReminder.mutate(id);
    } else {
      onChange?.((drafts ?? []).filter((reminder) => reminder.id !== id));
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={OVERLAY_MODAL}>
      <PopoverTrigger
        aria-label="Recordatorios"
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-input px-2.5 text-sm outline-none hover:bg-surface focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          variant === "row" ? "h-9 w-full" : "h-8",
        )}
      >
        <Bell className="size-3.5 text-text-secondary" aria-hidden />
        {pendingCount > 0 ? `Recordatorios (${pendingCount})` : "Agregar recordatorio"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        {reminders.length > 0 && (
          <ul className="space-y-1">
            {reminders.map((reminder) => (
              <li
                key={reminder.id}
                className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-surface"
              >
                <span className={reminder.delivered_at ? "text-text-secondary line-through" : undefined}>
                  {formatReminderMoment(reminder.remind_at)}
                  {reminder.offset_minutes != null && ` · ${relativeOffsetLabel(reminder.offset_minutes)}`}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Quitar recordatorio"
                  onClick={() => removeOne(reminder.id)}
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2.5 space-y-2.5 border-t border-border pt-2.5">
          <div role="radiogroup" aria-label="Tipo de recordatorio" className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              role="radio"
              aria-checked={mode === "relativo"}
              onClick={() => setMode("relativo")}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                mode === "relativo" ? "border-primary bg-primary/10" : "border-input hover:bg-surface",
              )}
            >
              <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                {mode === "relativo" && <Check className="size-3.5 text-primary" aria-hidden />}
                Relativo a la tarea
              </span>
              <span className="text-xs text-text-secondary">Antes o después del vencimiento</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "fijo"}
              onClick={() => setMode("fijo")}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                mode === "fijo" ? "border-primary bg-primary/10" : "border-input hover:bg-surface",
              )}
            >
              <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                {mode === "fijo" && <Check className="size-3.5 text-primary" aria-hidden />}
                Fecha y hora fija
              </span>
              <span className="text-xs text-text-secondary">Un momento puntual</span>
            </button>
          </div>

          {mode === "relativo" ? (
            hasNoDate ? (
              <p className="text-xs text-text-secondary">
                Esta tarea no tiene fecha. Ponele una para poder agregar un recordatorio relativo.
              </p>
            ) : (
              <Select
                items={Object.fromEntries(relativeOptions.map((option) => [String(option.offsetMinutes), option.label]))}
                value={relativeChoice}
                onValueChange={(next) => {
                  if (!next) return;
                  addRelative(Number(next));
                  setRelativeChoice(null);
                }}
              >
                <SelectTrigger aria-label="Elegir cuándo avisar" className="h-9 w-full">
                  <SelectValue placeholder="Elegí cuándo avisar" />
                </SelectTrigger>
                <SelectContent>
                  {relativeOptions.map((option) => (
                    <SelectItem key={option.offsetMinutes} value={String(option.offsetMinutes)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          ) : (
            <div className="space-y-2">
              <DatePickerBody
                inputId="reminder-fixed-date-input"
                inputLabel="Escribí la fecha del recordatorio"
                placeholder="Ej: mañana, el martes, en 3 días…"
                ctx={ctx}
                selectedDate={fixedDate}
                onCommitText={applyParsedFixed}
                onSelectDate={setFixedDate}
              />
              <TimeField id="reminder-fixed-time-input" value={fixedTime} onChange={setFixedTime} timeFormat={timeFormat} />
              <Button type="button" size="sm" className="w-full" onClick={addFixed} disabled={!fixedDate}>
                <Plus className="size-3.5" /> Agregar recordatorio
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
