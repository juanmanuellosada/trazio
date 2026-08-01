"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ShortcutCombo } from "@/lib/shortcuts/types";
import { cn } from "@/lib/utils";
import { ShortcutHint } from "@/components/shortcuts/shortcut-hint";

/**
 * Fila de navegación compartida por el panel lateral y la hoja móvil
 * (bloque 5.3): ícono + etiqueta + contador opcional, colapsable a solo
 * ícono con tooltip. El estado activo compara contra la ruta actual.
 *
 * `shortcut` (bloque 2, capacidad `indicadores-de-atajo`) dibuja el
 * indicador del atajo de este acceso, cuando tiene uno, junto al contador —
 * solo en la versión expandida, igual criterio que ya usa `count` acá
 * abajo, y solo desde `md` (`ShortcutHint` lo oculta por debajo).
 */
export function NavLink({
  href,
  label,
  icon: Icon,
  collapsed = false,
  count,
  shortcut,
  shortcutHiddenOn,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  collapsed?: boolean;
  count?: number;
  shortcut?: ShortcutCombo | [ShortcutCombo, ShortcutCombo];
  /** Rutas donde este atajo no dispara de verdad (otro handler lo gana ahí) y por eso el indicador no debe dibujarse — un indicador que miente es peor que no tenerlo. */
  shortcutHiddenOn?: string[];
}) {
  const pathname = usePathname();
  const active = pathname === href;
  const showShortcut = shortcut && !shortcutHiddenOn?.includes(pathname ?? "");

  const link = (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-10 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-surface text-primary"
          : "text-text-secondary hover:bg-surface hover:text-foreground",
        collapsed && "w-9 justify-center px-0",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!collapsed && showShortcut && <ShortcutHint combo={shortcut} />}
      {!collapsed && count != null && count > 0 && (
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium tabular-nums text-primary">
          {count}
        </span>
      )}
      {collapsed && count != null && count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );

  if (!collapsed) {
    return link;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
