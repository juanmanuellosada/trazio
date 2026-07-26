"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyDisabledMatches, matchKey } from "@/lib/parser/apply-disabled";
import { useCreateTaskFromParse } from "@/lib/parser/create-task-from-parse";
import { parse } from "@/lib/parser/parse";
import type { ParseMatch, ParserContext } from "@/lib/parser/types";
import { useParserContext } from "@/lib/parser/use-parser-context";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 120;

/**
 * Alta rápida de una tarea o subtarea, ahora con el parser de lenguaje
 * natural en español (bloque 9): mientras se escribe, lo que el parser
 * reconoce se resalta en vivo (con el debounce de 120 ms de E2) y un doble
 * clic sobre un resaltado lo desactiva — el token vuelve a texto común y su
 * atributo se descarta (R7). Al confirmar, todo lo que sigue resaltado se
 * quita del título y se guarda como atributo de la tarea.
 *
 * El resaltado se resuelve con la técnica estándar de "overlay sobre
 * `<input>` transparente" (ver el bloque de comentario más abajo, junto al
 * JSX): el texto visible es el de la capa de arriba, y el `<input>` de
 * abajo — con su propio texto invisible — es el que de verdad recibe el
 * teclado y mueve el cursor nativo, así no hay que reimplementar selección
 * ni edición a mano.
 */
export function TaskQuickAddRow({
  projectId,
  sectionId,
  parentId,
  indent,
  defaultDueDate,
}: {
  projectId: string;
  sectionId: string | null;
  parentId: string | null;
  indent?: boolean;
  /** Fecha (`yyyy-MM-dd`) precargada cuando el parser no reconoció ninguna (bloque 8.2: el alta rápida de Hoy). */
  defaultDueDate?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [disabledMatches, setDisabledMatches] = useState<Set<string>>(new Set());
  // Guarda contra qué texto se calculó el último resultado del parser: si
  // el usuario siguió escribiendo desde entonces, todavía no hay un
  // resultado "al día" con ese texto y no se resalta nada (en vez de
  // arriesgar rangos calculados sobre una versión vieja del texto).
  const [debounced, setDebounced] = useState<{ text: string; matches: ParseMatch[] } | null>(null);

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
      setDebounced({ text: title, matches: resultado.matches });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [title, adding, parserContext]);

  const activeMatches = useMemo(() => {
    if (!debounced || debounced.text !== title) return [];
    return debounced.matches.filter((m) => !disabledMatches.has(matchKey(m)));
  }, [debounced, title, disabledMatches]);

  const segments = useMemo(() => buildSegments(title, activeMatches), [title, activeMatches]);

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    const fresh = parse(trimmed, { ahora: new Date(), ...parserContext });
    const final = applyDisabledMatches(trimmed, fresh, disabledMatches);
    const finalTitle = final.title || trimmed; // nunca crear con título vacío (bloque 9.20)

    createTask.mutate(
      {
        title: finalTitle,
        projectId,
        sectionId,
        parentId,
        result: {
          ...final,
          // Sin fecha ni hora reconocida: cae al precargado de la vista (bloque 8.2), como antes del parser.
          dueDate: final.dueAt ? null : (final.dueDate ?? defaultDueDate ?? null),
        },
      },
      {
        onSuccess: () => {
          setTitle("");
          setDisabledMatches(new Set());
          setDebounced(null);
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
    <div className={cn("py-0.5", indent && "ml-6")}>
      <div className="relative max-w-96">
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
          autoFocus
          value={title}
          placeholder="Título de la tarea"
          onChange={(event) => setTitle(event.target.value)}
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
              setTitle("");
              setDisabledMatches(new Set());
              setAdding(false);
            }
          }}
          aria-label={parentId ? "Título de la nueva subtarea" : "Título de la nueva tarea"}
          className="caret-foreground h-8 w-full text-sm text-transparent selection:bg-transparent"
        />
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
