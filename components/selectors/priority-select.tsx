"use client";

import { Check, Flag } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TASK_PRIORITIES, priorityLabel } from "@/lib/validation/tasks";
import { cn } from "@/lib/utils";

const PRIORITY_DOT_VAR: Record<number, string> = {
  1: "var(--priority-urgent)",
  2: "var(--priority-high)",
  3: "var(--priority-medium)",
  4: "var(--priority-low)",
};

export function PriorityDot({ priority, className }: { priority: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: PRIORITY_DOT_VAR[priority] ?? PRIORITY_DOT_VAR[4] }}
    />
  );
}

/**
 * Código y nombre juntos (decisión D33, tarea 5.5): `P1 · Urgente` en vez de
 * solo `Urgente`. El código es lo que se tipea y se busca, el nombre es lo
 * que explica qué significa sin deducirlo del orden.
 */
function priorityCodeLabel(priority: { value: number; label: string }): string {
  return `P${priority.value} · ${priority.label}`;
}

/**
 * Selector de prioridad (bloque 4.7), reutilizado en el detalle de tarea y
 * en el alta: guarda al instante, sin paso de confirmación. Ya se apoyaba en
 * `DropdownMenu` (primitiva de menú de shadcn/ui, no un `<select>` nativo) y
 * no tenía ningún acoplamiento al detalle de tarea, así que el bloque 4 lo
 * muda a `selectors/` sin reescribirlo.
 */
export function PrioritySelect({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (priority: number) => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-sm outline-none hover:bg-surface focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          />
        }
      >
        <Flag className="size-3.5 text-text-secondary" aria-hidden />
        <PriorityDot priority={value} />
        {priorityCodeLabel({ value, label: priorityLabel(value) })}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {TASK_PRIORITIES.map((priority) => (
          <DropdownMenuItem key={priority.value} onClick={() => onChange(priority.value)}>
            <PriorityDot priority={priority.value} />
            {priorityCodeLabel(priority)}
            {priority.value === value && <Check className="ml-auto size-3.5" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
