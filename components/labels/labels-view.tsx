"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Pencil, Plus, Star, Tag, Trash2 } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";
import { useLabels, type Label } from "@/lib/labels/use-labels";
import { useUpdateLabel } from "@/lib/labels/mutations";
import { resolveProjectColorHex } from "@/lib/validation/colors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TaskListEmptyState } from "@/components/tasks/task-list-empty-state";
import { LabelFormDialog } from "./label-form-dialog";
import { DeleteLabelDialog } from "./delete-label-dialog";

/**
 * Pantalla de administración de etiquetas (bloque 4.1/4.2, capacidad
 * `administracion-de-etiquetas`): crear, renombrar, recolorear y eliminar.
 * `initialLabels` siembra el mismo caché de `useLabels` que ya consume el
 * selector de etiquetas del detalle de tarea
 * (`components/tasks/label-picker.tsx`), así que un cambio acá se refleja
 * ahí sin una query aparte. Mismo tratamiento de encabezado que
 * `app/(app)/bandeja/page.tsx` (ícono + título dentro de `max-w-content`) y
 * mismo `TaskListEmptyState` que las cuatro vistas de tareas: un estado
 * vacío nunca es una pantalla en blanco (`.claude/rules/copy.md`).
 */
export function LabelsView({ initialLabels }: { initialLabels: Label[] }) {
  const { data: labels } = useLabels(initialLabels);
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const theme = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const items = labels ?? [];
  const updateLabel = useUpdateLabel();

  const [formOpen, setFormOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | undefined>(undefined);
  const [deletingLabel, setDeletingLabel] = useState<Label | null>(null);

  function openCreate() {
    setEditingLabel(undefined);
    setFormOpen(true);
  }

  function openEdit(label: Label) {
    setEditingLabel(label);
    setFormOpen(true);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <div className="flex w-full max-w-content items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Tag aria-hidden className="size-5 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">Etiquetas</h1>
          </div>
          {items.length > 0 && (
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Nueva etiqueta
            </Button>
          )}
        </div>
      </header>

      <div className="w-full max-w-content flex-1 overflow-y-auto p-4 sm:p-6">
        {items.length === 0 ? (
          <TaskListEmptyState
            icon={Tag}
            title="Todavía no tenés etiquetas."
            description="Las etiquetas agrupan tareas que cruzan proyectos, como “Urgente” o “Casa”. Creá la primera para empezar."
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Nueva etiqueta
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {items.map((label) => (
              <li key={label.id} className="flex items-center gap-2.5 px-3 py-2.5">
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: resolveProjectColorHex(label.color, theme) }}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{label.name}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={label.is_favorite ? `Quitar ${label.name} de favoritos` : `Marcar ${label.name} como favorita`}
                  onClick={() => updateLabel.mutate({ id: label.id, patch: { is_favorite: !label.is_favorite } })}
                >
                  <Star className={cn("size-4", label.is_favorite && "fill-current text-primary")} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Editar ${label.name}`}
                  onClick={() => openEdit(label)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Eliminar ${label.name}`}
                  onClick={() => setDeletingLabel(label)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <LabelFormDialog open={formOpen} onOpenChange={setFormOpen} label={editingLabel} />
      {deletingLabel && (
        <DeleteLabelDialog
          open={!!deletingLabel}
          onOpenChange={(open) => {
            if (!open) setDeletingLabel(null);
          }}
          label={deletingLabel}
        />
      )}
    </div>
  );
}
