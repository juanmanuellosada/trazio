import { z } from "zod";
import {
  PROJECT_COLOR_IDS,
  hasSufficientProjectColorContrast,
  isValidProjectHexColor,
} from "./colors";

/**
 * Esquema de etiqueta (bloque 4.2/4.3, capacidad `administracion-de-etiquetas`):
 * solo nombre y color, mucho más chico que `projectFormSchema` porque una
 * etiqueta no tiene ícono, descripción, padre ni favorito. El color sigue el
 * mismo criterio que `colorSchema` de `lib/validation/projects.ts` — misma
 * paleta fija y misma validación de contraste (D29, extendido a etiquetas
 * por la migración `20260729000000_labels_color_allow_custom_hex.sql`) —
 * reusando los mismos helpers de `lib/validation/colors.ts` sin duplicar
 * esa lógica, solo el schema de Zod que la envuelve.
 */

const nameSchema = z
  .string()
  .trim()
  .min(1, "Falta el nombre de la etiqueta. Completá el campo antes de continuar.")
  .max(60, "El nombre es muy largo: como máximo 60 caracteres.");

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

export const labelFormSchema = z.object({
  name: nameSchema,
  color: colorSchema,
});

export type LabelFormValues = z.input<typeof labelFormSchema>;
export type LabelFormOutput = z.output<typeof labelFormSchema>;
