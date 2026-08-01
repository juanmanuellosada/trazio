"use client";

import { useState } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskList } from "@/components/tasks/task-list";
import { positionForIndex, positionForSwap } from "@/lib/projects/tree";
import {
  useCreateSection,
  useDeleteSection,
  useMoveSection,
  useUpdateSection,
} from "@/lib/sections/mutations";
import { useSections, type SectionRow } from "@/lib/sections/use-sections";
import type { OrderOption, QuickFilters } from "@/lib/view-options/schema";
import { cn } from "@/lib/utils";

/** Opciones de vista que cada `TaskList` de sección necesita (bloque 6.6): mismo default "sin cambios" que ya define `TaskList`, para que un llamador sin barra de opciones (ninguno hoy) siga viendo el comportamiento anterior. */
type SectionTaskListOptions = {
  order?: OrderOption;
  quickFilters?: QuickFilters;
  showCompleted?: boolean;
  timezone?: string;
};

function SectionItem({
  section,
  projectId,
  allSections,
  taskListOptions,
  selectionOrderIds,
}: {
  section: SectionRow;
  projectId: string;
  allSections: SectionRow[];
  taskListOptions?: SectionTaskListOptions;
  /** Selección múltiple (bloque 7.10-7.13): mismo orden visual combinado que le pasa `SectionedTasks` a la lista de "sin sección" — acá se reparte igual a cada sección. */
  selectionOrderIds?: string[];
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(section.name);
  const updateSection = useUpdateSection(projectId);
  const moveSection = useMoveSection(projectId);
  const deleteSection = useDeleteSection(projectId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  function submitRename() {
    setRenaming(false);
    const trimmed = name.trim();
    if (!trimmed || trimmed === section.name) {
      setName(section.name);
      return;
    }
    updateSection.mutate({ id: section.id, patch: { name: trimmed } });
  }

  function moveWithinSiblings(direction: "up" | "down") {
    const sorted = [...allSections].sort((a, b) => a.position - b.position);
    const index = sorted.findIndex((s) => s.id === section.id);
    const position = positionForSwap(sorted, index, direction);
    if (position != null) moveSection.mutate({ id: section.id, position });
  }

  return (
    <li ref={setNodeRef} style={style} className={cn("group", isDragging && "opacity-50")}>
      <div className="flex items-center gap-1 rounded-md px-1 py-1 hover:bg-surface">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reordenar sección ${section.name}`}
          className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-text-secondary opacity-0 outline-none group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={section.is_collapsed ? `Expandir sección ${section.name}` : `Contraer sección ${section.name}`}
          onClick={() =>
            updateSection.mutate({ id: section.id, patch: { is_collapsed: !section.is_collapsed } })
          }
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-secondary outline-none hover:bg-surface focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronRight className={cn("size-3.5 transition-transform", !section.is_collapsed && "rotate-90")} />
        </button>
        {renaming ? (
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={submitRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitRename();
              }
              if (event.key === "Escape") {
                setName(section.name);
                setRenaming(false);
              }
            }}
            aria-label="Nombre de la sección"
            className="h-8 flex-1 text-sm font-medium"
          />
        ) : (
          <span className="flex-1 truncate text-sm font-semibold text-foreground">{section.name}</span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Más acciones para la sección ${section.name}`}
                className="shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 data-popup-open:opacity-100"
              />
            }
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setRenaming(true)}>Renombrar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => moveWithinSiblings("up")}>Mover arriba</DropdownMenuItem>
            <DropdownMenuItem onClick={() => moveWithinSiblings("down")}>Mover abajo</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => deleteSection.mutate(section.id)}>
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {!section.is_collapsed && (
        <div className="pl-7">
          <TaskList
            projectId={projectId}
            sectionId={section.id}
            parentId={null}
            {...taskListOptions}
            selectionOrderIds={selectionOrderIds}
          />
        </div>
      )}
    </li>
  );
}

function AddSectionRow({ projectId }: { projectId: string }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const createSection = useCreateSection(projectId);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    createSection.mutate(
      { name: trimmed },
      {
        onSuccess: () => setName(""),
      },
    );
  }

  if (!adding) {
    return (
      <Button variant="ghost" size="sm" className="text-text-secondary" onClick={() => setAdding(true)}>
        <Plus className="size-3.5" />
        Agregar sección
      </Button>
    );
  }

  return (
    <Input
      autoFocus
      value={name}
      placeholder="Nombre de la sección"
      onChange={(event) => setName(event.target.value)}
      onBlur={() => {
        submit();
        setAdding(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          submit();
        }
        if (event.key === "Escape") {
          setName("");
          setAdding(false);
        }
      }}
      aria-label="Nombre de la nueva sección"
      className="h-8 max-w-64 text-sm"
    />
  );
}

/**
 * Secciones de un proyecto (bloque 6.8): crear, renombrar, reordenar,
 * colapsar y eliminar. Al eliminar, las tareas de la sección no se borran
 * (quedan sin sección, `ON DELETE SET NULL` — verificado en
 * `supabase/tests/sections.test.ts`); no hace falta reimplementar esa regla
 * acá, solo dispararla.
 */
export function SectionList({
  projectId,
  initialSections,
  taskListOptions,
  selectionOrderIds,
}: {
  projectId: string;
  initialSections: SectionRow[];
  /** Orden, filtros rápidos y mostrar completadas de la barra de opciones de vista (bloque 6.6), aplicados a la lista de tareas de cada sección. */
  taskListOptions?: SectionTaskListOptions;
  /** Selección múltiple (bloque 7.10-7.13, capacidad `seleccion-multiple`): orden visual combinado de "sin sección" + cada sección, calculado por `SectionedTasks`. */
  selectionOrderIds?: string[];
}) {
  const { data } = useSections(projectId, initialSections);
  const moveSection = useMoveSection(projectId);
  const sections = [...(data ?? [])].sort((a, b) => a.position - b.position);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIndex = sections.findIndex((s) => s.id === active.id);
    const overIndex = sections.findIndex((s) => s.id === over.id);
    if (activeIndex === -1 || overIndex === -1) return;

    const reordered = arrayMove(sections, activeIndex, overIndex);
    const newIndex = reordered.findIndex((s) => s.id === active.id);
    const others = sections.filter((s) => s.id !== active.id).map((s) => s.position);

    moveSection.mutate({ id: active.id as string, position: positionForIndex(others, newIndex) });
  }

  return (
    <div className="space-y-2">
      {sections.length > 0 && (
        // `id` fijo: mismo hydration mismatch de `aria-describedby` que
        // `components/board/board.tsx` (bloque 7, diagnosticado en fase 4).
        <DndContext id="section-list-drag" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-5">
              {sections.map((section) => (
                <SectionItem
                  key={section.id}
                  section={section}
                  projectId={projectId}
                  allSections={sections}
                  taskListOptions={taskListOptions}
                  selectionOrderIds={selectionOrderIds}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <AddSectionRow projectId={projectId} />
    </div>
  );
}
