"use client";

import type { ReactNode } from "react";
import { useConnectivity } from "./realtime-provider";

/**
 * 10.6: mientras la app está sin conexión, todo el contenido de acá adentro
 * queda `inert` (atributo nativo del DOM: sin foco, sin clicks, sin
 * escritura en campos) en vez de enhebrar un prop `disabled` por cada botón
 * e input de la app. `OfflineBanner` vive afuera de este límite.
 */
export function OfflineBoundary({ children }: { children: ReactNode }) {
  const { isOffline } = useConnectivity();
  return <div inert={isOffline}>{children}</div>;
}
