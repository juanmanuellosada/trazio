"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, GripVertical, MoreHorizontal, Plus } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useMounted } from "@/hooks/use-mounted";
import { resolveProjectColorHex } from "@/lib/validation/colors";
import { useProjects, type ProjectRow } from "@/lib/projects/use-projects";
import { useDuplicateProject, useMoveProject, useUpdateProject } from "@/lib/projects/mutations";
import { useLabels, type Label } from "@/lib/labels/use-labels";
import { useFilters, type FilterRow } from "@/lib/filters/use-filters";
import { MAX_PROJECT_DEPTH, positionForIndex, positionForSwap, projectDepth } from "@/lib/projects/tree";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { MoveProjectDialog } from "@/components/projects/move-project-dialog";
import { cn } from "@/lib/utils";

export function ProjectMark({ project }: { project: Pick<ProjectRow, "color" | "icon"> }) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();

  if (project.icon) {
    return (
      <span aria-hidden className="shrink-0 text-sm leading-none">
        {project.icon}
      </span>
    );
  }

  // `resolvedTheme` se resuelve en el cliente desde el primer render (lee
  // `localStorage` de forma síncrona), antes de montar — puede no coincidir
  // con lo que asumió el servidor. Hasta montar, forzar "light" (lo mismo
  // que el servidor, que nunca conoce el tema real).
  const hex = resolveProjectColorHex(project.color, mounted && resolvedTheme === "dark" ? "dark" : "light");
  return <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: hex }} />;
}

function ProjectLink({ project, taskCount }: { project: ProjectRow; taskCount: number }) {
  const pathname = usePathname();
  const active = pathname === `/proyecto/${project.id}`;

  return (
    <Link
      href={`/proyecto/${project.id}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md pr-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-surface font-medium text-primary"
          : "text-text-secondary hover:bg-surface hover:text-foreground",
      )}
    >
      <ProjectMark project={project} />
      <span className="flex-1 truncate">{project.name}</span>
      {taskCount > 0 && <span className="text-xs tabular-nums text-text-secondary">{taskCount}</span>}
    </Link>
  );
}

/**
 * Menú contextual de un proyecto (bloque 6.6): el camino sin arrastre para
 * todo lo que también se puede hacer arrastrando (reordenar, anidar), más
 * el resto de acciones del proyecto (editar, duplicar, favorito, archivar,
 * borrar).
 */
function ProjectActionsMenu({
  project,
  allProjects,
  canHaveChildren,
  onMoveUp,
  onMoveDown,
}: {
  project: ProjectRow;
  allProjects: ProjectRow[];
  canHaveChildren: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const router = useRouter();
  const updateProject = useUpdateProject();
  const duplicateProject = useDuplicateProject();
  const [editOpen, setEditOpen] = useState(false);
  const [createSubOpen, setCreateSubOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Más acciones para ${project.name}`}
              className="shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 data-popup-open:opacity-100"
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {canHaveChildren && (
            <DropdownMenuItem onClick={() => setCreateSubOpen(true)}>Agregar subproyecto</DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar</DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              duplicateProject.mutate(project, {
                onSuccess: (newProjectId) => router.push(`/proyecto/${newProjectId}`),
              })
            }
          >
            Duplicar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => updateProject.mutate({ id: project.id, patch: { is_favorite: !project.is_favorite } })}
          >
            {project.is_favorite ? "Quitar de favoritos" : "Marcar como favorito"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onMoveUp}>Mover arriba</DropdownMenuItem>
          <DropdownMenuItem onClick={onMoveDown}>Mover abajo</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMoveOpen(true)}>Mover a…</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => updateProject.mutate({ id: project.id, patch: { is_archived: !project.is_archived } })}
          >
            {project.is_archived ? "Desarchivar" : "Archivar"}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
      <ProjectFormDialog
        open={createSubOpen}
        onOpenChange={setCreateSubOpen}
        parentId={project.id}
        allProjects={allProjects}
      />
      <MoveProjectDialog open={moveOpen} onOpenChange={setMoveOpen} project={project} allProjects={allProjects} />
      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        project={project}
        allProjects={allProjects}
      />
    </>
  );
}

/** Nodo recursivo del árbol, arrastrable (bloque 6.3/6.6). */
function ProjectTreeItem({
  project,
  all,
  taskCounts,
  depth,
}: {
  project: ProjectRow;
  all: ProjectRow[];
  taskCounts: Map<string, number>;
  depth: number;
}) {
  const [open, setOpen] = useState(true);
  const moveProject = useMoveProject();
  const children = all.filter((p) => p.parent_id === project.id && !p.is_archived);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  function moveWithinSiblings(direction: "up" | "down") {
    const siblings = all
      .filter((p) => p.parent_id === project.parent_id && !p.is_archived)
      .sort((a, b) => a.position - b.position);
    const index = siblings.findIndex((p) => p.id === project.id);
    const position = positionForSwap(siblings, index, direction);
    if (position == null) return;
    moveProject.mutate({ id: project.id, parentId: project.parent_id, position });
  }

  const row = (
    <div className={cn("group flex items-center", isDragging && "opacity-50")}>
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reordenar ${project.name}`}
        className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-text-secondary opacity-0 outline-none group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
      >
        <GripVertical className="size-3.5" />
      </button>
      {children.length > 0 ? (
        <CollapsibleTrigger
          aria-label={open ? `Contraer ${project.name}` : `Expandir ${project.name}`}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-secondary outline-none hover:bg-surface focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        </CollapsibleTrigger>
      ) : (
        <span aria-hidden className="size-7 shrink-0" />
      )}
      <ProjectLink project={project} taskCount={taskCounts.get(project.id) ?? 0} />
      <ProjectActionsMenu
        project={project}
        allProjects={all}
        canHaveChildren={projectDepth(all, project.id) < MAX_PROJECT_DEPTH}
        onMoveUp={() => moveWithinSiblings("up")}
        onMoveDown={() => moveWithinSiblings("down")}
      />
    </div>
  );

  return (
    <li ref={setNodeRef} style={{ ...style, paddingLeft: `${depth * 16}px` }}>
      {children.length > 0 ? (
        <Collapsible open={open} onOpenChange={setOpen}>
          {row}
          <CollapsibleContent>
            <ProjectTreeLevel projects={children} all={all} taskCounts={taskCounts} depth={depth + 1} />
          </CollapsibleContent>
        </Collapsible>
      ) : (
        row
      )}
    </li>
  );
}

/** Un nivel de hermanos, con su propio `SortableContext` para el arrastre. */
function ProjectTreeLevel({
  projects,
  all,
  taskCounts,
  depth,
}: {
  projects: ProjectRow[];
  all: ProjectRow[];
  taskCounts: Map<string, number>;
  depth: number;
}) {
  const ids = projects.map((p) => p.id);
  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <ul className="flex flex-col gap-0.5">
        {projects.map((project) => (
          <ProjectTreeItem key={project.id} project={project} all={all} taskCounts={taskCounts} depth={depth} />
        ))}
      </ul>
    </SortableContext>
  );
}

/**
 * Árbol de proyectos del panel lateral (bloque 5.3, con la interacción del
 * bloque 6). `initialProjects` siembra el caché de TanStack Query con lo que
 * ya trajo el Server Component del layout, así que el primer render no
 * repite el fetch. La Bandeja no viaja acá (se muestra aparte, como acceso
 * principal fijo); los archivados tampoco, según "Archivar conserva los
 * datos" del spec: dejan de listarse en la navegación cotidiana.
 */
export function ProjectTree({
  initialProjects,
  taskCounts,
}: {
  initialProjects: ProjectRow[];
  taskCounts: Map<string, number>;
}) {
  const { data } = useProjects(initialProjects);
  const moveProject = useMoveProject();
  const visible = (data ?? []).filter((p) => !p.is_inbox && !p.is_archived);
  const roots = visible.filter((p) => p.parent_id === null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeProject = visible.find((p) => p.id === active.id);
    const overProject = visible.find((p) => p.id === over.id);
    // El arrastre solo reordena entre hermanos: anidar (cambiar de padre) se
    // hace desde "Mover a…", el camino sin arrastre que exige el spec.
    if (!activeProject || !overProject || activeProject.parent_id !== overProject.parent_id) return;

    const siblings = visible
      .filter((p) => p.parent_id === activeProject.parent_id)
      .sort((a, b) => a.position - b.position);
    const activeIndex = siblings.findIndex((p) => p.id === active.id);
    const overIndex = siblings.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(siblings, activeIndex, overIndex);
    const newIndex = reordered.findIndex((p) => p.id === active.id);
    const others = siblings.filter((p) => p.id !== active.id).map((p) => p.position);

    moveProject.mutate({
      id: activeProject.id,
      parentId: activeProject.parent_id,
      position: positionForIndex(others, newIndex),
    });
  }

  if (roots.length === 0) {
    return <p className="px-2.5 py-1 text-sm text-text-secondary">Todavía no creaste ningún proyecto.</p>;
  }

  return (
    <DndContext
      id="project-tree"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <ProjectTreeLevel projects={roots} all={visible} taskCounts={taskCounts} depth={0} />
    </DndContext>
  );
}

/** Fila de una etiqueta favorita en la sección Favoritos (bloque 8.1): mismo trazo visual que `ProjectLink`, con un punto de color en vez del ícono/color de proyecto. */
function LabelFavoriteLink({ label }: { label: Label }) {
  const pathname = usePathname();
  const href = `/etiquetas/${label.id}`;
  const active = pathname === href;
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const hex = resolveProjectColorHex(label.color, mounted && resolvedTheme === "dark" ? "dark" : "light");

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md pr-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-surface font-medium text-primary"
          : "text-text-secondary hover:bg-surface hover:text-foreground",
      )}
    >
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: hex }} />
      <span className="flex-1 truncate">{label.name}</span>
    </Link>
  );
}

/** Fila de un filtro favorito en la sección Favoritos (bloque 8.1): reusa `ProjectMark` porque un filtro tiene la misma forma `{ color, icon }` que un proyecto. */
function FilterFavoriteLink({ filter }: { filter: FilterRow }) {
  const pathname = usePathname();
  const href = `/filtros/${filter.id}`;
  const active = pathname === href;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md pr-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-surface font-medium text-primary"
          : "text-text-secondary hover:bg-surface hover:text-foreground",
      )}
    >
      <ProjectMark project={filter} />
      <span className="flex-1 truncate">{filter.name}</span>
    </Link>
  );
}

/** Botón "Nuevo proyecto" a la altura del encabezado "Proyectos" (bloque 6.2). */
function NewProjectButton({ initialProjects }: { initialProjects: ProjectRow[] }) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const { data } = useProjects(initialProjects);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-labelledby={labelId}
        onClick={() => setOpen(true)}
        className="text-text-secondary hover:text-foreground"
      >
        <Plus className="size-3.5" />
        <span id={labelId} className="sr-only">
          Nuevo proyecto
        </span>
      </Button>
      <ProjectFormDialog open={open} onOpenChange={setOpen} parentId={null} allProjects={data ?? []} />
    </>
  );
}

/**
 * Sección "Favoritos" del panel lateral (bloque 6.4, unificada en el bloque
 * 8.1 con etiquetas y filtros): no se renderiza nada (ni el separador ni el
 * encabezado) cuando no hay ningún proyecto, etiqueta o filtro marcado como
 * favorito, y reacciona al instante cuando se marca o desmarca uno porque lee
 * del mismo caché de TanStack Query que cada mutación actualiza. Etiquetas y
 * filtros se piden acá sin `initialData`: a diferencia de los proyectos, el
 * layout del servidor (`app/(app)/layout.tsx`) no los siembra, así que
 * arrancan con el primer fetch del cliente.
 */
export function FavoritesSection({
  initialProjects,
  taskCounts,
}: {
  initialProjects: ProjectRow[];
  taskCounts: Map<string, number>;
}) {
  const { data: projects } = useProjects(initialProjects);
  const { data: labels } = useLabels();
  const { data: filters } = useFilters();

  const favoriteProjects = (projects ?? []).filter((p) => p.is_favorite && !p.is_archived && !p.is_inbox);
  const favoriteLabels = (labels ?? []).filter((l) => l.is_favorite);
  const favoriteFilters = (filters ?? []).filter((f) => f.is_favorite);
  const hasFavorites =
    favoriteProjects.length > 0 || favoriteLabels.length > 0 || favoriteFilters.length > 0;

  if (!hasFavorites) return null;

  return (
    <>
      <Separator />
      <div className="p-2">
        <h2 className="px-2.5 py-1 text-xs font-semibold tracking-wide text-text-secondary uppercase">
          Favoritos
        </h2>
        <ul className="flex flex-col gap-0.5">
          {favoriteProjects.map((project) => (
            <li key={project.id}>
              <ProjectLink project={project} taskCount={taskCounts.get(project.id) ?? 0} />
            </li>
          ))}
          {favoriteLabels.map((label) => (
            <li key={label.id}>
              <LabelFavoriteLink label={label} />
            </li>
          ))}
          {favoriteFilters.map((filter) => (
            <li key={filter.id}>
              <FilterFavoriteLink filter={filter} />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

/**
 * Sección "Proyectos" del panel lateral: encabezado con "+ Nuevo proyecto" y
 * el árbol. Ya no scrollea por sí sola (bloque 8): ahora es una más de las
 * secciones dentro del contenedor scrolleable único de `sidebar-content.tsx`,
 * junto a Favoritos y las listas colapsables de etiquetas y filtros.
 */
export function ProjectsSection({
  initialProjects,
  taskCounts,
}: {
  initialProjects: ProjectRow[];
  taskCounts: Map<string, number>;
}) {
  return (
    <div className="p-2">
      <div className="flex items-center justify-between px-2.5 py-1">
        <h2 className="text-xs font-semibold tracking-wide text-text-secondary uppercase">Proyectos</h2>
        <NewProjectButton initialProjects={initialProjects} />
      </div>
      <ProjectTree initialProjects={initialProjects} taskCounts={taskCounts} />
    </div>
  );
}
