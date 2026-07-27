import { z } from "zod";
import {
  PROJECT_COLOR_IDS,
  hasSufficientProjectColorContrast,
  isValidProjectHexColor,
} from "./colors";

/**
 * Esquema de proyecto (bloque 6 y 8), compartido entre el formulario de
 * React Hook Form y cualquier validación de servidor. El color viene de la
 * paleta fija (`PROJECT_COLOR_IDS`, la misma lista que impone el check
 * constraint `projects_color_check` en la base) o, como salida al final de
 * esa lista, de un color personalizado en formato hexadecimal que además
 * tiene que dar contraste contra los dos temas (D29 en docs/decisions.md):
 * esa validación de contraste es la única que separa D29 de un retroceso
 * sobre D19, así que corre acá y no en ningún otro lado — ver el requirement
 * "Crear y editar un proyecto" del spec de `proyectos-secciones`.
 */

const nameSchema = z
  .string()
  .trim()
  .min(1, "Falta el nombre del proyecto. Completá el campo antes de continuar.")
  .max(120, "El nombre es muy largo: como máximo 120 caracteres.");

const colorSchema = z
  .string()
  .min(1, "Falta elegir un color. Elegí uno de la paleta o un color personalizado.")
  .superRefine((value, ctx) => {
    if ((PROJECT_COLOR_IDS as readonly string[]).includes(value)) return;
    if (!isValidProjectHexColor(value)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Ese color no es válido porque no es ninguno de la paleta ni un color personalizado bien formado. Elegí un color de la lista o escribí un hexadecimal de seis dígitos, como #4F46E5.",
      });
      return;
    }
    if (!hasSufficientProjectColorContrast(value)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Ese color personalizado no se guardó porque no se lee bien contra el fondo de la app en modo claro o en modo oscuro. Probá un tono más oscuro o más saturado, o elegí uno de la paleta.",
      });
    }
  });

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
  // Favorito desde el alta (bloque 8.9): antes solo se podía marcar después
  // de creado, desde el menú de acciones del árbol.
  isFavorite: z.boolean(),
});

// `icon` y `description` tienen `.transform()`: el tipo que React Hook Form
// maneja mientras se escribe (`input`, antes de validar) difiere del que
// llega a `onSubmit` después de Zod (`output`, ya normalizado). Ver el uso
// de los tres genéricos de `useForm` en `project-form-dialog.tsx`.
export type ProjectFormValues = z.input<typeof projectFormSchema>;
export type ProjectFormOutput = z.output<typeof projectFormSchema>;
