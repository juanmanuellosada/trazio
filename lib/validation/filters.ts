import { z } from "zod";
import { PROJECT_COLOR_IDS, hasSufficientProjectColorContrast, isValidProjectHexColor } from "./colors";
import { parseQuery } from "@/lib/query-language/parse";

/**
 * Esquema de filtro guardado (bloque 2.15, capacidad `filtros-guardados`):
 * nombre, consulta, color e ícono. El color sigue el mismo criterio que
 * `colorSchema` de `lib/validation/labels.ts` (misma paleta fija y misma
 * validación de contraste, D29). La consulta se valida con el parser real
 * del lenguaje de consulta (`lib/query-language/parse.ts`): un filtro nunca
 * se guarda con una consulta que el parser no puede interpretar.
 */

const nameSchema = z
  .string()
  .trim()
  .min(1, "Falta el nombre del filtro. Completá el campo antes de continuar.")
  .max(60, "El nombre es muy largo: como máximo 60 caracteres.");

const querySchema = z
  .string()
  .trim()
  .min(1, "Falta la consulta del filtro. Escribí algo antes de guardar.")
  .superRefine((value, ctx) => {
    const result = parseQuery(value);
    if (!result.ok) {
      ctx.addIssue({ code: "custom", message: result.error.message });
    }
  });

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

// Un ícono es un solo emoji, igual que `projectFormSchema` (lib/validation/projects.ts).
const iconSchema = z
  .string()
  .trim()
  .max(8, "El ícono tiene que ser un solo emoji.")
  .refine((value) => value === "" || /\p{Extended_Pictographic}/u.test(value), {
    message: "El ícono tiene que ser un emoji.",
  })
  .optional()
  .transform((value) => (!value ? null : value));

export const filterFormSchema = z.object({
  name: nameSchema,
  query: querySchema,
  color: colorSchema,
  icon: iconSchema,
  isFavorite: z.boolean(),
});

export type FilterFormValues = z.input<typeof filterFormSchema>;
export type FilterFormOutput = z.output<typeof filterFormSchema>;
