"use client";

import { Rows3 } from "lucide-react";
import { SelectField, type SelectFieldOption } from "@/components/primitives/select-field";
import type { ParserProject } from "@/lib/parser/types";

export type TaskDestination = { projectId: string; sectionId: string | null };

function destinationKey(projectId: string, sectionId: string | null): string {
  return sectionId ? `${projectId}::${sectionId}` : projectId;
}

function parseDestinationKey(key: string): TaskDestination {
  const [projectId, sectionId] = key.split("::");
  return { projectId, sectionId: sectionId ?? null };
}

/**
 * Selector de proyecto/sección destino del componente de alta (bloque 5.4):
 * no es uno de los tres selectores de la capacidad `selectores-de-atributos`
 * —esa capacidad cubre fecha, fecha límite y prioridad, nunca proyecto—, así
 * que vive junto al alta, construido sobre `SelectField` (bloque 2.5), la
 * misma primitiva que ya sirve de base a esos tres. Lista plana, buscable:
 * cada proyecto y, debajo, cada una de sus secciones.
 */
export function TaskDestinationSelect({
  value,
  onChange,
  proyectos,
  disabled,
  variant = "chip",
}: {
  value: TaskDestination;
  onChange: (destination: TaskDestination) => void;
  proyectos: ParserProject[];
  disabled?: boolean;
  /** `chip` (default): angosto, ajustado al texto — el de siempre, el que usa la alta. `row`: ocupa todo el ancho e iguala la altura del trigger de Etiquetas, para la columna del detalle de tarea. */
  variant?: "chip" | "row";
}) {
  const options: SelectFieldOption<string>[] = proyectos.flatMap((project) => [
    {
      value: destinationKey(project.id, null),
      label: project.path,
      icon: project.icon,
      keywords: project.sections.map((section) => section.name),
    },
    ...project.sections.map((section) => ({
      value: destinationKey(project.id, section.id),
      label: section.name,
      icon: <Rows3 className="size-4 shrink-0 text-text-secondary" aria-hidden />,
      indent: true,
      keywords: [project.name, project.path],
    })),
  ]);

  return (
    <SelectField
      value={destinationKey(value.projectId, value.sectionId)}
      onChange={(key) => onChange(parseDestinationKey(key))}
      options={options}
      placeholder="Elegí el destino"
      searchPlaceholder="Buscar proyecto o sección…"
      emptyMessage="No encontramos ningún proyecto con ese nombre."
      disabled={disabled}
      ariaLabel="Proyecto destino"
      triggerClassName={variant === "row" ? "h-9 w-full" : "h-8 w-auto max-w-56"}
    />
  );
}
