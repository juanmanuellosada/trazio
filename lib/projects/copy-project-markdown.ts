"use client";

import type { QueryClient } from "@tanstack/react-query";
import { copyTextLazily } from "@/lib/clipboard/copy-text";
import { projectToMarkdown } from "@/lib/projects/project-to-markdown";
import { taskDescriptionsQueryOptions } from "@/lib/projects/task-descriptions";
import type { ProjectRow } from "@/lib/projects/use-projects";
import { sectionsQueryKey, fetchSections } from "@/lib/sections/use-sections";
import { tasksQueryKey, fetchTasks } from "@/lib/tasks/use-tasks";
import { toastError, toastSuccess } from "@/lib/toast";

/**
 * Precalienta las descripciones de las tareas al abrir el menú "…" del
 * proyecto (design.md, D-D): defensa en profundidad para que la consulta ya
 * esté en caché cuando se hace clic en "Copiar como markdown". No reemplaza
 * el `Promise<Blob>` diferido de `copyTextLazily` — sin conexión, o con el
 * prefetch todavía en vuelo, la consulta sigue haciendo falta ahí. Nunca
 * lanza: `prefetchQuery` ya traga sus propios errores.
 */
export function prefetchProjectMarkdownSources(queryClient: QueryClient, projectId: string): void {
  void queryClient.prefetchQuery(taskDescriptionsQueryOptions(projectId));
}

/**
 * Serializa el proyecto a markdown y lo deja en el portapapeles (bloque 4
 * del cableado, `openspec/changes/copiar-un-proyecto-como-markdown/`). Usa
 * `ensureQueryData` para tareas y secciones porque
 * `app/(app)/proyecto/[id]/page.tsx` ya siembra esas dos consultas: en la
 * práctica solo las descripciones (D-E) van a la red. No lanza: cada
 * resultado de `copyTextLazily` termina en un `toastError` o un
 * `toastSuccess`.
 */
export async function copyProjectMarkdown(queryClient: QueryClient, project: ProjectRow): Promise<void> {
  const result = await copyTextLazily(async () => {
    const [tasks, sections, descriptions] = await Promise.all([
      queryClient.ensureQueryData({ queryKey: tasksQueryKey(project.id), queryFn: () => fetchTasks(project.id) }),
      queryClient.ensureQueryData({ queryKey: sectionsQueryKey(project.id), queryFn: () => fetchSections(project.id) }),
      queryClient.fetchQuery(taskDescriptionsQueryOptions(project.id)),
    ]);
    return projectToMarkdown({ project, sections, tasks, descriptions });
  });

  if (result === "ok") {
    toastSuccess("Proyecto copiado como markdown.");
  } else if (result === "source-failed") {
    toastError("No pudimos copiar el proyecto", "no se pudieron traer las descripciones de las tareas", "Revisá tu conexión y volvé a intentar.");
  } else {
    toastError("No pudimos usar el portapapeles", "el navegador no dio acceso a él", "Revisá los permisos del sitio y volvé a intentar.");
  }
}
