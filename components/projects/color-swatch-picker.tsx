"use client";

import { useId } from "react";
import { useTheme } from "next-themes";
import { Palette } from "lucide-react";
import { PROJECT_COLOR_IDS, PROJECT_COLORS, type ProjectColor } from "@/lib/validation/colors";
import { SelectField, type SelectFieldOption } from "@/components/primitives/select-field";
import { Label } from "@/components/ui/label";

const CUSTOM_COLOR_OPTION = "personalizado";
type ColorOption = ProjectColor | typeof CUSTOM_COLOR_OPTION;

// Fallback neutro para el selector nativo de color mientras no hay un hex
// válido todavía escrito (justo después de pasar a modo personalizado).
const COLOR_INPUT_FALLBACK = "#5C6675";

/**
 * Selector de color de proyecto (bloque 8.5/8.6, D29): una lista
 * desplegable donde cada color de la paleta fija de D19 se ve con su nombre
 * y su muestra, camino principal y primera opción, con "Personalizado" al
 * final. Elegir "Personalizado" revela un color libre (selector nativo +
 * hexadecimal a mano); su validación de contraste contra los dos temas vive
 * en `projectFormSchema` (`lib/validation/projects.ts`), la misma que
 * corre para cualquier otro campo del formulario — acá no se duplica.
 */
export function ColorSwatchPicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (color: string) => void;
  error?: string;
}) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const customInputId = useId();

  const isPalette = (PROJECT_COLOR_IDS as readonly string[]).includes(value);

  const options: SelectFieldOption<ColorOption>[] = [
    ...PROJECT_COLOR_IDS.map((id) => ({
      value: id,
      label: PROJECT_COLORS[id].name,
      icon: (
        <span
          aria-hidden
          className="size-3.5 shrink-0 rounded-full"
          style={{ backgroundColor: dark ? PROJECT_COLORS[id].dark : PROJECT_COLORS[id].light }}
        />
      ),
    })),
    {
      value: CUSTOM_COLOR_OPTION,
      label: "Personalizado",
      icon: <Palette aria-hidden className="size-3.5 shrink-0 text-text-secondary" />,
    },
  ];

  function handleModeChange(next: ColorOption) {
    if (next === CUSTOM_COLOR_OPTION) {
      // Solo arranca en blanco al pasar DE la paleta A personalizado: si ya
      // estaba en modo personalizado, no pisa lo que la persona ya escribió.
      if (isPalette) onChange("");
      return;
    }
    onChange(next);
  }

  return (
    <div className="space-y-1.5">
      <Label>Color</Label>
      <SelectField
        ariaLabel="Color"
        value={isPalette ? (value as ProjectColor) : CUSTOM_COLOR_OPTION}
        onChange={handleModeChange}
        options={options}
        placeholder="Elegí un color"
      />

      {!isPalette && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="color"
            aria-label="Elegí un color personalizado"
            value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : COLOR_INPUT_FALLBACK}
            onChange={(event) => onChange(event.target.value)}
            className="size-9 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
          />
          <input
            id={customInputId}
            type="text"
            aria-label="Código hexadecimal del color personalizado"
            placeholder="#4F46E5"
            maxLength={7}
            value={value}
            onChange={(event) => onChange(event.target.value.trim())}
            className="h-9 w-28 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50"
          />
        </div>
      )}

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
