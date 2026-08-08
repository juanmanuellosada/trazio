"use client";

import { Bell, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OVERLAY_MODAL } from "@/components/primitives/overlay";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import { habitReminderOptions, habitReminderOffsetLabel } from "@/lib/habits/reminders";
import {
  useHabitReminders,
  useAddHabitReminder,
  useRemoveHabitReminder,
  type HabitReminderRow,
} from "@/lib/habits/use-habit-reminders";

type ReminderItem = { key: string; offsetMinutes: number };

/**
 * Selector de recordatorios de un hábito (tarea 5.4, spec "Los
 * recordatorios se configuran desde el formulario del hábito"): mismo
 * tratamiento visual que `ReminderPicker` de tareas
 * (`components/reminders/reminder-picker.tsx`) — el mismo disparador con
 * campanita, el mismo popover con la lista arriba y el selector abajo —
 * pero sin el modo "fecha y hora fija": un hábito solo admite desfases
 * relativos (spec "Un hábito puede tener varios recordatorios, todos
 * relativos a su hora"), así que no hace falta el `radiogroup` de modo ni
 * el calendario.
 *
 * Modo borrador (`drafts`/`onChange`, sin `habitId`): el alta de un hábito
 * lo usa antes de que el hábito exista, mismo motivo que en `ReminderPicker`
 * — no hay ningún `habit_id` contra el cual mutar todavía, y crear uno
 * solo para poder agregar un recordatorio violaría "cancelar no crea
 * nada". `useCreateHabit` (`lib/habits/mutations.ts`) persiste los
 * offsets elegidos en el mismo viaje que crea el hábito.
 */
export function HabitReminderPicker({
  habitId,
  hasScheduledTime,
  referenceTime,
  timeFormat,
  drafts,
  onChange,
}: {
  habitId?: string;
  hasScheduledTime: boolean;
  referenceTime: string;
  timeFormat: UserPreferences["timeFormat"];
  drafts?: number[];
  onChange?: (offsets: number[]) => void;
}) {
  const { data: persisted } = useHabitReminders(habitId ?? "");
  const addReminder = useAddHabitReminder(habitId ?? "");
  const removeReminder = useRemoveHabitReminder(habitId ?? "");

  const items: ReminderItem[] = habitId
    ? (persisted ?? []).map((r: HabitReminderRow) => ({ key: r.id, offsetMinutes: r.offset_minutes }))
    : (drafts ?? []).map((offsetMinutes) => ({ key: String(offsetMinutes), offsetMinutes }));

  const options = habitReminderOptions(hasScheduledTime, referenceTime, timeFormat);
  const usedOffsets = new Set(items.map((item) => item.offsetMinutes));
  const availableOptions = options.filter((option) => !usedOffsets.has(option.offsetMinutes));

  function add(offsetMinutes: number) {
    if (habitId) {
      addReminder.mutate(offsetMinutes);
    } else {
      onChange?.([...(drafts ?? []), offsetMinutes].sort((a, b) => b - a));
    }
  }

  function remove(item: ReminderItem) {
    if (habitId) {
      removeReminder.mutate(item.key);
    } else {
      onChange?.((drafts ?? []).filter((offsetMinutes) => offsetMinutes !== item.offsetMinutes));
    }
  }

  return (
    <Popover modal={OVERLAY_MODAL}>
      <PopoverTrigger
        aria-label="Recordatorios"
        className="flex h-9 items-center gap-1.5 rounded-lg border border-input px-2.5 text-sm outline-none hover:bg-surface focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Bell className="size-3.5 text-text-secondary" aria-hidden />
        {items.length > 0 ? `Recordatorios (${items.length})` : "Agregar recordatorio"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        {items.length > 0 && (
          <ul className="space-y-1">
            {items.map((item) => (
              <li
                key={item.key}
                className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-surface"
              >
                <span>{habitReminderOffsetLabel(item.offsetMinutes, hasScheduledTime, referenceTime, timeFormat)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Quitar recordatorio"
                  onClick={() => remove(item)}
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className={items.length > 0 ? "mt-2.5 border-t border-border pt-2.5" : undefined}>
          {availableOptions.length > 0 ? (
            <Select
              items={Object.fromEntries(availableOptions.map((option) => [String(option.offsetMinutes), option.label]))}
              value={null}
              onValueChange={(next) => {
                if (!next) return;
                add(Number(next));
              }}
            >
              <SelectTrigger aria-label="Elegir cuándo avisar" className="h-9 w-full">
                <SelectValue placeholder="Elegí cuándo avisar" />
              </SelectTrigger>
              <SelectContent>
                {availableOptions.map((option) => (
                  <SelectItem key={option.offsetMinutes} value={String(option.offsetMinutes)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-text-secondary">Ya agregaste todos los recordatorios disponibles.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
