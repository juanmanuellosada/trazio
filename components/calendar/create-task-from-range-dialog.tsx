"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AppDialog } from "@/components/primitives/dialog";
import { TaskQuickAddRow } from "@/components/tasks/task-quick-add-row";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { useProjects } from "@/lib/projects/use-projects";
import { durationMinutesBetween, type DragResult } from "@/lib/calendar/drag";

/**
 * Alta de tarea desde un arrastre sobre espacio vacío del calendario
 * (`alta-de-tareas-en-contexto`, D-F): pasa a usar el componente compartido
 * en vez de su propia implementación —campo de título propio, selector
 * nativo de proyecto y dos mutaciones encadenadas para poner el horario—,
 * que violaba tanto "ningún alta tiene implementación propia" como "nunca un
 * selector nativo". El rango arrastrado entra como `defaultDueAt` +
 * `defaultDurationMinutes`, que `TaskQuickAddRow` ya sabe expresar en una
 * sola mutación (`useCreateTaskFromParse`) — sin el paso encadenado de
 * `useUpdateTask` que tenía esta implementación. El destino ya no es fijo:
 * con el selector de proyecto siempre visible (D-D), quien arrastra puede
 * cambiarlo sin salir del alta, así que el selector nativo que existía para
 * el caso "sin proyecto fijo" (Próximos) se va entero con el reemplazo.
 */
export function CreateTaskFromRangeDialog({
  open,
  onOpenChange,
  range,
  fixedProjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  range: DragResult;
  /** Proyecto de contexto (Bandeja/Proyecto); `null` en Próximos, que no tiene uno propio — la cadena de destino (D-B) sigue al proyecto por defecto de las preferencias y, si tampoco hay, a Bandeja de entrada. */
  fixedProjectId: string | null;
}) {
  const preferences = useUserPreferences();
  const { data: projects } = useProjects();
  const inboxProjectId = projects?.find((project) => project.is_inbox)?.id ?? null;
  const projectId = fixedProjectId ?? preferences.defaultProjectId ?? inboxProjectId;

  // Sin proyecto de contexto, ni por defecto, ni Bandeja resuelta todavía
  // (D27: no debería pasar en uso normal): nada que preseleccionar.
  if (!projectId) return null;

  const durationMinutes = durationMinutesBetween(range.start.toISOString(), range.end.toISOString());
  const rangeLabel = `${format(range.start, "EEEE d 'de' MMMM, HH:mm", { locale: es })}–${format(range.end, "HH:mm", { locale: es })}`;

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} title="Tarea nueva" description={rangeLabel} size="lg">
      <TaskQuickAddRow
        projectId={projectId}
        sectionId={null}
        parentId={null}
        defaultDueAt={range.start.toISOString()}
        defaultDurationMinutes={durationMinutes}
        variant="full"
        onCancel={() => onOpenChange(false)}
      />
    </AppDialog>
  );
}
