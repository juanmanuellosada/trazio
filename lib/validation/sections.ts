import { z } from "zod";

/** Esquema de sección (bloque 6): solo tiene nombre. */
export const sectionFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Falta el nombre de la sección. Completá el campo antes de continuar.")
    .max(120, "El nombre es muy largo: como máximo 120 caracteres."),
});

export type SectionFormInput = z.infer<typeof sectionFormSchema>;
