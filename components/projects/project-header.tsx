"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Inbox, MoreHorizontal, Star } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useUpdateProject } from "@/lib/projects/mutations";
import type { ProjectRow } from "@/lib/projects/use-projects";
import { resolveProjectColorHex } from "@/lib/validation/colors";
import { cn } from "@/lib/utils";
import { ProjectFormDialog } from "./project-form-dialog";
import { DeleteProjectDialog } from "./delete-project-dialog";

/**
 * Encabezado de la vista de proyecto (bloque 6): nombre, ícono/color,
 * descripción y las acciones del proyecto. La Bandeja de entrada no ofrece
 * "Editar" (no se puede renombrar — B3 del design de fase 1), "Archivar" ni
 * "Eliminar" (bloque 6.7): directamente no se renderiza el menú de acciones
 * para ella, no solo se deshabilitan sus opciones.
 */
export function ProjectHeader({
  project,
  allProjects,
}: {
  project: ProjectRow;
  allProjects: ProjectRow[];
}) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const updateProject = useUpdateProject();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const hex = resolveProjectColorHex(project.color, resolvedTheme === "dark" ? "dark" : "light");

  return (
    <header className="border-b border-border px-4 py-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-content items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {project.is_inbox ? (
            <Inbox aria-hidden className="mt-0.5 size-6 text-primary" />
          ) : project.icon ? (
            <span aria-hidden className="text-2xl leading-none">
              {project.icon}
            </span>
          ) : (
            <span
              aria-hidden
              className="mt-1.5 size-3 shrink-0 rounded-full"
              style={{ backgroundColor: hex }}
            />
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-foreground">{project.name}</h1>
            {project.description ? <p className="mt-1 text-sm text-text-secondary">{project.description}</p> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
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
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {!project.is_inbox && (
        <>
          <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
          <DeleteProjectDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            project={project}
            allProjects={allProjects}
            onDeleted={() => router.push("/bandeja")}
          />
        </>
      )}
    </header>
  );
}
