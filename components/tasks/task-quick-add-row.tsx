"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateSelect, type DateSelectValue } from "@/components/selectors/date-select";
import { DeadlineSelect } from "@/components/selectors/deadline-select";
import { PrioritySelect } from "@/components/selectors/priority-select";
import { ReminderPicker } from "@/components/reminders/reminder-picker";
import { applyDisabledMatches, matchKey } from "@/lib/parser/apply-disabled";
import { useCreateTaskFromParse } from "@/lib/parser/create-task-from-parse";
import { buildLabelMenuOptions, buildProjectMenuOptions, type ParserMenuOption } from "@/lib/parser/menu-options";
import { findMenuTrigger, type MenuTrigger } from "@/lib/parser/menu-trigger";
import { parse } from "@/lib/parser/parse";
import type { ParsedLabel, ParseMatch, ParsedProject, ParseResult, ParserContext } from "@/lib/parser/types";
import { useParserContext } from "@/lib/parser/use-parser-context";
import type { DraftReminder } from "@/lib/reminders/use-reminders";
import type { Json } from "@/lib/supabase/database.types";
import type { LabelChip } from "@/lib/tasks/use-tasks";
import { DEFAULT_TASK_PRIORITY } from "@/lib/validation/tasks";
import { cn } from "@/lib/utils";
import { LabelPicker } from "./label-picker";
import { ParserMenu } from "./parser-menu";
import { TaskDestinationSelect, type TaskDestination } from "./task-destination-select";

const DEBOUNCE_MS = 120;

/** Mismo texto de etiqueta que usa el detalle de tarea (`task-detail-content.tsx`) sobre cada selector, para que el tratamiento completo se sienta el mismo lenguaje visual (bloque 7.2). */
const FIELD_LABEL_CLASS = "text-xs font-medium text-text-secondary";

/**
 * En el tratamiento `compact` (incrustado en una lista, sección o subtarea)
 * cada acceso es un chip autoexplicativo, sin etiqueta encima — como ya
 * funcionaba. En `full` (el modal completo del panel lateral, bloque 7.2)
 * suma la misma etiqueta chiquita que usa el selector de fecha/prioridad del
 * detalle de tarea, para que las dos superficies del alta hablen el mismo
 * idioma visual que el detalle. Función de módulo, no un componente definido
 * adentro de `TaskQuickAddRow`: si viviera adentro, cada tecla del título
 * generaría una identidad de componente nueva y React remontaría los
 * selectores (perdiendo popovers abiertos) en cada render.
 */
function AttributeField({ variant, label, children }: { variant: "compact" | "full"; label: string; children: ReactNode }) {
  if (variant !== "full") return <>{children}</>;
  return (
    <div className="space-y-1">
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      {children}
    </div>
  );
}

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
 * el motivo. Estas funciones son esa misma regla aplicada a fecha, prioridad,
 * etiquetas y destino; la fecha límite no la toca el parser, así que no
 * necesita una.
 *
 * `fallback` de `mergeDate` es el contexto de fecha/hora de quien montó el
 * composer (bloque `alta-de-tareas-en-contexto`, D-F): antes solo podía ser
 * un día (`defaultDueDate`, Hoy/Próximos); ahora también puede traer hora y
 * duración (el rango arrastrado del calendario). El parser sigue ganándole
 * al contexto — igual que ya le ganaba a `defaultDueDate` — y el selector
 * explícito sigue ganándole a los dos.
 */
function mergeDate(
  parsed: Pick<ParseResult, "dueDate" | "dueAt" | "durationMinutes"> | null,
  override: DateSelectValue | undefined,
  fallback: DateSelectValue,
): DateSelectValue {
  if (override) return override;
  if (!parsed) return fallback;
  if (parsed.dueAt) {
    return { dueDate: null, dueAt: parsed.dueAt, durationMinutes: parsed.durationMinutes ?? fallback.durationMinutes };
  }
  if (parsed.dueDate) {
    return { dueDate: parsed.dueDate, dueAt: null, durationMinutes: parsed.durationMinutes ?? fallback.durationMinutes };
  }
  return fallback;
}

function mergePriority(parsedPriority: number | null | undefined, override: number | undefined): number {
  return override ?? parsedPriority ?? DEFAULT_TASK_PRIORITY;
}

/** Mismo criterio que el resto de los atributos (bloque `alta-de-tareas-en-contexto`, D-E): lo elegido en `LabelPicker` reemplaza por completo a lo que detectó el `@` del parser, en vez de sumarse. */
function mergeLabels(parsedLabels: ParsedLabel[], override: LabelChip[] | undefined): ParsedLabel[] {
  if (override) return override.map((label) => ({ id: label.id, name: label.name }));
  return parsedLabels;
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
 * Alta de una tarea o subtarea (bloque 5, con las dos superficies del bloque
 * 7 y el contexto heredado de `alta-de-tareas-en-contexto`): título con
 * reconocimiento de lenguaje natural en vivo (resaltado + doble clic para
 * desactivar, R7, sin tocar), destino, descripción y accesos a fecha,
 * prioridad, fecha límite, etiquetas y recordatorios. Un solo componente,
 * montado igual en Bandeja de entrada, Hoy, Proyecto, dentro de cada
 * sección, al crear una subtarea, al arrastrar sobre el calendario y en los
 * dos diálogos globales — lo que cambia entre superficies es el contexto
 * (`projectId`/`sectionId`/`parentId`/`defaultDueDate`/`defaultDueAt`) y la
 * variante (`variant`), nunca la implementación (E2 del design).
 */
export function TaskQuickAddRow({
  projectId,
  sectionId,
  parentId,
  indent,
  defaultDueDate,
  defaultDueAt,
  defaultDurationMinutes,
  variant = "compact",
  onCancel,
}: {
  projectId: string;
  sectionId: string | null;
  parentId: string | null;
  indent?: boolean;
  /** Fecha (`yyyy-MM-dd`) precargada cuando el parser no reconoció ninguna (bloque 8.2: el alta rápida de Hoy y Próximos). Excluyente con `defaultDueAt`. */
  defaultDueDate?: string;
  /** Instante ISO precargado cuando el contexto trae hora, no solo día (D-F de `alta-de-tareas-en-contexto`: el rango arrastrado en el calendario). Excluyente con `defaultDueDate`. */
  defaultDueAt?: string;
  /** Duración en minutos que acompaña a `defaultDueAt` (D-F). Sin efecto sin `defaultDueAt`. */
  defaultDurationMinutes?: number;
  /**
   * `compact` (default): tratamiento incrustado en una lista, una sección,
   * una subtarea o el calendario — la tarjeta con borde de siempre, siempre
   * desplegada (D-C). `full`: el modal de los dos diálogos globales (botón
   * del panel lateral y atajo `Q`) — mismos campos, sin la tarjeta propia
   * porque ya vive dentro de un `AppDialog`, y arranca plegado: solo título
   * y destino hasta que se use el control de desplegar (D-C).
   */
  variant?: "compact" | "full";
  /** Solo lo usa `variant="full"`: cierra el diálogo que lo contiene en vez de solo colapsar el composer, porque acá no hay a qué colapsar (bloque 7.2). */
  onCancel?: () => void;
}) {
  const [adding, setAdding] = useState(variant === "full");
  // Solo importa en `full` (D-C): el modal global arranca mostrando título y
  // destino nada más; el resto de los campos aparece recién al desplegar.
  // `compact` no usa este estado — siempre muestra todo apenas se abre, ya
  // desplegado, porque llegar ahí (clic en "Agregar tarea") ya declaró la
  // intención.
  const [fieldsExpanded, setFieldsExpanded] = useState(false);
  const showAllFields = variant === "compact" || fieldsExpanded;
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
  /** Mismo criterio `undefined` = "no tocado todavía, sigue el `@` del parser" (D-E de `alta-de-tareas-en-contexto`). */
  const [labelsOverride, setLabelsOverride] = useState<LabelChip[] | undefined>(undefined);
  /** Recordatorios en borrador (D-E): sin equivalente en el parser, así que no hay nada que puedan pisar — arranca vacío, no `undefined`. */
  const [remindersOverride, setRemindersOverride] = useState<DraftReminder[]>([]);

  /**
   * El menú de `#`/`@` (bloque 3, A3 del design): funcionalidad nueva que
   * convive con el reconocimiento en vivo de arriba, no lo reemplaza.
   * `menuTrigger` es `null` casi siempre — solo existe mientras el cursor
   * está escribiendo un token sin cerrar, y se recalcula en cada tecla y
   * cada movimiento de cursor (`onChange`/`onSelect` del `<input>` de
   * abajo). `selectedIndex` es puramente de navegación por teclado (bloque
   * 3.5): el resaltado del mouse es CSS, no toca este estado.
   */
  const [menuTrigger, setMenuTrigger] = useState<MenuTrigger | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Qué sesión de menú produjo el `selectedIndex` actual: cambia con cada
  // símbolo o cada tecla del filtro. Comparado contra el trigger vigente
  // durante el render (no en un efecto, para no encadenar otro render de
  // más) para volver la selección al primer resultado apenas cambia lo que
  // se está filtrando.
  const [selectedIndexFor, setSelectedIndexFor] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleFieldRef = useRef<HTMLDivElement>(null);

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

  const menuOptions: ParserMenuOption[] = useMemo(() => {
    if (!menuTrigger) return [];
    return menuTrigger.symbol === "#"
      ? buildProjectMenuOptions(proyectos, menuTrigger.query)
      : buildLabelMenuOptions(etiquetas, menuTrigger.query);
  }, [menuTrigger, proyectos, etiquetas]);

  // La selección por teclado vuelve al primer resultado cada vez que cambia
  // lo que se está filtrando — si no, se podría confirmar con Enter una
  // opción que ya no está en la lista filtrada. Ajuste durante el render,
  // no en un efecto (evita el render extra que dispararía un `setState`
  // dentro de `useEffect`): es el mismo patrón que React recomienda para
  // "resetear el estado cuando cambia un prop".
  const menuKey = menuTrigger ? `${menuTrigger.symbol}:${menuTrigger.query}` : null;
  if (menuKey !== selectedIndexFor) {
    setSelectedIndexFor(menuKey);
    setSelectedIndex(0);
  }

  // "Clic afuera" cierra el menú sin tocar el texto (bloque 3.5): se
  // escucha en `document` en vez de un `onBlur` del `<input>` porque
  // clickear una opción del menú también le saca el foco al documento por
  // un instante, y `onBlur` no distingue ese caso del de clickear afuera de
  // verdad. El menú vive dentro de `titleFieldRef`, así que un clic ahí
  // adentro (la opción, el propio `<input>`) no cuenta como "afuera".
  useEffect(() => {
    if (!menuTrigger) return;
    function handlePointerDown(event: MouseEvent) {
      if (!titleFieldRef.current?.contains(event.target as Node)) setMenuTrigger(null);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuTrigger]);

  /** Recalcula qué token se está escribiendo, si hay alguno, a partir del texto y la posición del cursor (bloque 3.2-3.4). */
  function updateMenuTrigger(value: string, cursor: number) {
    setMenuTrigger(findMenuTrigger(value, cursor));
  }

  /**
   * Elegir una opción del menú (bloque 3.6): empalma el texto elegido en el
   * título, en el mismo lugar donde está el token — nunca un estado
   * paralelo — para que el parser lo vuelva a reconocer y resaltar
   * exactamente como si se hubiera escrito de corrido. La etiqueta nueva
   * (`isCreate`) no es distinta acá: su `insertText` es el nombre tal cual
   * se escribió, así que el título queda igual que si nunca hubiera existido
   * el menú, y la creación la sigue resolviendo el parser al confirmar
   * (OQ1), no esta función.
   */
  function pickMenuOption(option: ParserMenuOption) {
    if (!menuTrigger) return;
    const tokenStart = menuTrigger.start + 1;
    const tokenEnd = tokenStart + menuTrigger.query.length;
    const insertion = `${option.insertText} `;
    const nextTitle = title.slice(0, tokenStart) + insertion + title.slice(tokenEnd);
    setTitle(nextTitle);
    setMenuTrigger(null);
    const cursor = tokenStart + insertion.length;
    requestAnimationFrame(() => titleInputRef.current?.setSelectionRange(cursor, cursor));
  }

  // Contexto de fecha/hora de quien montó el composer (D-F): un día solo
  // (Hoy/Próximos) o, si vino del calendario, hora y duración también.
  const dateFallback: DateSelectValue = {
    dueDate: defaultDueDate ?? null,
    dueAt: defaultDueAt ?? null,
    durationMinutes: defaultDurationMinutes ?? null,
  };

  const previewDate = mergeDate(preview, dateOverride, dateFallback);
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
    setLabelsOverride(undefined);
    setRemindersOverride([]);
    setMenuTrigger(null);
  }

  function cancel() {
    resetComposer();
    // En `full` no hay botón colapsado al que volver (bloque 7.2: el
    // composer siempre está desplegado dentro del diálogo) — cancelar tiene
    // que cerrar el diálogo, no dejarlo abierto mostrando un formulario
    // vacío sin salida.
    if (variant === "full") {
      onCancel?.();
    } else {
      setAdding(false);
    }
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

    const date = mergeDate(final, dateOverride, dateFallback);
    const priority = mergePriority(final.priority, priorityOverride);
    const deadline = deadlineOverride !== undefined ? deadlineOverride : null;
    const destination = mergeDestination(final.project, destinationOverride, projectId, sectionId);
    const labels = mergeLabels(final.labels, labelsOverride);

    createTask.mutate(
      {
        title: finalTitle,
        projectId: destination.projectId,
        sectionId: destination.sectionId,
        parentId,
        description: descriptionDoc(description),
        deadline,
        result: { ...final, labels, dueDate: date.dueDate, dueAt: date.dueAt, durationMinutes: date.durationMinutes, priority },
        reminders: remindersOverride,
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
      className={
        variant === "full"
          ? // Sin tarjeta propia: el `AppDialog` que lo contiene ya trae su
            // borde y su fondo (bloque 7.2) — repetirlos acá sería un marco
            // doble.
            "space-y-4"
          : // Sin `max-w-xl`: el compacto aprovecha el ancho disponible de la
            // lista o sección donde está incrustado (bloque 7.3) en vez de
            // quedar angosto a propósito.
            cn("space-y-2 rounded-lg border border-border bg-surface p-2.5", indent && "ml-6")
      }
      onKeyDown={(event) => {
        if (event.key === "Escape") cancel();
      }}
    >
      <div className="relative" ref={titleFieldRef}>
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
          onChange={(event) => {
            const value = event.target.value;
            setTitle(value);
            updateMenuTrigger(value, event.target.selectionStart ?? value.length);
          }}
          onSelect={(event) => {
            const el = event.currentTarget;
            updateMenuTrigger(el.value, el.selectionStart ?? el.value.length);
          }}
          onKeyDown={(event) => {
            // Navegación del menú (bloque 3.5): solo estas teclas se
            // interceptan, y solo mientras el menú está abierto — el resto
            // sigue yendo derecho al `<input>` (bloque 3.6), sin lo cual
            // escribir de corrido dejaría de funcionar.
            if (menuTrigger && menuOptions.length > 0) {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelectedIndex((i) => (i + 1) % menuOptions.length);
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelectedIndex((i) => (i - 1 + menuOptions.length) % menuOptions.length);
                return;
              }
              if (event.key === "Enter" || event.key === "Tab") {
                event.preventDefault();
                pickMenuOption(menuOptions[selectedIndex]);
                return;
              }
            }
            if (menuTrigger && event.key === "Escape") {
              // Cierra solo el menú, no todo el composer: sin el
              // `stopPropagation` de acá, este mismo Escape seguiría
              // subiendo hasta el `onKeyDown` del contenedor y cancelaría
              // el alta completa (bloque 3.5).
              event.preventDefault();
              event.stopPropagation();
              setMenuTrigger(null);
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          aria-label={parentId ? "Título de la nueva subtarea" : "Título de la nueva tarea"}
          className="caret-foreground h-8 w-full text-sm text-transparent selection:bg-transparent"
        />
        {menuTrigger && (
          <ParserMenu
            symbol={menuTrigger.symbol}
            options={menuOptions}
            selectedIndex={selectedIndex}
            onPick={pickMenuOption}
          />
        )}
      </div>

      {/*
        Destino: siempre visible en las dos superficies
        (`alta-de-tareas-en-contexto`, D-D) y nunca detrás del plegado de
        `full` — el requirement "el destino se ve antes de confirmar" exige
        que esté ahí incluso plegado. Revierte la versión anterior, que lo
        ocultaba en `compact` por considerarlo ruido: con el destino
        llegando también de preferencias y del contexto de la vista (D-B),
        no verlo pasa a ser peor que verlo.

        Excepto en subtarea (`parentId` presente): una subtarea hereda el
        proyecto de la tarea padre, no puede tener uno distinto, así que
        mostrar acá un selector de destino sería engañoso — parecería que se
        puede elegir un proyecto propio cuando en realidad no se puede.
      */}
      {!parentId && (
        <AttributeField variant={variant} label="Proyecto">
          <TaskDestinationSelect value={previewDestination} onChange={setDestinationOverride} proyectos={proyectos} />
        </AttributeField>
      )}

      {showAllFields && (
        <>
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descripción (opcional)"
            aria-label={parentId ? "Descripción de la nueva subtarea" : "Descripción de la nueva tarea"}
            rows={2}
            className="min-h-0 resize-none text-sm"
          />

          <div className={variant === "full" ? "flex flex-wrap items-end gap-4" : "flex flex-wrap items-center gap-1.5"}>
            <AttributeField variant={variant} label="Fecha">
              <DateSelect value={previewDate} onChange={setDateOverride} preferences={preferences} />
            </AttributeField>
            <AttributeField variant={variant} label="Fecha límite">
              <DeadlineSelect value={previewDeadline} onChange={setDeadlineOverride} preferences={preferences} />
            </AttributeField>
            <AttributeField variant={variant} label="Prioridad">
              <PrioritySelect value={previewPriority} onChange={setPriorityOverride} />
            </AttributeField>
            {/* Etiquetas y recordatorios entran al alta (D-E): mismos selectores que el detalle, en modo borrador porque acá todavía no hay ningún `taskId` real. */}
            <AttributeField variant={variant} label="Etiquetas">
              <LabelPicker
                projectId={previewDestination.projectId}
                assigned={labelsOverride ?? []}
                onChange={setLabelsOverride}
                triggerClassName="h-8 w-auto max-w-56"
              />
            </AttributeField>
            <AttributeField variant={variant} label="Recordatorios">
              <ReminderPicker
                dueAt={previewDate.dueAt}
                dueDate={previewDate.dueDate}
                drafts={remindersOverride}
                onChange={setRemindersOverride}
              />
            </AttributeField>
          </div>
        </>
      )}

      {/* Control de desplegar (D-C): solo en `full`, y solo hasta usarlo — una vez desplegado no hace falta volver a plegar. */}
      {variant === "full" && !fieldsExpanded && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-text-secondary"
          onClick={() => setFieldsExpanded(true)}
        >
          <ChevronDown className="size-3.5" />
          Mostrar más campos
        </Button>
      )}

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
