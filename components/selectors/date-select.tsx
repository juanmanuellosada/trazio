"use client";

import { useState } from "react";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OVERLAY_MODAL } from "@/components/primitives/overlay";
import { formatTaskDueLabel } from "@/lib/dates/format";
import { todayInTimeZone } from "@/lib/dates/today";
import { toDueAt, type CalendarDate } from "@/lib/parser/dates";
import type { ParserContext } from "@/lib/parser/types";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import { cn } from "@/lib/utils";
import { DatePickerBody, type CommittedDate } from "./date-picker-body";

export type DateSelectValue = {
  dueDate: string | null;
  dueAt: string | null;
  durationMinutes: number | null;
};

function toCalendarDate(dateStr: string): CalendarDate {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

function extractDay(dueAt: string, timezone: string): string {
  return formatInTimeZone(dueAt, timezone, "yyyy-MM-dd");
}

function extractTime(dueAt: string, timezone: string): { hour: number; minute: number } {
  const [hour, minute] = formatInTimeZone(dueAt, timezone, "HH:mm").split(":").map(Number);
  return { hour, minute };
}

function formatHourOption(hour: number, minute: number, timeFormat: UserPreferences["timeFormat"]): string {
  return format(new Date(2000, 0, 1, hour, minute), timeFormat === 24 ? "HH:mm" : "h:mm aaaa", { locale: es });
}

const HOUR_OPTIONS = Array.from({ length: 48 }, (_, i) => ({ hour: Math.floor(i / 2), minute: (i % 2) * 30 }));
const DEFAULT_HOUR = { hour: 9, minute: 0 };

/**
 * Selector de fecha de vencimiento (bloque 4.2-4.5), reutilizado en el
 * detalle de tarea y en el alta: campo de lenguaje natural (delegado al
 * parser vía `DatePickerBody`), accesos rápidos, calendario, y hora +
 * duración como paso opcional. `due_date` y `due_at` son excluyentes por
 * constraint de base (`tasks_due_date_or_due_at_exclusive`) — acá "agregar
 * hora" decide cuál de las dos se guarda, nunca las dos a la vez.
 */
export function DateSelect({
  value,
  onChange,
  preferences,
  disabled,
  ariaLabel = "Fecha de vencimiento",
}: {
  value: DateSelectValue;
  onChange: (value: DateSelectValue) => void;
  preferences: UserPreferences;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ctx: Omit<ParserContext, "ahora"> = {
    zonaHoraria: preferences.timezone,
    semanaEmpiezaEn: preferences.weekStartsOn,
    proyectos: [],
    etiquetas: [],
  };

  const selectedDay = value.dueAt ? extractDay(value.dueAt, preferences.timezone) : value.dueDate;
  const hasTime = value.dueAt != null;
  const time = value.dueAt ? extractTime(value.dueAt, preferences.timezone) : null;

  function withDay(day: string, at: { hour: number; minute: number } | null) {
    if (at) {
      onChange({
        dueDate: null,
        dueAt: toDueAt(toCalendarDate(day), at.hour, at.minute, preferences.timezone),
        durationMinutes: value.durationMinutes,
      });
    } else {
      onChange({ dueDate: day, dueAt: null, durationMinutes: value.durationMinutes });
    }
  }

  function applyParsed(result: CommittedDate) {
    onChange({
      dueDate: result.dueDate,
      dueAt: result.dueAt,
      durationMinutes: result.durationMinutes ?? value.durationMinutes,
    });
  }

  function toggleHasTime(next: boolean) {
    const day = selectedDay ?? todayInTimeZone(new Date(), preferences.timezone);
    withDay(day, next ? (time ?? DEFAULT_HOUR) : null);
  }

  function changeTime(hour: number, minute: number) {
    const day = selectedDay ?? todayInTimeZone(new Date(), preferences.timezone);
    withDay(day, { hour, minute });
  }

  function clear() {
    onChange({ dueDate: null, dueAt: null, durationMinutes: null });
    setOpen(false);
  }

  const label =
    value.dueDate || value.dueAt
      ? formatTaskDueLabel(
          { due_date: value.dueDate, due_at: value.dueAt },
          { now: new Date(), timezone: preferences.timezone, dateFormat: preferences.dateFormat, timeFormat: preferences.timeFormat },
        )
      : null;

  const timeKey = time ? `${time.hour}:${time.minute}` : `${DEFAULT_HOUR.hour}:${DEFAULT_HOUR.minute}`;
  const hourItems = Object.fromEntries(
    HOUR_OPTIONS.map(({ hour, minute }) => [`${hour}:${minute}`, formatHourOption(hour, minute, preferences.timeFormat)]),
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal={OVERLAY_MODAL}>
      <PopoverTrigger
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-sm outline-none hover:bg-surface focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        <CalendarDays className="size-3.5 text-text-secondary" aria-hidden />
        {label ?? "Agregar fecha"}
      </PopoverTrigger>
      <PopoverContent align="start">
        <DatePickerBody
          inputId="date-select-input"
          inputLabel="Escribí la fecha de vencimiento"
          placeholder="Ej: mañana, el martes, en 3 días…"
          ctx={ctx}
          selectedDate={selectedDay}
          onCommitText={applyParsed}
          onSelectDate={(day) => withDay(day, hasTime ? (time ?? DEFAULT_HOUR) : null)}
        />

        <div className="mt-2.5 space-y-2 border-t border-border pt-2.5">
          <label className="flex items-center gap-1.5 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={hasTime}
              onChange={(event) => toggleHasTime(event.target.checked)}
              className="size-3.5 rounded border-input accent-primary"
            />
            Agregar hora
          </label>

          {hasTime && (
            <Select
              items={hourItems}
              value={timeKey}
              onValueChange={(next) => {
                if (!next) return;
                const [hour, minute] = next.split(":").map(Number);
                changeTime(hour, minute);
              }}
            >
              <SelectTrigger className="w-full" aria-label="Hora">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOUR_OPTIONS.map(({ hour, minute }) => (
                  <SelectItem key={`${hour}:${minute}`} value={`${hour}:${minute}`}>
                    {formatHourOption(hour, minute, preferences.timeFormat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="space-y-1">
            <label htmlFor="date-select-duration" className="text-xs text-text-secondary">
              Duración estimada (min)
            </label>
            <Input
              id="date-select-duration"
              type="number"
              min={1}
              value={value.durationMinutes ?? ""}
              onChange={(event) =>
                onChange({ ...value, durationMinutes: event.target.value ? Number(event.target.value) : null })
              }
              className="h-8 w-24 text-sm"
            />
          </div>
        </div>

        {(value.dueDate || value.dueAt) && (
          <Button type="button" variant="ghost" size="sm" className="mt-2 w-full justify-center text-text-secondary" onClick={clear}>
            <X className="size-3.5" /> Quitar fecha
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
