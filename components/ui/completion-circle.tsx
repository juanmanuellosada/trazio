import type { ButtonHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

// Primitiva visual y accesible para el control de completar (tarea u
// hábito). No decide comportamiento: quien la usa pasa `onClick`,
// `aria-label`, `tabIndex` y cualquier freno de propagación
// (`onPointerDown`, etc.) como props sueltas — ver
// `openspec/changes/bloques-de-calendario-consistentes/design.md`,
// "El control compartido vive en `components/ui/`".
//
// Cuatro tamaños, uno por superficie que ya existía en el código (no dos:
// colapsar la escala sería una decisión de diseño que cambia lo que se ve
// en el detalle de tarea y en la tarjeta de hábito, y no corresponde
// meterla en este refactor):
// `xs` (`calendar-block-chip.tsx`), `sm` (`task-row.tsx`,
// `habit-today-row.tsx`), `md` (`task-detail-content.tsx`), `lg`
// (`habit-card.tsx`). Los cuatro exponen el área tocable de 24×24 como piso.

const SIZE_CIRCLE_CLASS = {
  xs: "size-3",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
} as const

const SIZE_DOT_CLASS = {
  xs: "size-1",
  sm: "size-1.5",
  md: "size-2",
  lg: "size-2",
} as const

// Extra por lado para llegar a 24×24: (24 - círculo) / 2.
const SIZE_INSET_CLASS = {
  xs: "-inset-1.5", // 12px + 2×6
  sm: "-inset-1", // 16px + 2×4
  md: "-inset-0.5", // 20px + 2×2
  lg: "inset-0", // 24px, ya en el piso
} as const

type CompletionCircleSize = keyof typeof SIZE_CIRCLE_CLASS

type CompletionCircleProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size: CompletionCircleSize
  checked: boolean
  /** Color del borde sin marcar. Por defecto el token neutro (`border-input`). */
  uncheckedColor?: string
}

function CompletionCircle({
  size,
  checked,
  uncheckedColor,
  className,
  ...props
}: CompletionCircleProps) {
  // Área tocable de 24×24 como piso (WCAG 2.5.8), creciendo fuera del flujo
  // (`absolute -inset-*` sobre un ancla del tamaño dibujado que no
  // participa del layout) — misma técnica que ya usaba el calendario.
  const insetClass = SIZE_INSET_CLASS[size]

  return (
    // `inline-block`, no el `inline` por defecto de un `span`: un elemento
    // inline no reemplazado ignora `width`/`height` (su caja real es 0×0),
    // así que el `<button absolute -inset-*>` de abajo resolvía el inset
    // contra una caja vacía y el área tocable terminaba en la mitad del
    // círculo dibujado en vez de en el piso de 24×24 — bug encontrado en el
    // navegador, invisible para jsdom. `inline-block` alcanza: solo hace
    // falta que el ancla tenga caja propia, no que sea un contenedor flex
    // (el botón de adentro ya se posiciona con `absolute`).
    <span data-slot="completion-circle" className={cn("relative inline-block shrink-0", SIZE_CIRCLE_CLASS[size])}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        className={cn(
          "absolute flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          insetClass,
          className
        )}
        {...props}
      >
        <span
          aria-hidden
          className={cn(
            "flex items-center justify-center rounded-full border-2",
            SIZE_CIRCLE_CLASS[size],
            checked ? "border-primary bg-primary" : "border-input"
          )}
          // El color sin marcar solo aplica sin marcar: marcado siempre se
          // ve igual (`border-primary bg-primary`) pase lo que pase por
          // esta propiedad — ver el spec, "El color sin marcar lo decide
          // la superficie".
          style={!checked && uncheckedColor ? { borderColor: uncheckedColor } : undefined}
        >
          {checked && (
            <span aria-hidden className={cn("rounded-full bg-primary-foreground", SIZE_DOT_CLASS[size])} />
          )}
        </span>
      </button>
    </span>
  )
}

export { CompletionCircle }
