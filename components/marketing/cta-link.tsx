import Link from "next/link";
import { cn } from "@/lib/utils";

/** Texto único del CTA principal: hero y cierre lo repiten igual (bloque 12.2/12.8). */
export const CTA_TEXT = "Crear mi cuenta gratis";

/**
 * CTA principal de la landing. Server Component: el clic se cuenta como
 * evento de analítica sin sumar una isla cliente — ver `analytics-bridge.tsx`,
 * que delega clics de `data-analytics-event` con un `<script>` plano.
 */
export function CtaLink({ size = "default", className }: { size?: "default" | "lg"; className?: string }) {
  return (
    <Link
      href="/registro"
      data-analytics-event="cta_click"
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
