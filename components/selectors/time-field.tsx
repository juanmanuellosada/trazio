"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import { parseTimeInput } from "./parse-time-input";

export type TimeValue = { hour: number; minute: number };

export const DEFAULT_TIME: TimeValue = { hour: 9, minute: 0 };

const HOUR_OPTIONS = Array.from({ length: 48 }, (_, i) => ({ hour: Math.floor(i / 2), minute: (i % 2) * 30 }));

export function formatTimeValue(value: TimeValue, timeFormat: UserPreferences["timeFormat"]): string {
  return format(new Date(2000, 0, 1, value.hour, value.minute), timeFormat === 24 ? "HH:mm" : "h:mm aaaa", {
    locale: es,
  });
}

/**
 * `TimeValue` en crudo (`hour`/`minute`) hacia y desde `"HH:MM"` — el
 * formato de reloj que persisten `habits.scheduled_time`,
 * `habit_schedule_overrides.scheduled_time` y `user_preferences.reference_time`
 * (tarea 2.4 de `sin-controles-nativos`: los tres consumidores de `TimeField`
 * fuera de `DateSelect` guardan un horario de reloj, no un instante).
 * Comparten estas dos funciones para no repetir el padding de ceros en cada
 * archivo.
 */
export function parseHHMM(value: string): TimeValue {
  const [hour, minute] = value.split(":").map(Number);
  return { hour, minute };
}

export function toHHMM(value: TimeValue): string {
  return `${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`;
}

/**
 * Bloque de hora (`sin-controles-nativos`, D-B): opciones predefinidas cada
 * media hora más entrada libre tipeada con su propio error
 * (`parseTimeInput`), respetando el formato de 12 o 24 horas del usuario.
 * Extraído de `DateSelect` (bloque 5.2), que lo tenía puertas adentro
 * escribiendo directo en los campos de una tarea — acá es un componente
 * puro sobre `value`/`onChange`, para que el recordatorio y el editor de
 * eventos lo usen sin duplicar esta lógica (spec "La misma lógica de hora no
 * se duplica"). `DateSelect` sigue siendo el único que decide qué día
 * acompaña a esta hora.
 */
export function TimeField({
  id,
  label = "Hora",
  value,
  onChange,
  timeFormat,
}: {
  id: string;
  label?: string;
  value: TimeValue;
  onChange: (value: TimeValue) => void;
  timeFormat: UserPreferences["timeFormat"];
}) {
  const timeKey = `${value.hour}:${value.minute}`;
  const hourItems = Object.fromEntries(
    HOUR_OPTIONS.map(({ hour, minute }) => [`${hour}:${minute}`, formatTimeValue({ hour, minute }, timeFormat)]),
  );

  // Hora escrita a mano: borrador local, independiente de `value` hasta que
  // se confirma (Enter o blur) — así escribir no reformatea el texto en
  // cada tecla. Se resincroniza con `value` cada vez que cambia por otra
  // vía (la lista o el propio commit), comparando contra la última clave
  // sincronizada en vez de un efecto — ajustar el estado durante el render
  // evita el re-render en cascada de un `setState` dentro de `useEffect`
  // (mismo patrón que tenía `DateSelect`).
  const syncKey = `${timeKey}:${timeFormat}`;
  const [draft, setDraft] = useState(() => formatTimeValue(value, timeFormat));
  const [error, setError] = useState<string | null>(null);
  const [syncedKey, setSyncedKey] = useState(syncKey);

  if (syncKey !== syncedKey) {
    setSyncedKey(syncKey);
    setDraft(formatTimeValue(value, timeFormat));
    setError(null);
  }

  function commitTyped() {
    if (draft.trim() === "") {
      setError(null);
      return;
    }
    const parsed = parseTimeInput(draft);
    if (!parsed) {
      setError("No reconocimos esa hora. Probá con 13:47 o 1:47 pm.");
      return;
    }
    setError(null);
    onChange(parsed);
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-1.5">
        <label htmlFor={id} className="text-xs text-text-secondary">
          {label}
        </label>
        <Select
          items={hourItems}
          value={timeKey}
          onValueChange={(next) => {
            if (!next) return;
            const [hour, minute] = next.split(":").map(Number);
            onChange({ hour, minute });
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
                {formatTimeValue({ hour, minute }, timeFormat)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitTyped}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitTyped();
          }
        }}
        placeholder={timeFormat === 24 ? "Ej: 13:47" : "Ej: 1:47 p. m."}
        className="h-8 text-sm"
      />
      {error && (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
