"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { RecurrenceAnchor } from "@/lib/recurrence/anchor";
import {
  FREQUENCY_LABELS,
  FREQUENCY_OPTIONS,
  WEEKDAY_OPTIONS,
  buildRule,
  parseRule,
  type Frequency,
} from "@/lib/recurrence/rule";
import { EndDatePicker } from "./end-date-picker";

type EndMode = "never" | "date" | "count";

const END_MODE_LABELS: Record<EndMode, string> = {
  never: "Nunca",
  date: "En una fecha",
  count: "Después de repetir",
};
const END_MODE_OPTIONS = Object.keys(END_MODE_LABELS) as EndMode[];

type AnchorChoice = "auto" | RecurrenceAnchor;

const ANCHOR_LABELS: Record<AnchorChoice, string> = {
  auto: "Automático, según la regla",
  due: "Desde el vencimiento",
  completion: "Desde que la completás",
};
const ANCHOR_OPTIONS = Object.keys(ANCHOR_LABELS) as AnchorChoice[];

/** Valor que edita el diálogo: siempre una repetición activa (nunca `rule: null`) — quitar la repetición es una acción aparte, de quien lo monta. */
export type CustomRecurrenceValue = {
  rule: string;
  endsAt: string | null;
  count: number | null;
  /** `null`: sin elegir, se deduce de la forma de la regla (`repeticion-configurable`, D-A). Ignorado (viaja sin tocar) cuando `showAnchorQuestion` es `false`, porque ese dominio no tiene el concepto. */
  anchor: RecurrenceAnchor | null;
};

function endModeOf(value: CustomRecurrenceValue): EndMode {
  if (value.endsAt !== null) return "date";
  if (value.count !== null) return "count";
  return "never";
}

/**
 * Diálogo de repetición personalizada (`repeticion-configurable`, D-D):
 * desde qué fecha cuenta, cada cuántas unidades, qué días de la semana, y
 * cuándo termina. Compartido con el alta de eventos de calendario (la tanda
 * siguiente): `showAnchorQuestion` es la única diferencia entre los dos
 * usos — un evento no se completa, así que la primera pregunta no
 * significa nada ahí y se oculta entera.
 *
 * Solo edita `FREQ`/`INTERVAL`/`BYDAY` (D-B: no es un editor visual de
 * RRULE completo). Si la regla que trae ya tenía `BYMONTHDAY`/`BYMONTH`
 * (de una opción rápida "cada mes"/"cada año", o del parser de lenguaje
 * natural), esos componentes viajan intactos mientras la frecuencia siga
 * siendo mensual/anual — el mismo principio de no destruir en silencio que
 * `RecurrenceEditor` aplica al resto de la regla.
 *
 * El estado editable se siembra una sola vez, al montar, a partir de
 * `value` (`useState` sin efecto): quien lo abre tiene que pasarle una
 * `key` que cambie cada vez que se abre (mismo patrón que
 * `TaskDetailForm key={task.id}`), para que este formulario nazca de nuevo
 * con los valores vigentes en cada apertura, sin resincronizar por efecto
 * mientras la persona lo tiene abierto y edita.
 */
export function CustomRecurrenceDialog({
  open,
  onOpenChange,
  value,
  onSave,
  showAnchorQuestion,
  weekStartsOn = 1,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: CustomRecurrenceValue;
  onSave: (value: CustomRecurrenceValue) => void;
  /** `false` para el alta de eventos: un evento no se completa, la primera pregunta no significa nada ahí. */
  showAnchorQuestion: boolean;
  weekStartsOn?: 0 | 1 | 6;
}) {
  const frequencyId = useId();
  const intervalId = useId();
  const endModeId = useId();
  const endCountId = useId();
  const anchorId = useId();

  const initialComponents = parseRule(value.rule);
  const [frequency, setFrequency] = useState<Frequency>(initialComponents.frequency);
  const [interval, setInterval] = useState(initialComponents.interval);
  const [byDay, setByDay] = useState<Set<string>>(() => new Set(initialComponents.byDay));
  // Sin control propio en este diálogo (D-B: no es un editor visual de RRULE
  // completo) — viajan intactos mientras la frecuencia siga siendo
  // mensual/anual, para no destruirlos en silencio si ya venían de una
  // opción rápida "cada mes"/"cada año" o del parser de lenguaje natural.
  const passthroughByMonthDay = initialComponents.byMonthDay;
  const passthroughByMonth = initialComponents.byMonth;
  const [endMode, setEndMode] = useState<EndMode>(() => endModeOf(value));
  const [endsAt, setEndsAt] = useState(value.endsAt ?? "");
  const [count, setCount] = useState(value.count ?? 1);
  const [anchor, setAnchor] = useState<AnchorChoice>(value.anchor ?? "auto");

  function toggleDay(code: string) {
    setByDay((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handleSave() {
    const rule = buildRule({
      frequency,
      interval: Math.max(1, interval),
      byDay: frequency === "WEEKLY" ? Array.from(byDay) : [],
      byMonthDay: frequency === "MONTHLY" || frequency === "YEARLY" ? passthroughByMonthDay : null,
      byMonth: frequency === "YEARLY" ? passthroughByMonth : null,
    });
    onSave({
      rule,
      endsAt: endMode === "date" ? endsAt || "" : null,
      count: endMode === "count" ? Math.max(1, count) : null,
      anchor: showAnchorQuestion ? (anchor === "auto" ? null : anchor) : value.anchor,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Repetición personalizada</DialogTitle>
          <DialogDescription>Elegí cada cuánto se repite, qué días y cuándo termina.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {showAnchorQuestion && (
            <div className="space-y-1">
              <Label htmlFor={anchorId} className="text-text-secondary">
                ¿Desde qué fecha cuenta?
              </Label>
              <Select items={ANCHOR_LABELS} value={anchor} onValueChange={(next) => setAnchor(next as AnchorChoice)}>
                <SelectTrigger id={anchorId} aria-label="¿Desde qué fecha cuenta?" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANCHOR_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {ANCHOR_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Label htmlFor={intervalId} className="text-text-secondary">
              Repetir cada
            </Label>
            <Input
              id={intervalId}
              type="number"
              min={1}
              value={interval}
              onChange={(event) => setInterval(Math.max(1, Number(event.target.value) || 1))}
              className="w-16"
              aria-label="Intervalo de repetición"
            />
            <Select items={FREQUENCY_LABELS} value={frequency} onValueChange={(next) => setFrequency(next as Frequency)}>
              <SelectTrigger id={frequencyId} aria-label="Frecuencia de la repetición" className="flex-1">
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

          {frequency === "WEEKLY" && (
            <div className="space-y-1">
              <Label className="text-text-secondary">Qué días</Label>
              <div role="group" aria-label="Días de la semana" className="flex flex-wrap gap-1.5">
                {WEEKDAY_OPTIONS.map((day) => {
                  const selected = byDay.has(day.code);
                  return (
                    <button
                      key={day.code}
                      type="button"
                      aria-pressed={selected}
                      aria-label={day.full}
                      onClick={() => toggleDay(day.code)}
                      className={cn(
                        "flex h-9 w-11 items-center justify-center rounded-lg border text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-input text-foreground hover:bg-surface",
                      )}
                    >
                      {day.short}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor={endModeId} className="text-text-secondary">
              Termina
            </Label>
            <Select items={END_MODE_LABELS} value={endMode} onValueChange={(next) => setEndMode(next as EndMode)}>
              <SelectTrigger id={endModeId} className="w-44">
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

            {endMode === "date" && <EndDatePicker value={endsAt} weekStartsOn={weekStartsOn} onChange={setEndsAt} />}

            {endMode === "count" && (
              <div className="flex items-center gap-1.5">
                <Input
                  id={endCountId}
                  type="number"
                  min={1}
                  value={count}
                  onChange={(event) => setCount(Math.max(1, Number(event.target.value) || 1))}
                  className="w-16"
                  aria-label="Cantidad de repeticiones"
                />
                <span className="text-sm text-text-secondary">veces</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
