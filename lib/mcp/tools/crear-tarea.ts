import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, TablesInsert } from "@/lib/supabase/database.types";
import { colorForLabelName } from "@/lib/labels/color-for-name";
import { parse } from "@/lib/parser/parse";
import { projectPath } from "@/lib/parser/project-path";
import type { ParserContext } from "@/lib/parser/types";
import { DESCRIPTION_PARAM_DESCRIPTION, validateDescription } from "./description";
import { toMcpTaskItem, type McpLabel, type McpTaskItem, type RawTaskRow } from "./shared";

/** Mismo default que `lib/preferences/get-user-preferences.ts` para el caso sin fila todavía (no debería pasar tras el aprovisionamiento). */
const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";
const DEFAULT_WEEK_STARTS_ON: 0 | 1 | 6 = 1;

export const crearTareaInputSchema = z.object({
  texto: z
    .string()
    .describe(
      "Texto en lenguaje natural para la tarea, el mismo formato que reconoce el alta rápida de la app: " +
        'fecha y hora ("mañana a las 10"), duración, prioridad ("p1" a "p4"), etiquetas (@etiqueta — la ' +
        "crea si no existe) y proyecto (#proyecto o #proyecto/sección — nunca crea el proyecto; si no " +
        "existe todavía, usar project_id en su lugar). Lo reconocido se quita del título final.",
    ),
  project_id: z
    .string()
    .optional()
    .describe(
      "Proyecto destino si el texto no lo indica con #proyecto (que tiene prioridad sobre esto). Sin " +
        "ninguno de los dos, la tarea va a la Bandeja de entrada.",
    ),
  section_id: z
    .string()
    .optional()
    .describe("Sección destino dentro del proyecto, si el texto no la indica con #proyecto/sección."),
  parent_id: z.string().optional().describe("Id de una tarea existente: crea esta como su subtarea."),
  description: z.unknown().optional().describe(DESCRIPTION_PARAM_DESCRIPTION),
});
export type CrearTareaInput = z.infer<typeof crearTareaInputSchema>;

export type CrearTareaResult = { ok: true; task: McpTaskItem } | { ok: false; error: string };

type ProjectContextRow = { id: string; name: string; parent_id: string | null; icon: string | null; is_inbox: boolean; is_archived: boolean };
type SectionContextRow = { id: string; project_id: string; name: string };
type LabelContextRow = { id: string; name: string; color: string };

const TASK_COLUMNS_NO_LABELS =
  "id, project_id, section_id, parent_id, title, description, priority, due_date, due_at, duration_minutes, deadline, completed_at, position";

/**
 * `crear_tarea` (spec `mcp`): única herramienta de escritura que recibe
 * lenguaje natural — pasa `texto` por el mismo parser puro del alta rápida
 * de la app (`lib/parser/parse.ts`), con el mismo contexto que
 * `use-parser-context.ts` arma para el cliente (proyectos con su ruta de
 * ancestros, secciones, etiquetas) pero leído acá directo de Supabase, no
 * de un caché de TanStack Query. `project_id`/`section_id`/`parent_id` son
 * el contexto estructurado para lo que el texto no exprese; si el texto sí
 * reconoce un `#proyecto`, gana sobre esos tres — mismo orden de prioridad
 * que `mergeDestination` en `task-quick-add-row.tsx`. Sin ninguno de los
 * dos, la tarea va a la Bandeja de entrada (`is_inbox`).
 *
 * `position` nunca se manda (D-F de `design.md`): el trigger
 * `tasks_default_position` de la Ola 2 la completa.
 *
 * `description`, si viene, pasa por `validateDescription` (7.1, D-E caso 2):
 * un string se guarda tal cual, sin partir por saltos de línea — la app
 * spec (`specs/mcp/spec.md`) fija ese comportamiento como requirement, no
 * queda como decisión abierta: "un string SHALL guardarse tal cual, sin
 * conversión". Partir por saltos de línea sería un cambio de comportamiento
 * respecto del alta rápida de la app (que tampoco lo hace) y no lo pide el
 * spec, así que no se implementa acá.
 */
export async function crearTarea(
  supabase: SupabaseClient<Database>,
  input: CrearTareaInput,
  now: Date = new Date(),
): Promise<CrearTareaResult> {
  let description: Json | null = null;
  if (input.description !== undefined) {
    const validated = validateDescription(input.description);
    if (!validated.ok) return { ok: false, error: validated.error };
    description = validated.value;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return { ok: false, error: "No se pudo identificar al usuario del token." };
  const userId = userData.user.id;

  const [prefRes, projectsRes, sectionsRes, labelsRes] = await Promise.all([
    supabase.from("user_preferences").select("timezone, week_starts_on").maybeSingle(),
    supabase.from("projects").select("id, name, parent_id, icon, is_inbox, is_archived"),
    supabase.from("sections").select("id, project_id, name"),
    supabase.from("labels").select("id, name, color"),
  ]);
  if (projectsRes.error) throw projectsRes.error;
  if (sectionsRes.error) throw sectionsRes.error;
  if (labelsRes.error) throw labelsRes.error;

  const prefRow = prefRes.data as { timezone: string; week_starts_on: number } | null;
  const timezone = prefRow?.timezone ?? DEFAULT_TIMEZONE;
  const weekStartsOn = ((): 0 | 1 | 6 => {
    const value = prefRow?.week_starts_on;
    return value === 0 || value === 1 || value === 6 ? value : DEFAULT_WEEK_STARTS_ON;
  })();

  const projects = (projectsRes.data ?? []) as ProjectContextRow[];
  const sections = (sectionsRes.data ?? []) as SectionContextRow[];
  const labels = (labelsRes.data ?? []) as LabelContextRow[];

  const parserContext: ParserContext = {
    ahora: now,
    zonaHoraria: timezone,
    semanaEmpiezaEn: weekStartsOn,
    proyectos: projects
      .filter((p) => !p.is_archived)
      .map((p) => ({
        id: p.id,
        name: p.name,
        path: projectPath(projects, p),
        icon: p.icon,
        sections: sections.filter((s) => s.project_id === p.id).map((s) => ({ id: s.id, name: s.name })),
      })),
    etiquetas: labels.map((l) => ({ id: l.id, name: l.name })),
  };

  const parsed = parse(input.texto, parserContext);

  // Resuelve las etiquetas reconocidas: `@etiqueta` crea la que no existe (id null), nunca crea el proyecto de `#`.
  const resolvedLabels: McpLabel[] = [];
  for (const label of parsed.labels) {
    if (label.id) {
      const existing = labels.find((l) => l.id === label.id);
      if (existing) resolvedLabels.push(existing);
      continue;
    }
    const { data: created, error: createLabelError } = await supabase
      .from("labels")
      .insert({ user_id: userId, name: label.name, color: colorForLabelName(label.name) })
      .select("id, name, color")
      .single();
    if (createLabelError) throw createLabelError;
    resolvedLabels.push(created);
  }

  let projectId: string;
  let sectionId: string | null;
  if (parsed.project) {
    projectId = parsed.project.id;
    sectionId = parsed.project.section?.id ?? null;
  } else if (input.project_id) {
    projectId = input.project_id;
    sectionId = input.section_id ?? null;
  } else {
    const inbox = projects.find((p) => p.is_inbox);
    if (!inbox) return { ok: false, error: "No se encontró la Bandeja de entrada de la cuenta." };
    projectId = inbox.id;
    sectionId = null;
  }

  const payload: Omit<TablesInsert<"tasks">, "position"> = {
    user_id: userId,
    project_id: projectId,
    section_id: sectionId,
    parent_id: input.parent_id ?? null,
    title: parsed.title,
    description,
    due_date: parsed.dueDate,
    due_at: parsed.dueAt,
    duration_minutes: parsed.durationMinutes,
    priority: parsed.priority ?? undefined, // sin reconocer: deja el default de la columna (4)
    recurrence_rule: parsed.recurrenceRule,
  };

  const { data: taskRow, error: insertError } = await supabase
    .from("tasks")
    .insert(payload as TablesInsert<"tasks">)
    .select(TASK_COLUMNS_NO_LABELS)
    .single();
  if (insertError) throw insertError;

  if (resolvedLabels.length > 0) {
    const { error: taskLabelsError } = await supabase
      .from("task_labels")
      .insert(resolvedLabels.map((l) => ({ task_id: taskRow.id, label_id: l.id, user_id: userId })));
    if (taskLabelsError) throw taskLabelsError;
  }

  const row = { ...taskRow, task_labels: resolvedLabels.map((l) => ({ labels: l })) } as unknown as RawTaskRow;
  return { ok: true, task: toMcpTaskItem(row) };
}
