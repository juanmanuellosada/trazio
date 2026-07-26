import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Estado vacío compartido por las cuatro vistas de fase 1 (bloque 8.6,
 * requirement "Estados vacíos con guía y acción"): nunca una pantalla en
 * blanco, siempre explica qué va a aparecer ahí. Tono de
 * `.claude/rules/copy.md` — directo y tranquilo, sin exclamaciones ni
 * emojis.
 */
export function TaskListEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <Icon aria-hidden className="size-8 text-text-secondary" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      {action}
    </div>
  );
}
