import { z } from "zod";

/** Esquema de sección (bloque 6): nombre y descripción, igual patrón que `projects` (`lib/validation/projects.ts`). */
export const sectionFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Falta el nombre de la sección. Completá el campo antes de continuar.")
    .max(120, "El nombre es muy largo: como máximo 120 caracteres."),
  description: z
    .string()
    .trim()
    .max(2000, "La descripción es muy larga: como máximo 2000 caracteres.")
    .optional()
    .transform((value) => value ?? ""),
});

// `description` tiene `.transform()`: el tipo que React Hook Form maneja
// mientras se escribe (`input`) difiere del que llega a `onSubmit` después de
// Zod (`output`, ya normalizado) — mismo patrón que `ProjectFormValues` /
// `ProjectFormOutput` en `lib/validation/projects.ts`.
export type SectionFormInput = z.input<typeof sectionFormSchema>;
export type SectionFormOutput = z.output<typeof sectionFormSchema>;
