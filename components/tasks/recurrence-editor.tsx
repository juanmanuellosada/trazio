"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RecurrenceAnchor } from "@/lib/recurrence/anchor";
import { buildRule, quickOptionsFor, type QuickOption } from "@/lib/recurrence/rule";
import type { CalendarDate } from "@/lib/parser/dates";
import { EndDatePicker } from "@/components/recurrence/end-date-picker";
import { CustomRecurrenceDialog } from "@/components/recurrence/custom-recurrence-dialog";

/** Valor editable de la recurrencia de una tarea: las tres columnas de la fase 1 más el ancla elegible (`repeticion-configurable`, D-A). */
export type RecurrenceValue = {
  /** RRULE sin `DTSTART` (D6, `lib/recurrence/`), o `null` si la tarea no se repite. */
  rule: string | null;
  /** `yyyy-MM-dd`, o `null` si la serie no tiene fecha tope. */
  endsAt: string | null;
  /** Repeticiones restantes, o `null` si no tiene límite de cantidad. */
  count: number | null;
  /** `tasks.recurrence_anchor`: `null` si nunca se eligió (se deduce de la forma de la regla, como siempre). */
  anchor: RecurrenceAnchor | null;
};

type EndMode = "never" | "date" | "count";

const END_MODE_LABELS: Record<EndMode, string> = {
  never: "Nunca",
  date: "En una fecha",
  count: "Después de repetir",
};
const END_MODE_OPTIONS = Object.keys(END_MODE_LABELS) as EndMode[];

const CUSTOM_OPTION_ID = "custom";
const CUSTOM_OPTION_LABEL = "Personalizada…";

function parseCalendarDate(dateStr: string): CalendarDate {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
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

/** El id de la opción rápida cuya regla coincide con la actual, o "custom" si ninguna. */
function matchedOptionId(rule: string, quickOptions: QuickOption[]): string {
  return quickOptions.find((option) => option.rule === rule)?.id ?? CUSTOM_OPTION_ID;
}

/**
 * Editor de repetición del detalle de tarea (`repeticion-configurable`):
 * opciones rápidas derivadas de la fecha de la tarea ("cada día", "cada
 * semana el <día>", "cada día laborable", "cada mes el <número>", "cada
 * año la <fecha>") y "Personalizada…", que abre `CustomRecurrenceDialog`
 * para cualquier otra combinación (incluida la elección del ancla). Sin
 * fecha de tarea no hay de dónde derivar las opciones rápidas (D-C, mismo
 * criterio que `ReminderPicker` con una tarea sin fecha): en ese caso el
 * editor ofrece directamente la repetición personalizada, sin desplegable.
 *
 * "Termina" (nunca / en una fecha / después de repetir) se muestra afuera
 * del diálogo mientras la repetición sea una opción rápida — es la
 * funcionalidad que ya existía, sin tocar. Al elegir "Personalizada…" pasa
 * a vivir adentro del diálogo (que la comparte con el alta de eventos), así
 * que acá se oculta para no duplicar el control.
 */
export function RecurrenceEditor({
  value,
  onChange,
  disabled,
  dueDate,
  weekStartsOn = 1,
}: {
  value: RecurrenceValue;
  onChange: (value: RecurrenceValue) => void;
  disabled?: boolean;
  /** `yyyy-MM-dd` de la tarea (vencimiento), o `null` si no tiene — de ahí salen las opciones rápidas (D-C). */
  dueDate: string | null;
  /** Opcional (default lunes) para no forzarle este prop a un llamador que ya existe (`task-detail-content.tsx`) y no tiene la preferencia a mano. */
  weekStartsOn?: 0 | 1 | 6;
}) {
  const endModeId = useId();
  const endCountId = useId();
  const [dialogOpen, setDialogOpen] = useState(false);
  // Cambia cada vez que se abre el diálogo (nunca al cerrarlo): la `key`
  // que le pasamos a `CustomRecurrenceDialog` para que nazca de nuevo con
  // los valores vigentes en cada apertura, en vez de resincronizar su
  // estado por efecto (ver el docstring del propio diálogo).
  const [dialogSession, setDialogSession] = useState(0);

  function openDialog() {
    setDialogSession((session) => session + 1);
    setDialogOpen(true);
  }

  if (!value.rule) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() =>
          onChange({
            rule: buildRule({ frequency: "WEEKLY", interval: 1, byDay: [], byMonthDay: null, byMonth: null }),
            endsAt: null,
            count: null,
            anchor: null,
          })
        }
      >
        Repetir tarea
      </Button>
    );
  }

  const quickOptions = dueDate ? quickOptionsFor(parseCalendarDate(dueDate)) : [];
  const selectedOptionId = matchedOptionId(value.rule, quickOptions);
  const endMode = endModeOf(value);

  function setEndMode(next: EndMode) {
    if (next === "never") onChange({ ...value, endsAt: null, count: null });
    else if (next === "date") onChange({ ...value, endsAt: value.endsAt || "", count: null });
    else onChange({ ...value, endsAt: null, count: value.count ?? 1 });
  }

  function selectQuickOption(nextId: string | null) {
    if (nextId === null) return;
    if (nextId === CUSTOM_OPTION_ID) {
      openDialog();
      return;
    }
    const option = quickOptions.find((o) => o.id === nextId);
    if (option) onChange({ ...value, rule: option.rule });
  }

  const quickSelectItems: Record<string, string> = {
    ...Object.fromEntries(quickOptions.map((option) => [option.id, option.label])),
    [CUSTOM_OPTION_ID]: CUSTOM_OPTION_LABEL,
  };

  return (
    <div className="flex flex-col gap-3" data-testid="recurrence-editor">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {quickOptions.length > 0 ? (
          <Select items={quickSelectItems} value={selectedOptionId} onValueChange={selectQuickOption}>
            <SelectTrigger aria-label="Repetición" disabled={disabled} className="w-full max-w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {quickOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM_OPTION_ID}>{CUSTOM_OPTION_LABEL}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={openDialog}>
            Repetición personalizada
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="text-text-secondary"
          onClick={() => onChange({ rule: null, endsAt: null, count: null, anchor: null })}
        >
          <X className="size-3.5" /> Quitar repetición
        </Button>
      </div>

      {quickOptions.length > 0 && selectedOptionId === CUSTOM_OPTION_ID && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-input px-2.5 py-2 text-sm text-text-secondary">
          <span>Repetición personalizada</span>
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={openDialog}>
            Editar
          </Button>
        </div>
      )}

      {selectedOptionId !== CUSTOM_OPTION_ID && (
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
            <EndDatePicker
              value={value.endsAt ?? ""}
              disabled={disabled}
              weekStartsOn={weekStartsOn}
              onChange={(date) => onChange({ ...value, endsAt: date, count: null })}
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
      )}

      <CustomRecurrenceDialog
        key={dialogSession}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        value={{ rule: value.rule, endsAt: value.endsAt, count: value.count, anchor: value.anchor }}
        onSave={(next) => onChange(next)}
        showAnchorQuestion
        weekStartsOn={weekStartsOn}
      />
    </div>
  );
}
