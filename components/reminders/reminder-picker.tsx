"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, Plus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OVERLAY_MODAL } from "@/components/primitives/overlay";
import { useReminders, type DraftReminder, type ReminderRow } from "@/lib/reminders/use-reminders";
import { useAddReminder, useRemoveReminder, computeRemindAt, type NewReminderInput } from "@/lib/reminders/mutations";
import { RELATIVE_REMINDER_OPTIONS, relativeOffsetLabel } from "@/lib/reminders/relative-options";

function formatReminderMoment(iso: string): string {
  return format(new Date(iso), "d 'de' MMMM, HH:mm", { locale: es });
}

/**
 * Selector de recordatorios del detalle de tarea (bloque 4.11): lista los
 * ya agregados y ofrece agregar uno nuevo, puntual (fecha y hora
 * concretas) o relativo a `due_at` (spec `recordatorios-push`). Las
 * opciones relativas quedan deshabilitadas sin `due_at` — requirement "un
 * recordatorio relativo exige que la tarea tenga fecha y hora" — en vez de
 * dejar que la mutación las rechace después de un click.
 *
 * Modo borrador (`drafts`/`onChange`, sin `taskId`): el alta de una tarea
 * (bloque `alta-de-tareas-en-contexto`, D-E) lo usa antes de que la tarea
 * exista — no hay ningún `taskId` contra el cual mutar todavía, y crear uno
 * solo para poder agregar un recordatorio violaría "cancelar no crea nada".
 * `computeRemindAt` (la misma función pura que usa `useAddReminder`) resuelve
 * `remind_at`/`offset_minutes` acá también, para no duplicar esa cuenta; el
 * alta persiste los recordatorios elegidos en el mismo viaje que crea la
 * tarea (`useCreateTaskFromParse`).
 */
export function ReminderPicker({
  taskId,
  dueAt,
  drafts,
  onChange,
}: {
  taskId?: string;
  dueAt: string | null;
  drafts?: DraftReminder[];
  onChange?: (drafts: DraftReminder[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"relativo" | "puntual">(dueAt ? "relativo" : "puntual");
  const [puntualValue, setPuntualValue] = useState("");
  const { data: taskReminders } = useReminders(taskId ?? "");
  const addReminder = useAddReminder(taskId ?? "");
  const removeReminder = useRemoveReminder(taskId ?? "");

  const reminders: (ReminderRow | DraftReminder)[] = taskId ? (taskReminders ?? []) : (drafts ?? []);
  const pendingCount = reminders.filter((reminder) => !reminder.delivered_at).length;

  function addDraft(input: NewReminderInput) {
    const { remind_at, offset_minutes } = computeRemindAt(input);
    onChange?.([...(drafts ?? []), { id: crypto.randomUUID(), remind_at, offset_minutes, delivered_at: null }]);
  }

  function addPuntual() {
    if (!puntualValue) return;
    const input: NewReminderInput = { kind: "puntual", remindAt: new Date(puntualValue).toISOString() };
    if (taskId) {
      addReminder.mutate(input);
    } else {
      addDraft(input);
    }
    setPuntualValue("");
  }

  function addRelative(offsetMinutes: number) {
    const input: NewReminderInput = { kind: "relativo", offsetMinutes, dueAt };
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
        className="flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-sm outline-none hover:bg-surface focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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

        <div className="mt-2.5 space-y-2 border-t border-border pt-2.5">
          <div className="flex gap-1">
            <Button
              type="button"
              variant={mode === "relativo" ? "secondary" : "ghost"}
              size="xs"
              onClick={() => setMode("relativo")}
            >
              Relativo a la tarea
            </Button>
            <Button
              type="button"
              variant={mode === "puntual" ? "secondary" : "ghost"}
              size="xs"
              onClick={() => setMode("puntual")}
            >
              Fecha y hora puntual
            </Button>
          </div>

          {mode === "relativo" ? (
            !dueAt ? (
              <p className="text-xs text-text-secondary">
                Esta tarea no tiene fecha y hora. Ponele una hora de vencimiento para poder agregar un recordatorio
                relativo.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {RELATIVE_REMINDER_OPTIONS.map((option) => (
                  <Button
                    key={option.offsetMinutes}
                    type="button"
                    variant="outline"
                    size="xs"
                    className="justify-start"
                    onClick={() => addRelative(option.offsetMinutes)}
                  >
                    <Plus className="size-3" /> {option.label}
                  </Button>
                ))}
              </div>
            )
          ) : (
            <div className="flex items-center gap-1.5">
              <Input
                type="datetime-local"
                aria-label="Fecha y hora del recordatorio"
                value={puntualValue}
                onChange={(event) => setPuntualValue(event.target.value)}
                className="h-8 flex-1"
              />
              <Button
                type="button"
                size="icon-sm"
                aria-label="Agregar recordatorio puntual"
                onClick={addPuntual}
                disabled={!puntualValue}
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
