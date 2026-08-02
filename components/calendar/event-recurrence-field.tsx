"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { quickOptionsFor, type QuickOption } from "@/lib/recurrence/rule";
import type { CalendarDate } from "@/lib/parser/dates";
import { CustomRecurrenceDialog } from "@/components/recurrence/custom-recurrence-dialog";
import type { EventRecurrenceValue } from "@/lib/calendar/event-recurrence";

const NONE_OPTION_ID = "none";
const CUSTOM_OPTION_ID = "custom";
const NONE_OPTION_LABEL = "No se repite";
const CUSTOM_OPTION_LABEL = "Personalizada…";

function toCalendarDate(date: Date): CalendarDate {
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

/** El id de la opción rápida cuya regla coincide con la actual, "custom" si trae fin propio o ninguna coincide, o "none" si no se repite. */
function matchedOptionId(value: EventRecurrenceValue, quickOptions: QuickOption[]): string {
  if (!value) return NONE_OPTION_ID;
  if (value.endsAt !== null || value.count !== null) return CUSTOM_OPTION_ID;
  return quickOptions.find((option) => option.rule === value.rule)?.id ?? CUSTOM_OPTION_ID;
}

/**
 * Selector de repetición del alta/edición de evento (`alta-de-evento-completa`,
 * D-C): opciones rápidas derivadas de la fecha del evento ("cada día", "cada
 * semana el <día>", "cada día laborable", "cada mes el <número>", "cada año
 * la <fecha>", más "No se repite" como una opción más de la lista, tal cual
 * lo mostró el dueño) y "Personalizada…", que comparte
 * `CustomRecurrenceDialog` con `components/tasks/recurrence-editor.tsx`
 * (tarea 3.2) con `showAnchorQuestion={false}` (tarea 3.3): un evento no se
 * completa, la pregunta de ancla no significa nada acá.
 *
 * A diferencia de `RecurrenceEditor`, no hay un selector de "Termina"
 * separado para las opciones rápidas: no lo pidió nadie (`design.md`, D-C
 * solo menciona las opciones rápidas y la personalizada), y las opciones
 * rápidas siempre repiten sin fin — quien quiera un fin entra a
 * "Personalizada…", que ya lo resuelve.
 */
export function EventRecurrenceField({
  value,
  onChange,
  date,
  weekStartsOn = 1,
  disabled,
}: {
  value: EventRecurrenceValue;
  onChange: (value: EventRecurrenceValue) => void;
  /** Fecha del evento, de donde se derivan las opciones rápidas (D-C). */
  date: Date;
  weekStartsOn?: 0 | 1 | 6;
  disabled?: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  // Mismo patrón que `RecurrenceEditor`: cambia cada vez que se abre el
  // diálogo, para que nazca de nuevo con los valores vigentes en cada
  // apertura (ver el docstring de `CustomRecurrenceDialog`).
  const [dialogSession, setDialogSession] = useState(0);

  const quickOptions = quickOptionsFor(toCalendarDate(date));
  const selectedId = matchedOptionId(value, quickOptions);

  function openDialog() {
    setDialogSession((session) => session + 1);
    setDialogOpen(true);
  }

  function selectOption(nextId: string | null) {
    if (nextId === null) return;
    if (nextId === NONE_OPTION_ID) {
      onChange(null);
      return;
    }
    if (nextId === CUSTOM_OPTION_ID) {
      openDialog();
      return;
    }
    const option = quickOptions.find((o) => o.id === nextId);
    if (option) onChange({ rule: option.rule, endsAt: null, count: null });
  }

  const items: Record<string, string> = {
    [NONE_OPTION_ID]: NONE_OPTION_LABEL,
    ...Object.fromEntries(quickOptions.map((option) => [option.id, option.label])),
    [CUSTOM_OPTION_ID]: CUSTOM_OPTION_LABEL,
  };

  // Semilla del diálogo personalizado: si ya había una repetición (aunque
  // sea una opción rápida), se edita a partir de ella; si no había ninguna
  // ("No se repite"), arranca en "cada semana el <día del evento>" — mismo
  // default razonable que usa `RecurrenceEditor` al activar la repetición
  // de una tarea por primera vez.
  const dialogSeed = value ?? { rule: quickOptions.find((o) => o.id === "weekly")!.rule, endsAt: null, count: null };

  return (
    <div className="flex flex-col gap-1.5">
      <Select items={items} value={selectedId} onValueChange={selectOption}>
        <SelectTrigger aria-label="Repetición" disabled={disabled} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_OPTION_ID}>{NONE_OPTION_LABEL}</SelectItem>
          {quickOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_OPTION_ID}>{CUSTOM_OPTION_LABEL}</SelectItem>
        </SelectContent>
      </Select>

      {selectedId === CUSTOM_OPTION_ID && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-input px-2.5 py-2 text-sm text-text-secondary">
          <span>Repetición personalizada</span>
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={openDialog}>
            Editar
          </Button>
        </div>
      )}

      <CustomRecurrenceDialog
        key={dialogSession}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        value={{ ...dialogSeed, anchor: null }}
        onSave={(next) => onChange({ rule: next.rule, endsAt: next.endsAt, count: next.count })}
        showAnchorQuestion={false}
        weekStartsOn={weekStartsOn}
      />
    </div>
  );
}
