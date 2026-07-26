"use client";

import { useId } from "react";
import { useTheme } from "next-themes";
import { Check } from "lucide-react";
import { PROJECT_COLOR_IDS, PROJECT_COLORS, type ProjectColor } from "@/lib/validation/colors";
import { cn } from "@/lib/utils";

/**
 * Selector de color de proyecto/etiqueta (bloque 6.2): la paleta fija de
 * `docs/design-system.md` §2, nunca color libre. Cada swatch es un botón de
 * 44×44px (mínimo táctil) con `role="radio"` dentro de un `radiogroup`, y el
 * seleccionado se marca con un tilde además del anillo — no solo con color,
 * como pide la guía de accesibilidad de `ui-ux-pro-max`.
 */
export function ColorSwatchPicker({
  value,
  onChange,
  error,
}: {
  value: ProjectColor;
  onChange: (color: ProjectColor) => void;
  error?: string;
}) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const labelId = useId();
  const errorId = useId();

  return (
    <div className="space-y-1.5">
      <span id={labelId} className="text-sm font-medium text-foreground">
        Color
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
        className="flex flex-wrap gap-1"
      >
        {PROJECT_COLOR_IDS.map((id) => {
          // Excepción intencional: acá se itera la paleta completa por diseño
          // (construye el selector), no se resuelve un `project.color` ya
          // guardado — no pasa por `resolveProjectColorHex`.
          const hex = dark ? PROJECT_COLORS[id].dark : PROJECT_COLORS[id].light;
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={PROJECT_COLORS[id].name}
              onClick={() => onChange(id)}
              className="relative flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span
                aria-hidden
                className={cn(
                  "size-7 rounded-full transition-transform",
                  selected && "ring-2 ring-offset-2 ring-offset-background ring-foreground",
                )}
                style={{ backgroundColor: hex }}
              />
              {selected && (
                <Check aria-hidden className="absolute size-3.5 text-white mix-blend-difference" />
              )}
            </button>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
