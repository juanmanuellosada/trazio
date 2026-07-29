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
import {
  DURATION_QUICK_OPTIONS,
  convertDurationDraft,
  deriveDurationDisplay,
  durationTextToMinutes,
  type DurationUnit,
} from "./duration-input";
import { parseTimeInput } from "./parse-time-input";

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

  // Borrador local vigente mientras se edita: la prop `value` solo se
  // actualiza cuando la mutación de guardado vuelve (asíncrono), así que
  // encadenar dos ediciones rápidas — tipear la hora y, sin esperar,
  // tipear la duración — podía componer la segunda contra el `due_at`
  // todavía viejo y pisar la hora recién escrita. Cada cambio se compone
  // acá contra el propio borrador en vez de contra `value`; con el
  // popover cerrado sigue sincronizado 1 a 1 con `value`, como antes.
  const valueKey = `${value.dueDate}|${value.dueAt}|${value.durationMinutes}`;
  const [draft, setDraft] = useState(value);
  const [syncedValueKey, setSyncedValueKey] = useState(valueKey);

  if (!open && valueKey !== syncedValueKey) {
    setSyncedValueKey(valueKey);
    setDraft(value);
  }

  const selectedDay = draft.dueAt ? extractDay(draft.dueAt, preferences.timezone) : draft.dueDate;
  const hasTime = draft.dueAt != null;
  const time = draft.dueAt ? extractTime(draft.dueAt, preferences.timezone) : null;

  function commit(next: DateSelectValue) {
    setDraft(next);
    onChange(next);
  }

  function withDay(day: string, at: { hour: number; minute: number } | null) {
    if (at) {
      commit({
        dueDate: null,
        dueAt: toDueAt(toCalendarDate(day), at.hour, at.minute, preferences.timezone),
        durationMinutes: draft.durationMinutes,
      });
    } else {
      commit({ dueDate: day, dueAt: null, durationMinutes: draft.durationMinutes });
    }
  }

  function applyParsed(result: CommittedDate) {
    commit({
      dueDate: result.dueDate,
      dueAt: result.dueAt,
      durationMinutes: result.durationMinutes ?? draft.durationMinutes,
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
    commit({ dueDate: null, dueAt: null, durationMinutes: null });
    setOpen(false);
  }

  const label =
    draft.dueDate || draft.dueAt
      ? formatTaskDueLabel(
          { due_date: draft.dueDate, due_at: draft.dueAt },
          { now: new Date(), timezone: preferences.timezone, dateFormat: preferences.dateFormat, timeFormat: preferences.timeFormat },
        )
      : null;

  const timeKey = time ? `${time.hour}:${time.minute}` : `${DEFAULT_HOUR.hour}:${DEFAULT_HOUR.minute}`;
  const hourItems = Object.fromEntries(
    HOUR_OPTIONS.map(({ hour, minute }) => [`${hour}:${minute}`, formatHourOption(hour, minute, preferences.timeFormat)]),
  );

  // Hora escribible (bloque 5.2): además de elegirla de `hourItems`, se puede
  // tipear directamente. `timeDraft` es un borrador local, independiente del
  // valor guardado hasta que se confirma (Enter o blur) — así escribir no
  // reformatea el texto en cada tecla. Se resincroniza con el valor guardado
  // cada vez que cambia por otra vía (la lista, un acceso rápido, o el
  // propio commit), comparando contra la última clave sincronizada en vez
  // de un efecto — ajustar el estado durante el render evita el
  // re-render en cascada de un `setState` dentro de `useEffect`.
  const timeSyncKey = `${timeKey}:${preferences.timeFormat}`;
  const [timeDraft, setTimeDraft] = useState(() => {
    const t = time ?? DEFAULT_HOUR;
    return formatHourOption(t.hour, t.minute, preferences.timeFormat);
  });
  const [timeError, setTimeError] = useState<string | null>(null);
  const [syncedTimeKey, setSyncedTimeKey] = useState(timeSyncKey);

  if (timeSyncKey !== syncedTimeKey) {
    setSyncedTimeKey(timeSyncKey);
    const t = time ?? DEFAULT_HOUR;
    setTimeDraft(formatHourOption(t.hour, t.minute, preferences.timeFormat));
    setTimeError(null);
  }

  function commitTypedTime() {
    if (timeDraft.trim() === "") {
      setTimeError(null);
      return;
    }
    const parsed = parseTimeInput(timeDraft);
    if (!parsed) {
      setTimeError("No reconocimos esa hora. Probá con 13:47 o 1:47 pm.");
      return;
    }
    setTimeError(null);
    changeTime(parsed.hour, parsed.minute);
  }

  // Duración escribible con unidad (bloque 5.3): `duration_minutes` sigue
  // siendo la única columna guardada — `durationDraft` es solo cómo se
  // muestra (minutos u horas), nunca lo que se persiste. Solo se
  // resincroniza con `draft.durationMinutes` cuando ese valor no coincide
  // con lo que el borrador ya representa: si coincide, el cambio lo generó
  // el propio borrador (cada tecla dispara `onChange`) y resetearlo
  // igual perdería la unidad elegida a mitad de escritura (por ejemplo,
  // "1.5" en horas pasa por 90 minutos, que en minutos no es un múltiplo
  // de 60 y `deriveDurationDisplay` volvería a mostrar "minutos").
  const [durationDraft, setDurationDraft] = useState(() => deriveDurationDisplay(draft.durationMinutes));

  if (durationTextToMinutes(durationDraft.text, durationDraft.unit) !== draft.durationMinutes) {
    setDurationDraft(deriveDurationDisplay(draft.durationMinutes));
  }

  function handleDurationTextChange(text: string) {
    setDurationDraft((prev) => ({ ...prev, text }));
    commit({ ...draft, durationMinutes: durationTextToMinutes(text, durationDraft.unit) });
  }

  function handleDurationUnitChange(nextUnit: DurationUnit) {
    setDurationDraft((prev) => ({ unit: nextUnit, text: convertDurationDraft(prev.text, prev.unit, nextUnit) }));
  }

  function applyDurationMinutes(minutes: number) {
    setDurationDraft(deriveDurationDisplay(minutes));
    commit({ ...draft, durationMinutes: minutes });
  }

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
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1.5">
                <label htmlFor="date-select-time-input" className="text-xs text-text-secondary">
                  Hora
                </label>
                <Select
                  items={hourItems}
                  value={timeKey}
                  onValueChange={(next) => {
                    if (!next) return;
                    const [hour, minute] = next.split(":").map(Number);
                    changeTime(hour, minute);
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    aria-label="Elegir hora de una lista"
                    className="h-6 gap-1 border-none px-1.5 text-xs text-text-secondary hover:bg-surface"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {HOUR_OPTIONS.map(({ hour, minute }) => (
                      <SelectItem key={`${hour}:${minute}`} value={`${hour}:${minute}`}>
                        {formatHourOption(hour, minute, preferences.timeFormat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                id="date-select-time-input"
                value={timeDraft}
                onChange={(event) => setTimeDraft(event.target.value)}
                onBlur={commitTypedTime}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitTypedTime();
                  }
                }}
                placeholder={preferences.timeFormat === 24 ? "Ej: 13:47" : "Ej: 1:47 p. m."}
                className="h-8 text-sm"
              />
              {timeError && (
                <p role="alert" className="text-xs text-error">
                  {timeError}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="date-select-duration" className="text-xs text-text-secondary">
              Duración estimada
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_QUICK_OPTIONS.map((option) => (
                <button
                  key={option.minutes}
                  type="button"
                  onClick={() => applyDurationMinutes(option.minutes)}
                  className={cn(
                    "rounded-lg border border-input px-2 py-1 text-xs outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50",
                    draft.durationMinutes === option.minutes && "border-primary bg-primary/10",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                id="date-select-duration"
                inputMode="decimal"
                value={durationDraft.text}
                onChange={(event) => handleDurationTextChange(event.target.value)}
                placeholder={durationDraft.unit === "horas" ? "Ej: 1.5" : "Ej: 45"}
                className="h-8 w-20 text-sm"
              />
              <Select
                items={{ minutos: "min", horas: "h" }}
                value={durationDraft.unit}
                onValueChange={(next) => next && handleDurationUnitChange(next as DurationUnit)}
              >
                <SelectTrigger size="sm" aria-label="Unidad de duración" className="h-8 w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutos">min</SelectItem>
                  <SelectItem value="horas">h</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {(draft.dueDate || draft.dueAt) && (
          <Button type="button" variant="ghost" size="sm" className="mt-2 w-full justify-center text-text-secondary" onClick={clear}>
            <X className="size-3.5" /> Quitar fecha
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
