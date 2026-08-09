"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Star } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUpdateProject } from "@/lib/projects/mutations";
import type { ProjectRow } from "@/lib/projects/use-projects";
import type { ViewOptions } from "@/lib/view-options/schema";
import { ViewOptionsBar } from "@/components/view-options/view-options-bar";
import { cn } from "@/lib/utils";
import { ProjectFormDialog } from "./project-form-dialog";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { DeleteExampleContentDialog } from "./delete-example-content-dialog";

/**
 * Encabezado de la vista de proyecto (bloque 6): nombre, descripción y las
 * acciones del proyecto. La Bandeja de entrada no ofrece
 * "Editar" (no se puede renombrar — B3 del design de fase 1), "Archivar" ni
 * "Eliminar" (bloque 6.7): directamente no se renderiza el menú de acciones
 * para ella, no solo se deshabilitan sus opciones.
 *
 * El disparador de opciones de vista (`interfaz-descubrible`, D-A) vive acá
 * adentro, separado de favorito/menú por un `Separator` vertical: son
 * acciones de naturaleza distinta (configurar cómo se ve la lista vs. actuar
 * sobre el proyecto en sí). `showViewShape` siempre `true`: Proyecto tiene
 * modo panel.
 *
 * El proyecto de ejemplo (`project.is_example`, `onboarding-con-ejemplos`
 * D-D) cambia el destructivo del menú por "Borrar los ejemplos" y abre
 * `DeleteExampleContentDialog` en vez de `DeleteProjectDialog`: la misma
 * confirmación, pero que además se lleva el hábito de ejemplo.
 */
export function ProjectHeader({
  project,
  allProjects,
  viewKey,
  initialOptions,
}: {
  project: ProjectRow;
  allProjects: ProjectRow[];
  viewKey: string;
  initialOptions: ViewOptions;
}) {
  const router = useRouter();
  const updateProject = useUpdateProject();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <header className="border-b border-border px-4 py-4 sm:px-6">
      <div className="flex w-full max-w-content mx-auto items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold text-foreground">{project.name}</h1>
          {project.description ? <p className="mt-1 text-sm text-text-secondary">{project.description}</p> : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={project.is_favorite ? "Quitar de favoritos" : "Marcar como favorito"}
              onClick={() => updateProject.mutate({ id: project.id, patch: { is_favorite: !project.is_favorite } })}
            >
              <Star className={cn("size-4", project.is_favorite && "fill-current text-primary")} />
            </Button>

            {!project.is_inbox && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon-sm" aria-label="Más acciones del proyecto" />}
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      updateProject.mutate({ id: project.id, patch: { is_archived: !project.is_archived } })
                    }
                  >
                    {project.is_archived ? "Desarchivar" : "Archivar"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                    {project.is_example ? "Borrar los ejemplos" : "Eliminar"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <Separator orientation="vertical" className="h-5" />

          <ViewOptionsBar viewKey={viewKey} initialOptions={initialOptions} showViewShape showDaysAhead={false} />
        </div>
      </div>

      {!project.is_inbox && (
        <>
          <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
          {project.is_example ? (
            <DeleteExampleContentDialog
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              project={project}
              allProjects={allProjects}
              onDeleted={() => router.push("/bandeja")}
            />
          ) : (
            <DeleteProjectDialog
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              project={project}
              allProjects={allProjects}
              onDeleted={() => router.push("/bandeja")}
            />
          )}
        </>
      )}
    </header>
  );
}
