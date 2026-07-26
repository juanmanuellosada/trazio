"use client";

import { useTheme } from "next-themes";
import { Check } from "lucide-react";
import { useLabels } from "@/lib/labels/use-labels";
import { useReplaceTaskLabels } from "@/lib/tasks/mutations";
import type { LabelChip } from "@/lib/tasks/use-tasks";
import { PROJECT_COLORS } from "@/lib/validation/colors";
import { cn } from "@/lib/utils";

/**
 * Etiquetas del detalle de tarea (bloque 7.12, spec de `etiquetas`): elegir
 * de las etiquetas existentes del usuario. La creación de etiquetas es del
 * alta rápida (`#`, bloque 9, fuera de esta tarea) — acá no hay "crear
 * etiqueta", solo asignar o quitar. Cada click reemplaza el conjunto
 * completo (nunca alta/baja incremental contra el servidor, como pide el
 * requirement).
 */
export function LabelPicker({
  taskId,
  projectId,
  assigned,
  disabled,
}: {
  taskId: string;
  projectId: string;
  assigned: LabelChip[];
  disabled?: boolean;
}) {
  const { data: labels } = useLabels();
  const replaceLabels = useReplaceTaskLabels();
  const { resolvedTheme } = useTheme();
  const assignedIds = new Set(assigned.map((l) => l.id));

  function toggle(label: LabelChip) {
    const next = assignedIds.has(label.id) ? assigned.filter((l) => l.id !== label.id) : [...assigned, label];
    replaceLabels.mutate({ taskId, projectId, labels: next });
  }

  if (!labels || labels.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Todavía no tenés etiquetas. Se crean solas al escribir <span className="font-mono">#nombre</span> en el
        alta rápida.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Etiquetas de la tarea">
      {labels.map((label) => {
        const isAssigned = assignedIds.has(label.id);
        // Indexar PROJECT_COLORS acá es seguro: es `label.color`, no
        // `project.color`, y el check constraint de `labels` garantiza una
        // de las diez claves de la paleta (sin la excepción del azul de
        // marca que sí tiene `projects.color`). Ver `resolveProjectColorHex`
        // en `lib/validation/colors.ts`.
        const hex = resolvedTheme === "dark" ? PROJECT_COLORS[label.color].dark : PROJECT_COLORS[label.color].light;
        return (
          <button
            key={label.id}
            type="button"
            aria-pressed={isAssigned}
            disabled={disabled}
            onClick={() => toggle(label)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
              isAssigned ? "border-transparent text-white" : "border-border text-text-secondary hover:bg-surface",
            )}
            style={isAssigned ? { backgroundColor: hex } : undefined}
          >
            {isAssigned && <Check className="size-3" aria-hidden />}
            {label.name}
          </button>
        );
      })}
    </div>
  );
}
