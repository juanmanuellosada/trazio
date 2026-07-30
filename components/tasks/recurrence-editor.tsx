"use client";

import { useId } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Valor editable de la recurrencia de una tarea (bloque 5.6): las tres columnas ya existentes desde la fase 1, sin ninguna nueva. */
export type RecurrenceValue = {
  /** RRULE sin `DTSTART` (D6, `lib/recurrence/`), o `null` si la tarea no se repite. */
  rule: string | null;
  /** `yyyy-MM-dd`, o `null` si la serie no tiene fecha tope. */
  endsAt: string | null;
  /** Repeticiones restantes, o `null` si no tiene límite de cantidad. */
  count: number | null;
};

type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
type EndMode = "never" | "date" | "count";

const FREQUENCY_LABELS: Record<Frequency, string> = {
  DAILY: "día",
  WEEKLY: "semana",
  MONTHLY: "mes",
  YEARLY: "año",
};
const FREQUENCY_OPTIONS = Object.keys(FREQUENCY_LABELS) as Frequency[];

const END_MODE_LABELS: Record<EndMode, string> = {
  never: "Nunca",
  date: "En una fecha",
  count: "Después de repetir",
};
const END_MODE_OPTIONS = Object.keys(END_MODE_LABELS) as EndMode[];

/**
 * Deriva frecuencia e intervalo de una regla RRULE (bloque 5.6): este
 * editor ofrece frecuencia e intervalo con controles simples, no un editor
 * visual de RRULE completo (Non-Goal del design de `fase-2-potencia`) — una
 * regla más específica que ya trajo el parser (ej. `BYDAY=MO` de "cada
 * lunes") sigue funcionando para calcular la próxima ocurrencia
 * (`lib/recurrence/`), pero cambiar la frecuencia o el intervalo acá la
 * reemplaza por la versión simple equivalente.
 */
function frequencyOf(rule: string): Frequency {
  const match = /FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)/.exec(rule);
  return (match?.[1] as Frequency | undefined) ?? "WEEKLY";
}

function intervalOf(rule: string): number {
  const match = /INTERVAL=(\d+)/.exec(rule);
  return match ? Number(match[1]) : 1;
}

function buildRule(frequency: Frequency, interval: number): string {
  return interval > 1 ? `FREQ=${frequency};INTERVAL=${interval}` : `FREQ=${frequency}`;
}

/**
 * `endsAt !== null` (no `endsAt` a secas): recién elegido "En una fecha" sin
 * fecha todavía, `endsAt` vale `""` — un string vacío es igual de "falso"
 * que `null` para un chequeo de truthiness, y con eso el modo se
 * revertiría solo a "Nunca" apenas se vuelve a renderizar.
 */
function endModeOf(value: RecurrenceValue): EndMode {
  if (value.endsAt !== null) return "date";
  if (value.count !== null) return "count";
  return "never";
}

/**
 * Editor de recurrencia del detalle de tarea (bloque 5.6): elegir
 * frecuencia e intervalo, fin por fecha o por cantidad, y quitar la
 * repetición. Componente puro sobre `value`/`onChange` — quien lo monte
 * decide cómo persistir `recurrence_rule`/`recurrence_ends_at`/
 * `recurrence_count` (mismo patrón que `DeadlineSelect`).
 */
export function RecurrenceEditor({
  value,
  onChange,
  disabled,
}: {
  value: RecurrenceValue;
  onChange: (value: RecurrenceValue) => void;
  disabled?: boolean;
}) {
  const frequencyId = useId();
  const intervalId = useId();
  const endModeId = useId();
  const endDateId = useId();
  const endCountId = useId();

  if (!value.rule) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onChange({ rule: buildRule("WEEKLY", 1), endsAt: null, count: null })}
      >
        Repetir tarea
      </Button>
    );
  }

  const frequency = frequencyOf(value.rule);
  const interval = intervalOf(value.rule);
  const endMode = endModeOf(value);

  function setFrequency(next: Frequency) {
    onChange({ ...value, rule: buildRule(next, interval) });
  }

  function setInterval(next: number) {
    onChange({ ...value, rule: buildRule(frequency, Math.max(1, next)) });
  }

  function setEndMode(next: EndMode) {
    if (next === "never") onChange({ ...value, endsAt: null, count: null });
    else if (next === "date") onChange({ ...value, endsAt: value.endsAt || "", count: null });
    else onChange({ ...value, endsAt: null, count: value.count ?? 1 });
  }

  return (
    <div className="flex flex-col gap-3" data-testid="recurrence-editor">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={intervalId} className="text-text-secondary">
            Repetir cada
          </Label>
          <Input
            id={intervalId}
            type="number"
            min={1}
            value={interval}
            disabled={disabled}
            onChange={(event) => setInterval(Number(event.target.value) || 1)}
            className="w-16"
            aria-label="Intervalo de repetición"
          />
          <Select items={FREQUENCY_LABELS} value={frequency} onValueChange={(next) => setFrequency(next as Frequency)}>
            <SelectTrigger id={frequencyId} aria-label="Frecuencia de la repetición" disabled={disabled} className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {FREQUENCY_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="text-text-secondary"
          onClick={() => onChange({ rule: null, endsAt: null, count: null })}
        >
          <X className="size-3.5" /> Quitar repetición
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={endModeId} className="text-text-secondary">
          Termina
        </Label>
        <Select items={END_MODE_LABELS} value={endMode} onValueChange={(next) => setEndMode(next as EndMode)}>
          <SelectTrigger id={endModeId} disabled={disabled} className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {END_MODE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {END_MODE_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {endMode === "date" && (
          <Input
            id={endDateId}
            type="date"
            value={value.endsAt ?? ""}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, endsAt: event.target.value, count: null })}
            className="w-40"
            aria-label="Fecha de fin de la repetición"
          />
        )}

        {endMode === "count" && (
          <div className="flex items-center gap-1.5">
            <Input
              id={endCountId}
              type="number"
              min={1}
              value={value.count ?? 1}
              disabled={disabled}
              onChange={(event) =>
                onChange({ ...value, endsAt: null, count: Math.max(1, Number(event.target.value) || 1) })
              }
              className="w-16"
              aria-label="Cantidad de repeticiones"
            />
            <span className="text-sm text-text-secondary">veces</span>
          </div>
        )}
      </div>
    </div>
  );
}
