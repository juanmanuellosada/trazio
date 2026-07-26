import { z } from "zod";
import { PROJECT_COLOR_IDS } from "./colors";

/**
 * Esquema de proyecto (bloque 6), compartido entre el formulario de React
 * Hook Form y cualquier validación de servidor. El color solo puede venir de
 * la paleta fija (`PROJECT_COLOR_IDS`), la misma lista que impone el check
 * constraint `projects_color_check` en la base — ver el requirement "Crear y
 * editar un proyecto" del spec de `proyectos-secciones`.
 */

const nameSchema = z
  .string()
  .trim()
  .min(1, "Falta el nombre del proyecto. Completá el campo antes de continuar.")
  .max(120, "El nombre es muy largo: como máximo 120 caracteres.");

const colorSchema = z.enum(PROJECT_COLOR_IDS);

// Un ícono es un solo emoji (Extended_Pictographic cubre también las
// secuencias con ZWJ y modificador de tono de piel, por eso el largo
// máximo no es 1 sino unos pocos caracteres).
const iconSchema = z
  .string()
  .trim()
  .max(8, "El ícono tiene que ser un solo emoji.")
  .refine((value) => value === "" || /\p{Extended_Pictographic}/u.test(value), {
    message: "El ícono tiene que ser un emoji.",
  })
  .optional()
  .transform((value) => (!value ? null : value));

const descriptionSchema = z
  .string()
  .trim()
  .max(2000, "La descripción es muy larga: como máximo 2000 caracteres.")
  .optional()
  .transform((value) => value ?? "");

export const projectFormSchema = z.object({
  name: nameSchema,
  color: colorSchema,
  icon: iconSchema,
  description: descriptionSchema,
});

// `icon` y `description` tienen `.transform()`: el tipo que React Hook Form
// maneja mientras se escribe (`input`, antes de validar) difiere del que
// llega a `onSubmit` después de Zod (`output`, ya normalizado). Ver el uso
// de los tres genéricos de `useForm` en `project-form-dialog.tsx`.
export type ProjectFormValues = z.input<typeof projectFormSchema>;
export type ProjectFormOutput = z.output<typeof projectFormSchema>;
