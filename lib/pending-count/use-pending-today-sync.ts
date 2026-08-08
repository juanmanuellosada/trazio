"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { usePendingTodayCount } from "./pending-today-count";
import { applyPendingCountToTitle } from "./pending-today-title";

/**
 * Sincroniza las dos superficies del mismo número de pendientes de hoy
 * (spec "Badge del ícono con los pendientes del día" y "El título del
 * documento lleva la cantidad de pendientes", cambio
 * `pendientes-en-el-icono-y-el-titulo`): el badge del ícono de la
 * aplicación (bloque 4.16) y `document.title`. El título es la única de
 * las dos que funciona en Linux —el badge existe en Chromium pero el
 * sistema no lo pinta ahí—, así que es la superficie que de verdad importa
 * en la máquina de quien más usa la app.
 */
export function usePendingTodaySync(): void {
  const count = usePendingTodayCount();
  const pathname = usePathname();

  useEffect(() => {
    if (!("setAppBadge" in navigator) || count === undefined) return;
    if (count > 0) {
      void navigator.setAppBadge(count).catch(() => {});
    } else {
      void navigator.clearAppBadge?.().catch(() => {});
    }
  }, [count]);

  useEffect(() => {
    if (count === undefined) return;
    // `pathname` en las dependencias a propósito (D-B, `design.md` del
    // cambio): el `metadata` del App Router reescribe `document.title` en
    // cada navegación y se lleva puesto el número — este efecto corre de
    // nuevo después de cada cambio de ruta para reaplicarlo, no solo al
    // montar.
    document.title = applyPendingCountToTitle(document.title, count);
  }, [count, pathname]);
}
