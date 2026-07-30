"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Filter, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";
import { useFilters, type FilterRow } from "@/lib/filters/use-filters";
import { useToggleFilterFavorite } from "@/lib/filters/mutations";
import { resolveProjectColorHex } from "@/lib/validation/colors";
import { Button } from "@/components/ui/button";
import { TaskListEmptyState } from "@/components/tasks/task-list-empty-state";
import { FilterFormDialog } from "./filter-form-dialog";
import { DeleteFilterDialog } from "./delete-filter-dialog";

/**
 * Pantalla de administración de filtros (bloque 2.13, capacidad
 * `filtros-guardados`): crear, editar y eliminar, con el mismo tratamiento
 * de encabezado y estado vacío que `LabelsView`. Marcar/desmarcar favorito
 * (bloque 2.12) tiene su propio botón acá, sin pasar por el formulario.
 */
export function FiltersView({ initialFilters }: { initialFilters: FilterRow[] }) {
  const { data: filters } = useFilters(initialFilters);
  const toggleFavorite = useToggleFilterFavorite();
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const theme = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const items = filters ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<FilterRow | undefined>(undefined);
  const [deletingFilter, setDeletingFilter] = useState<FilterRow | null>(null);

  function openCreate() {
    setEditingFilter(undefined);
    setFormOpen(true);
  }

  function openEdit(filter: FilterRow) {
    setEditingFilter(filter);
    setFormOpen(true);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <div className="flex w-full max-w-content items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter aria-hidden className="size-5 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">Filtros</h1>
          </div>
          {items.length > 0 && (
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Nuevo filtro
            </Button>
          )}
        </div>
      </header>

      <div className="w-full max-w-content flex-1 overflow-y-auto p-4 sm:p-6">
        {items.length === 0 ? (
          <TaskListEmptyState
            icon={Filter}
            title="Todavía no tenés filtros guardados."
            description="Un filtro guarda una consulta para volver a ejecutarla cuando quieras, como “priority:1,2 & due:next7days”. Creá el primero para empezar."
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Nuevo filtro
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {items.map((filter) => (
              <li key={filter.id} className="flex items-center gap-2.5 px-3 py-2.5">
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: resolveProjectColorHex(filter.color, theme) }}
                />
                {filter.icon ? <span aria-hidden>{filter.icon}</span> : null}
                <Link href={`/filtros/${filter.id}`} className="min-w-0 flex-1 truncate text-sm text-foreground hover:underline">
                  {filter.name}
                </Link>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={filter.is_favorite ? `Quitar ${filter.name} de favoritos` : `Marcar ${filter.name} como favorito`}
                  aria-pressed={filter.is_favorite}
                  onClick={() => toggleFavorite.mutate({ id: filter.id, isFavorite: !filter.is_favorite })}
                >
                  <Star className={filter.is_favorite ? "size-4 fill-current text-primary" : "size-4"} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Editar ${filter.name}`}
                  onClick={() => openEdit(filter)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Eliminar ${filter.name}`}
                  onClick={() => setDeletingFilter(filter)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <FilterFormDialog open={formOpen} onOpenChange={setFormOpen} filter={editingFilter} />
      {deletingFilter && (
        <DeleteFilterDialog
          open={!!deletingFilter}
          onOpenChange={(open) => {
            if (!open) setDeletingFilter(null);
          }}
          filter={deletingFilter}
        />
      )}
    </div>
  );
}
