"use client";

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
}: {
  value: TaskDestination;
  onChange: (destination: TaskDestination) => void;
  proyectos: ParserProject[];
  disabled?: boolean;
}) {
  const options: SelectFieldOption<string>[] = proyectos.flatMap((project) => [
    { value: destinationKey(project.id, null), label: project.path },
    ...project.sections.map((section) => ({
      value: destinationKey(project.id, section.id),
      label: `${project.path} · ${section.name}`,
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
      triggerClassName="h-8 w-auto max-w-56"
    />
  );
}
