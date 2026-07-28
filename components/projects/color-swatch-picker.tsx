"use client";

import { useId, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { useTheme } from "next-themes";
import { Palette } from "lucide-react";
import { PROJECT_COLOR_IDS, PROJECT_COLORS, type ProjectColor } from "@/lib/validation/colors";
import { SelectField, type SelectFieldOption } from "@/components/primitives/select-field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OVERLAY_MODAL } from "@/components/primitives/overlay";
import { Label } from "@/components/ui/label";

const CUSTOM_COLOR_OPTION = "personalizado";
type ColorOption = ProjectColor | typeof CUSTOM_COLOR_OPTION;

// Fallback neutro para la superficie de selección visual mientras no hay un
// hex válido todavía escrito (justo después de pasar a modo personalizado).
const COLOR_INPUT_FALLBACK = "#5C6675";

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Conversión hex <-> HSV, solo para dibujar y leer la superficie de
// selección visual. `value`/`onChange` siguen viajando en hex nada más: la
// validación de contraste sigue viviendo, sin duplicarse, en
// `projectFormSchema` (`lib/validation/projects.ts`).
function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;

  return { h, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 };
}

function hsvToHex(h: number, s: number, v: number): string {
  const sNorm = s / 100;
  const vNorm = v / 100;
  const c = vNorm * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vNorm - c;

  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Cuadrado de saturación/brillo (bloque 8, sistema-de-componentes A1): la
 * superficie que reemplaza al `<input type="color">` nativo. Arrastrar o
 * clickear elige saturación (eje horizontal) y brillo (eje vertical); las
 * flechas del teclado hacen lo mismo de a pasos, con `Shift` para pasos
 * grandes. `role="slider"` no describe una superficie 2D a la perfección,
 * pero es lo que mejor comunica "esto se ajusta con el teclado" a un lector
 * de pantalla, y `aria-valuetext` lee los dos ejes juntos.
 */
function SaturationValueSurface({
  h,
  s,
  v,
  onChange,
}: {
  h: number;
  s: number;
  v: number;
  onChange: (s: number, v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function updateFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const nextS = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const nextV = clamp(100 - ((event.clientY - rect.top) / rect.height) * 100, 0, 100);
    onChange(nextS, nextV);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : 2;
    if (event.key === "ArrowLeft") onChange(clamp(s - step, 0, 100), v);
    else if (event.key === "ArrowRight") onChange(clamp(s + step, 0, 100), v);
    else if (event.key === "ArrowUp") onChange(s, clamp(v + step, 0, 100));
    else if (event.key === "ArrowDown") onChange(s, clamp(v - step, 0, 100));
    else return;
    event.preventDefault();
  }

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Saturación y brillo del color"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(s)}
      aria-valuetext={`Saturación ${Math.round(s)} por ciento, brillo ${Math.round(v)} por ciento`}
      onPointerDown={(event) => {
        // Algunos entornos (jsdom en los tests) no implementan la captura de
        // puntero: el resto de la interacción funciona igual sin ella.
        event.currentTarget.setPointerCapture?.(event.pointerId);
        updateFromPointer(event);
      }}
      onPointerMove={(event) => {
        if (event.buttons === 1) updateFromPointer(event);
      }}
      onKeyDown={handleKeyDown}
      className="relative h-36 w-full shrink-0 touch-none rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      style={{
        backgroundColor: hsvToHex(h, 100, 100),
        backgroundImage:
          "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
        style={{ left: `${s}%`, top: `${100 - v}%` }}
      />
    </div>
  );
}

/**
 * Control de matiz (bloque 8): la franja que completa el cuadrado de
 * saturación/brillo con el tercer eje del color. Mismo patrón de arrastre y
 * teclado que la superficie de arriba.
 */
function HueSlider({ h, onChange }: { h: number; onChange: (h: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  function updateFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    onChange(clamp(((event.clientX - rect.left) / rect.width) * 360, 0, 360));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 20 : 2;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") onChange(clamp(h - step, 0, 360));
    else if (event.key === "ArrowRight" || event.key === "ArrowUp") onChange(clamp(h + step, 0, 360));
    else return;
    event.preventDefault();
  }

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Matiz del color"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round(h)}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        updateFromPointer(event);
      }}
      onPointerMove={(event) => {
        if (event.buttons === 1) updateFromPointer(event);
      }}
      onKeyDown={handleKeyDown}
      className="relative h-3 w-full shrink-0 touch-none rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      style={{
        backgroundImage: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
        style={{ left: `${(h / 360) * 100}%`, backgroundColor: hsvToHex(h, 100, 100) }}
      />
    </div>
  );
}

/**
 * Selector de color de proyecto (bloque 8.5/8.6, D29): una lista
 * desplegable donde cada color de la paleta fija de D19 se ve con su nombre
 * y su muestra, camino principal y primera opción, con "Personalizado" al
 * final. Elegir "Personalizado" revela un color libre (superficie visual de
 * saturación/brillo + matiz, más el hexadecimal a mano); su validación de
 * contraste contra los dos temas vive en `projectFormSchema`
 * (`lib/validation/projects.ts`), la misma que corre para cualquier otro
 * campo del formulario — acá no se duplica.
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
  const currentHex = HEX_PATTERN.test(value) ? value : COLOR_INPUT_FALLBACK;
  const { h, s, v } = hexToHsv(currentHex);

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
          <Popover modal={OVERLAY_MODAL}>
            <PopoverTrigger
              aria-label="Elegí un color personalizado"
              className="size-9 shrink-0 cursor-pointer rounded-md border border-input outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              style={{ backgroundColor: currentHex }}
            />
            <PopoverContent align="start" className="w-56 gap-3">
              <SaturationValueSurface
                h={h}
                s={s}
                v={v}
                onChange={(nextS, nextV) => onChange(hsvToHex(h, nextS, nextV))}
              />
              <HueSlider h={h} onChange={(nextH) => onChange(hsvToHex(nextH, s, v))} />
            </PopoverContent>
          </Popover>
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
