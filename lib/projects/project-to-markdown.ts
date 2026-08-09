import type { Json } from "@/lib/supabase/database.types";
import { topLevelTasksForSection, type TaskNode } from "@/lib/public-project/build-tree";
import { tiptapDocToMarkdown } from "@/lib/markdown/tiptap-to-markdown";
import { escapeInline, indentLines } from "@/lib/markdown/text";
import { formatSharedDate } from "@/lib/public-project/format-date";
import { priorityLabel, DEFAULT_TASK_PRIORITY } from "@/lib/validation/tasks";
import { formatDuration } from "@/lib/landing/format-parse-result";
import type { TaskRow } from "@/lib/tasks/task-columns";
import type { SectionRow } from "@/lib/sections/use-sections";
import type { ProjectRow } from "@/lib/projects/use-projects";

/**
 * Serializa un proyecto entero (feature "copiar un proyecto como markdown",
 * `openspec/changes/copiar-un-proyecto-como-markdown/`) a un único
 * documento markdown: tareas sin sección primero, después cada sección por
 * `position`, subtareas anidadas por `position`. Es la estructura
 * *canónica* del proyecto, nunca la de la vista que el usuario tenga puesta
 * encima — no mira filtros rápidos, agrupador ni el orden de la barra de
 * opciones de vista (design.md, "What Changes"), porque lo que se copia es
 * el dato, no la pantalla.
 *
 * Reutiliza `topLevelTasksForSection` (`lib/public-project/build-tree.ts`,
 * ya generalizada para `TaskRow`) para anidar por `parent_id`, y
 * `tiptapDocToMarkdown` (`lib/markdown/tiptap-to-markdown.ts`) para las
 * descripciones. Este módulo solo decide el layout de documento: líneas de
 * ítem, metadatos en línea, e indentación del cuerpo.
 */

export type ProjectMarkdownInput = {
  project: Pick<ProjectRow, "name" | "description">;
  sections: SectionRow[];
  tasks: TaskRow[];
  /** jsonb de descripción por `task.id`, para las tareas que la tienen cargada. */
  descriptions: Record<string, Json | null>;
};

/** Acumulador mutable del ordinal de nota al pie por tarea, en orden de emisión (D-F del design). */
type FootnoteCounter = { value: number };

function nextFootnotePrefix(counter: FootnoteCounter): string {
  counter.value += 1;
  return String(counter.value);
}

/** Metadatos en el orden fijo de D-A: fecha, prioridad, duración, etiquetas — solo los presentes, unidos por " · ". */
function taskMetaLine(task: TaskRow): string {
  const parts: string[] = [];

  const dueValue = task.due_date ?? task.due_at;
  if (dueValue) parts.push(`vence: ${formatSharedDate(dueValue)}`);

  if (task.priority !== DEFAULT_TASK_PRIORITY) parts.push(`prioridad: ${priorityLabel(task.priority)}`);

  if (task.duration_minutes != null) parts.push(`duración: ${formatDuration(task.duration_minutes)}`);

  if (task.labels.length > 0) parts.push(`etiquetas: ${task.labels.map((l) => escapeInline(l.name)).join(", ")}`);

  return parts.length > 0 ? ` — ${parts.join(" · ")}` : "";
}

type RenderedTask = { text: string; hadBody: boolean };

/**
 * Un ítem de tarea completo: la línea del checkbox con sus metadatos, y
 * debajo (si hay algo que mostrar) la descripción y/o la lista de
 * subtareas. La indentación de 2 espacios por nivel sale sola, sin llevar
 * la cuenta de la profundidad: cada llamada indenta el bloque del hijo
 * exactamente un nivel (`indentLines(block, "  ")`), y como ese bloque ya
 * trae embebida la indentación de sus propios nietos, la composición
 * recursiva acumula 2 espacios por cada nivel de anidamiento real.
 * `hadBody` es lo que usa `renderTaskList` para decidir si hace falta la
 * línea en blanco antes del ítem siguiente (regla 3 del design: sin ella,
 * ese ítem se lee como continuación del párrafo indentado del anterior).
 */
function renderTaskNode(node: TaskNode<TaskRow>, descriptions: Record<string, Json | null>, counter: FootnoteCounter): RenderedTask {
  const checkbox = node.completed_at ? "- [x] " : "- [ ] ";
  const title = escapeInline(node.title.replace(/\r\n|\r|\n/g, " "));
  const line = checkbox + title + taskMetaLine(node);

  const footnotePrefix = nextFootnotePrefix(counter);
  const description = tiptapDocToMarkdown(descriptions[node.id] ?? null, { headingOffset: 2, footnotePrefix });

  const bodyBlocks: string[] = [];
  if (description !== "") bodyBlocks.push(description);
  if (node.subtasks.length > 0) bodyBlocks.push(renderTaskList(node.subtasks, descriptions, counter));

  if (bodyBlocks.length === 0) return { text: line, hadBody: false };

  const body = bodyBlocks.map((block) => indentLines(block, "  ")).join("\n\n");
  // Blank line antes del primer bloque de cuerpo, salvo un caso: cuando ese
  // primer (y único) bloque es la lista de subtareas, sin descripción. Una
  // lista interrumpe un párrafo en CommonMark sin necesitar línea en
  // blanco (a diferencia de dos párrafos consecutivos, que sin ella se
  // funden en uno solo) — por eso acá alcanza con un salto simple.
  const separatorBeforeBody = description !== "" ? "\n\n" : "\n";
  return { text: `${line}${separatorBeforeBody}${body}`, hadBody: true };
}

/** Lista de ítems hermanos: compacta entre ítems sin cuerpo, con línea en blanco antes de cualquier ítem que siga a uno que sí tuvo cuerpo (reglas 3 y 4). */
function renderTaskList(nodes: TaskNode<TaskRow>[], descriptions: Record<string, Json | null>, counter: FootnoteCounter): string {
  const rendered = nodes.map((node) => renderTaskNode(node, descriptions, counter));
  return rendered.reduce((out, current, index) => {
    const separator = index === 0 ? "" : rendered[index - 1].hadBody ? "\n\n" : "\n";
    return out + separator + current.text;
  }, "");
}

export function projectToMarkdown(input: ProjectMarkdownInput): string {
  const { project, sections, descriptions } = input;
  // `topLevelTasksForSection` preserva el orden que recibe, nunca reordena
  // (ver su propio comentario) — el caché de TanStack puede traer una
  // inserción optimista al final del array con una `position` intermedia,
  // así que ordenar acá, antes de armar el árbol, es la única garantía de
  // que la salida respete `position` en cada nivel.
  const tasks = [...input.tasks].sort((a, b) => a.position - b.position);
  const sortedSections = [...sections].sort((a, b) => a.position - b.position);

  const counter: FootnoteCounter = { value: 0 };
  const blocks: string[] = [`# ${escapeInline(project.name)}`];

  if (project.description) blocks.push(escapeInline(project.description));

  const unsectioned = topLevelTasksForSection(tasks, null);
  if (unsectioned.length > 0) blocks.push(renderTaskList(unsectioned, descriptions, counter));

  for (const section of sortedSections) {
    blocks.push(`## ${escapeInline(section.name)}`);
    if (section.description) blocks.push(escapeInline(section.description));

    const sectionTasks = topLevelTasksForSection(tasks, section.id);
    if (sectionTasks.length > 0) blocks.push(renderTaskList(sectionTasks, descriptions, counter));
  }

  return blocks.join("\n\n") + "\n";
}
