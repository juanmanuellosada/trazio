"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateSelect, type DateSelectValue } from "@/components/selectors/date-select";
import { DeadlineSelect } from "@/components/selectors/deadline-select";
import { PrioritySelect } from "@/components/selectors/priority-select";
import { applyDisabledMatches, matchKey } from "@/lib/parser/apply-disabled";
import { useCreateTaskFromParse } from "@/lib/parser/create-task-from-parse";
import { parse } from "@/lib/parser/parse";
import type { ParseMatch, ParsedProject, ParseResult, ParserContext } from "@/lib/parser/types";
import { useParserContext } from "@/lib/parser/use-parser-context";
import type { Json } from "@/lib/supabase/database.types";
import { DEFAULT_TASK_PRIORITY } from "@/lib/validation/tasks";
import { cn } from "@/lib/utils";
import { TaskDestinationSelect, type TaskDestination } from "./task-destination-select";

const DEBOUNCE_MS = 120;

/**
 * Descripción del alta a documento de Tiptap (bloque 5.2): el campo de acá
 * es texto plano corto, no el editor enriquecido del detalle (bloque 7, que
 * todavía no existe con sus extensiones y su propio menú) — traerlo entero a
 * cada instancia del alta (una por sección, potencialmente varias montadas a
 * la vez) sería peso de más para un campo secundario, y arrastraría el
 * `window.prompt` de enlaces que ese bloque todavía tiene pendiente de
 * reemplazar. El documento que produce es compatible con `TaskDescriptionEditor`:
 * se puede seguir editando con formato desde el detalle sin migración.
 */
function descriptionDoc(text: string): Json | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return {
    type: "doc",
    content: trimmed.split("\n").map((line) =>
      line ? { type: "paragraph", content: [{ type: "text", text: line }] } : { type: "paragraph" },
    ),
  };
}

/**
 * Combina lo que reconoció el parser con lo que la persona haya elegido a
 * mano en cada selector (bloque 5.3): **el selector explícito siempre gana**
 * sobre el título — ver el comentario junto a `dateOverride` más abajo para
 * el motivo. Estas tres funciones son esa misma regla aplicada a fecha,
 * prioridad y destino; la fecha límite no la toca el parser, así que no
 * necesita una.
 */
function mergeDate(
  parsed: Pick<ParseResult, "dueDate" | "dueAt" | "durationMinutes"> | null,
  override: DateSelectValue | undefined,
  fallbackDueDate: string | null,
): DateSelectValue {
  if (override) return override;
  if (!parsed) return { dueDate: fallbackDueDate, dueAt: null, durationMinutes: null };
  return {
    dueDate: parsed.dueAt ? null : (parsed.dueDate ?? fallbackDueDate),
    dueAt: parsed.dueAt,
    durationMinutes: parsed.durationMinutes,
  };
}

function mergePriority(parsedPriority: number | null | undefined, override: number | undefined): number {
  return override ?? parsedPriority ?? DEFAULT_TASK_PRIORITY;
}

function mergeDestination(
  parsedProject: ParsedProject | null | undefined,
  override: TaskDestination | undefined,
  projectId: string,
  sectionId: string | null,
): TaskDestination {
  if (override) return override;
  if (parsedProject) return { projectId: parsedProject.id, sectionId: parsedProject.section?.id ?? null };
  return { projectId, sectionId };
}

/**
 * Alta de una tarea o subtarea (bloque 5): título con reconocimiento de
 * lenguaje natural en vivo (resaltado + doble clic para desactivar, R7, sin
 * tocar), más descripción y accesos a fecha, prioridad, fecha límite y
 * proyecto destino. Un solo componente, montado igual en Bandeja de
 * entrada, Hoy, Proyecto, dentro de cada sección y al crear una subtarea
 * (bloque 5.8-5.10) — lo que cambia entre superficies es únicamente el
 * contexto (`projectId`/`sectionId`/`parentId`/`defaultDueDate`), nunca la
 * implementación.
 */
export function TaskQuickAddRow({
  projectId,
  sectionId,
  parentId,
  indent,
  defaultDueDate,
  defaultExpanded,
}: {
  projectId: string;
  sectionId: string | null;
  parentId: string | null;
  indent?: boolean;
  /** Fecha (`yyyy-MM-dd`) precargada cuando el parser no reconoció ninguna (bloque 8.2: el alta rápida de Hoy). */
  defaultDueDate?: string;
  /** Arranca ya desplegado en vez de mostrar primero el botón "Agregar tarea" (bloque 10.2: el diálogo del panel lateral no necesita ese clic extra, porque abrirlo ya es la acción de "quiero agregar una tarea"). Sin efecto sobre las demás superficies, que no la pasan y siguen arrancando colapsadas. */
  defaultExpanded?: boolean;
}) {
  const [adding, setAdding] = useState(defaultExpanded ?? false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [disabledMatches, setDisabledMatches] = useState<Set<string>>(new Set());
  // Guarda contra qué texto se calculó el último resultado del parser: si
  // el usuario siguió escribiendo desde entonces, todavía no hay un
  // resultado "al día" con ese texto y no se resalta nada (en vez de
  // arriesgar rangos calculados sobre una versión vieja del texto).
  const [debounced, setDebounced] = useState<{ text: string; result: ParseResult } | null>(null);

  /**
   * `undefined` = la persona todavía no tocó ese selector: sigue lo que
   * reconozca el parser en el título, igual que antes de que existieran
   * estos selectores. Cualquier interacción —incluso una que lo deje
   * "vacío" (por ejemplo "Quitar fecha")— saca al selector de `undefined` y
   * pasa a ganarle al título desde ese momento, sin importar qué se siga
   * escribiendo ahí: el selector es una elección visible y a propósito;
   * dejar que el texto libre la pisara en silencio con solo agregar una
   * palabra sería impredecible. Se reinicia a `undefined` en cada alta
   * confirmada (bloque 5.5), así que no queda pegado de una tarea a la
   * siguiente.
   */
  const [dateOverride, setDateOverride] = useState<DateSelectValue | undefined>(undefined);
  const [priorityOverride, setPriorityOverride] = useState<number | undefined>(undefined);
  const [deadlineOverride, setDeadlineOverride] = useState<string | null | undefined>(undefined);
  const [destinationOverride, setDestinationOverride] = useState<TaskDestination | undefined>(undefined);

  const titleInputRef = useRef<HTMLInputElement>(null);

  const preferences = useUserPreferences();
  const { proyectos, etiquetas } = useParserContext();
  const createTask = useCreateTaskFromParse();

  const parserContext = useMemo(
    (): Omit<ParserContext, "ahora"> => ({
      zonaHoraria: preferences.timezone,
      semanaEmpiezaEn: preferences.weekStartsOn,
      proyectos,
      etiquetas,
    }),
    [preferences.timezone, preferences.weekStartsOn, proyectos, etiquetas],
  );

  useEffect(() => {
    if (!adding) return;
    const timer = setTimeout(() => {
      const resultado = parse(title, { ahora: new Date(), ...parserContext });
      setDebounced({ text: title, result: resultado });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [title, adding, parserContext]);

  // Interpretación vigente del título: el resultado del parser ya con los
  // matches desactivados por doble clic aplicados (R7). Única fuente tanto
  // del resaltado como de la vista previa que ven los selectores mientras
  // no tienen override.
  const preview = useMemo(() => {
    if (!debounced || debounced.text !== title) return null;
    return applyDisabledMatches(title, debounced.result, disabledMatches);
  }, [debounced, title, disabledMatches]);

  const segments = useMemo(() => buildSegments(title, preview?.matches ?? []), [title, preview]);

  const previewDate = mergeDate(preview, dateOverride, defaultDueDate ?? null);
  const previewPriority = mergePriority(preview?.priority, priorityOverride);
  const previewDeadline = deadlineOverride !== undefined ? deadlineOverride : null; // el parser no reconoce fecha límite
  const previewDestination = mergeDestination(preview?.project, destinationOverride, projectId, sectionId);

  function resetComposer() {
    setTitle("");
    setDescription("");
    setDisabledMatches(new Set());
    setDebounced(null);
    setDateOverride(undefined);
    setPriorityOverride(undefined);
    setDeadlineOverride(undefined);
    setDestinationOverride(undefined);
  }

  function cancel() {
    resetComposer();
    setAdding(false);
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      cancel();
      return;
    }
    const fresh = parse(trimmed, { ahora: new Date(), ...parserContext });
    const final = applyDisabledMatches(trimmed, fresh, disabledMatches);
    const finalTitle = final.title || trimmed; // nunca crear con título vacío (bloque 9.20)

    const date = mergeDate(final, dateOverride, defaultDueDate ?? null);
    const priority = mergePriority(final.priority, priorityOverride);
    const deadline = deadlineOverride !== undefined ? deadlineOverride : null;
    const destination = mergeDestination(final.project, destinationOverride, projectId, sectionId);

    createTask.mutate(
      {
        title: finalTitle,
        projectId: destination.projectId,
        sectionId: destination.sectionId,
        parentId,
        description: descriptionDoc(description),
        deadline,
        result: { ...final, dueDate: date.dueDate, dueAt: date.dueAt, durationMinutes: date.durationMinutes, priority },
      },
      {
        onSuccess: () => {
          // Foco de vuelta en el título (bloque 5, "cargar varias tareas
          // seguidas sin tocar el mouse"): el composer queda abierto y
          // vacío, listo para escribir la próxima sin usar el mouse.
          resetComposer();
          titleInputRef.current?.focus();
        },
      },
    );
  }

  function toggleDisabled(match: ParseMatch) {
    setDisabledMatches((prev) => new Set(prev).add(matchKey(match)));
  }

  if (!adding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("justify-start text-text-secondary", indent && "ml-6")}
        onClick={() => setAdding(true)}
      >
        <Plus className="size-3.5" />
        {parentId ? "Agregar subtarea" : "Agregar tarea"}
      </Button>
    );
  }

  return (
    <div
      className={cn("max-w-xl space-y-2 rounded-lg border border-border bg-surface p-2.5", indent && "ml-6")}
      onKeyDown={(event) => {
        if (event.key === "Escape") cancel();
      }}
    >
      <div className="relative">
        {/*
          Capa de resaltado: el texto que de verdad se ve. `aria-hidden`
          porque el `<input>` de abajo ya expone el mismo texto de forma
          accesible. `pointer-events-none` en el contenedor deja pasar los
          clics al `<input>` (para mover el cursor con el mouse); cada
          `<mark>` reactiva `pointer-events` solo para su propio doble clic
          (R7). Ningún span lleva padding/margen: cualquier ancho de más
          correría el texto resaltado respecto del cursor real del
          `<input>`, que se mueve según su propio texto (invisible).
        */}
        <div
          aria-hidden
          className="text-foreground pointer-events-none absolute inset-0 z-10 flex items-center overflow-hidden rounded-lg border border-transparent px-2.5 py-1 text-sm whitespace-pre"
        >
          {segments.map((segment, index) =>
            segment.match ? (
              <mark
                key={index}
                className="text-primary bg-primary/15 pointer-events-auto cursor-pointer rounded-[3px]"
                title="Doble clic para no usarlo como dato"
                onDoubleClick={() => toggleDisabled(segment.match!)}
              >
                {segment.text}
              </mark>
            ) : (
              <span key={index}>{segment.text}</span>
            ),
          )}
        </div>
        <Input
          ref={titleInputRef}
          autoFocus
          value={title}
          placeholder="Título de la tarea"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          aria-label={parentId ? "Título de la nueva subtarea" : "Título de la nueva tarea"}
          className="caret-foreground h-8 w-full text-sm text-transparent selection:bg-transparent"
        />
      </div>

      <Textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Descripción (opcional)"
        aria-label={parentId ? "Descripción de la nueva subtarea" : "Descripción de la nueva tarea"}
        rows={2}
        className="min-h-0 resize-none text-sm"
      />

      {/*
        Lugar reservado para recordatorios y etiquetas (bloque 5.6): fase 2.
        Ningún control acá todavía, ni siquiera deshabilitado — sumarlos más
        adelante es agregar un chip a esta misma fila, no rehacer el
        composer.
      */}
      <div className="flex flex-wrap items-center gap-1.5">
        <DateSelect value={previewDate} onChange={setDateOverride} preferences={preferences} />
        <DeadlineSelect value={previewDeadline} onChange={setDeadlineOverride} preferences={preferences} />
        <PrioritySelect value={previewPriority} onChange={setPriorityOverride} />
        {/*
          Sin selector de proyecto al crear una subtarea: el proyecto de una
          subtarea es el de su tarea padre, ya fijado por quien abrió este
          composer (bloque 5.10) — no es una elección de esta pantalla, y la
          fila ya aparece anidada bajo esa tarea.
        */}
        {!parentId && (
          <TaskDestinationSelect value={previewDestination} onChange={setDestinationOverride} proyectos={proyectos} />
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-0.5">
        <Button type="button" variant="ghost" size="sm" onClick={cancel}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={createTask.isPending}>
          {parentId ? "Agregar subtarea" : "Agregar tarea"}
        </Button>
      </div>
    </div>
  );
}

function buildSegments(text: string, matches: ParseMatch[]) {
  const segments: { text: string; match: ParseMatch | null }[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) segments.push({ text: text.slice(cursor, match.start), match: null });
    segments.push({ text: text.slice(match.start, match.end), match });
    cursor = match.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: null });
  return segments;
}
