import { normalize } from "./normalize";
import type { ParserLabel, ParserProject } from "./types";

/**
 * Una opción del menú de `#`/`@` (bloque 3): `insertText` es exactamente lo
 * que se empalma después del símbolo en el título — el mismo texto que, si
 * se tipeara de corrido, el reconocedor de `recognizers.ts` resolvería al
 * mismo proyecto/sección/etiqueta. Elegir una opción nunca guarda un estado
 * paralelo: solo edita el texto y deja que el parser (ya en marcha por
 * `title`) lo vuelva a reconocer, para que el resaltado sea idéntico al de
 * haberlo escrito a mano.
 */
export type ParserMenuOption = {
  id: string;
  label: string;
  insertText: string;
  isCreate?: boolean;
  /** Fila de sección, para mostrarla con sangría debajo de la fila de su proyecto (E7: cada sección aparece justo después de su proyecto, ya en ese orden). */
  isSection?: boolean;
};

/**
 * Menú de `#`: cada proyecto, y debajo sus secciones anidadas (E7: hasta 3
 * niveles, `path` ya trae la ruta de ancestros resuelta). Filtra por
 * substring sin distinguir mayúsculas ni acentos, mismo criterio que E7.
 */
export function buildProjectMenuOptions(proyectos: ParserProject[], query: string): ParserMenuOption[] {
  const q = normalize(query.trim());
  const options: ParserMenuOption[] = [];
  for (const project of proyectos) {
    if (!q || normalize(project.path).includes(q)) {
      options.push({ id: project.id, label: project.path, insertText: project.path });
    }
    for (const section of project.sections) {
      const full = `${project.path}/${section.name}`;
      if (!q || normalize(full).includes(q)) {
        options.push({
          id: `${project.id}:${section.id}`,
          label: section.name,
          insertText: full,
          isSection: true,
        });
      }
    }
  }
  return options;
}

/**
 * Menú de `@`: las etiquetas existentes que coincidan, más una opción para
 * crear la que no existe todavía (bloque 3.3) — se ofrece solo cuando lo
 * escrito no coincide con ninguna etiqueta, nunca junto a coincidencias
 * reales.
 */
export function buildLabelMenuOptions(etiquetas: ParserLabel[], query: string): ParserMenuOption[] {
  const trimmed = query.trim();
  const q = normalize(trimmed);
  const matches = q ? etiquetas.filter((label) => normalize(label.name).includes(q)) : etiquetas;

  if (trimmed && matches.length === 0) {
    return [{ id: "__create__", label: `Crear etiqueta "${trimmed}"`, insertText: trimmed, isCreate: true }];
  }
  return matches.map((label) => ({ id: label.id, label: label.name, insertText: label.name }));
}
