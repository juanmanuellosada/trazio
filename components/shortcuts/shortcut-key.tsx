import { cn } from "@/lib/utils";

/**
 * Una sola tecla del indicador de atajo (bloque 2, D-B): el átomo visual que
 * se repite tanto para cada pulsación de un acorde (requirement "Un acorde
 * se dibuja como dos teclas separadas") como para cada modificador de un
 * combo simultáneo (`Ctrl`, `⇧`). No decide qué texto mostrar ni su propia
 * visibilidad por ancho de pantalla — eso lo resuelve `ShortcutHint`, que es
 * quien conoce el combo real.
 */
export function ShortcutKey({ children, className }: { children: string; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface px-1 font-mono text-[0.65rem] font-medium text-text-secondary",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
