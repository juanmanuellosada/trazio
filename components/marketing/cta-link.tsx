import Link from "next/link";
import { cn } from "@/lib/utils";

/** Texto único del CTA principal: hero y cierre lo repiten igual (bloque 12.2/12.8). */
export const CTA_TEXT = "Crear mi cuenta gratis";

/**
 * CTA principal de la landing. Server Component: el clic se cuenta como
 * evento de analítica sin sumar una isla cliente — ver `analytics-bridge.tsx`,
 * que delega clics de `data-analytics-event` con un `<script>` plano.
 *
 * `location` identifica qué repetición del CTA es (hero, banda intermedia o
 * cierre) componiendo el nombre del evento (`cta_click_<location>`) en vez de
 * agregar una propiedad nueva — así `analytics-bridge.tsx` no necesita saber
 * nada de ubicaciones, solo sigue reenviando `data-analytics-event` tal cual.
 */
export function CtaLink({
  size = "default",
  className,
  location,
}: {
  size?: "default" | "lg";
  className?: string;
  location: "hero" | "banda" | "cierre";
}) {
  return (
    <Link
      href="/registro"
      data-analytics-event={`cta_click_${location}`}
      className={cn(
        "inline-flex items-center justify-center rounded-lg bg-primary px-6 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
        size === "lg" ? "h-12 text-base" : "h-11 text-base",
        className,
      )}
    >
      {CTA_TEXT}
    </Link>
  );
}
