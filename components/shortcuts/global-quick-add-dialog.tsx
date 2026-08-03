"use client";

import { AppDialog } from "@/components/primitives/dialog";
import { TaskQuickAddRow } from "@/components/tasks/task-quick-add-row";
import { useComposeContext } from "@/components/tasks/compose-context";
import { useUserPreferences } from "@/components/providers/preferences-provider";

/**
 * Diálogo de alta rápida compartido por el botón "Agregar tarea" del panel
 * lateral (`SidebarAddTask`) y por el atajo global `Q` (`ShortcutProvider`):
 * antes eran **dos componentes con el mismo `AppDialog` + `TaskQuickAddRow`
 * copiados a mano** —uno de los dos lo admitía en un comentario— y los dos
 * mandaban siempre a la Bandeja de entrada, sin importar dónde estuviera
 * parado el usuario. Ahora es esta única instancia, montada una vez por
 * cada disparador, la que resuelve su propio destino (D-A/D-B de
 * `alta-de-tareas-en-contexto`): el contexto de la vista actual
 * (`useComposeContext`, publicado por la vista montada) gana sobre el
 * proyecto por defecto de las preferencias, que gana sobre la Bandeja de
 * entrada — los tres eslabones más débiles de la cadena de destino; el
 * selector explícito y el `#` del título, resueltos adentro de
 * `TaskQuickAddRow`, siguen ganándole a los dos.
 *
 * Este modal **nunca hereda sección**, solo proyecto (reporte del dueño,
 * 2026-08-03): parado en un proyecto con varias secciones y sin haber
 * tocado el selector, `Q` tiene que ofrecer el proyecto en su raíz. Elegir
 * una sección es una decisión explícita de quien crea la tarea, no algo
 * para heredar de dónde había quedado el foco del teclado — la sección no
 * tiene ruta propia, así que esa herencia terminaba resolviéndose por foco
 * de DOM (`components/projects/sectioned-tasks.tsx`), que queda pegado al
 * último control tocado mucho después de que el usuario dejó de estar
 * "parado" ahí en cualquier sentido útil. El alta embebida al pie de una
 * sección no tiene este problema: ese contexto sí es inequívoco, porque se
 * abrió con un clic dentro de esa sección — sigue recibiendo su sección por
 * props directas, sin pasar por acá.
 *
 * Abre plegado (D-C): `variant="full"` sin forzar ningún campo desplegado
 * más que título y destino — el propio componente resuelve ese plegado.
 */
export function GlobalQuickAddDialog({
  open,
  onOpenChange,
  inboxProjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Último eslabón de la cadena de destino (D-B): sin contexto de vista ni proyecto por defecto, cae acá. `null` solo si la Bandeja todavía no se resolvió (D27: no debería pasar en uso normal). */
  inboxProjectId: string | null;
}) {
  const viewContext = useComposeContext();
  const preferences = useUserPreferences();
  const projectId = viewContext.projectId ?? preferences.defaultProjectId ?? inboxProjectId;
  // Nunca hereda sección (ver el comentario de arriba): siempre el proyecto
  // en su raíz, sin importar qué sección haya publicado el contexto de vista.
  const sectionId = null;

  if (!projectId) return null;

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} title="Nueva tarea" size="lg">
      {/*
        `key` por `open` (D-C): fuerza una instancia nueva en cada apertura,
        para que el plegado (`fieldsExpanded`) arranque siempre en falso —
        "el modal global abre plegado" rige en cada apertura, no solo la
        primera vez que se monta el diálogo.
      */}
      <TaskQuickAddRow
        key={open ? "open" : "closed"}
        projectId={projectId}
        sectionId={sectionId}
        parentId={null}
        defaultDueDate={viewContext.defaultDueDate ?? undefined}
        variant="full"
        onCancel={() => onOpenChange(false)}
      />
    </AppDialog>
  );
}
