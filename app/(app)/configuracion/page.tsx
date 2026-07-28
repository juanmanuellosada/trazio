"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/components/settings/settings-context";

/**
 * Compatibilidad con enlaces existentes a `/configuracion` (bloque 9.2): la
 * configuración pasó a ser un modal (`SettingsModal`, montado una sola vez
 * en `app/(app)/layout.tsx`) en vez de una pantalla propia — spec de
 * `configuracion`, "abre como una capa superpuesta, no como una pantalla
 * nueva". Esta ruta ya no tiene contenido propio: abre el modal y vuelve a
 * la bandeja, para que un enlace o marcador viejo a esta URL no quede roto
 * en vez de simplemente desaparecer.
 *
 * El efecto que abre el modal y redirige corre recién después del primer
 * pintado: por un instante no hay nada más que el layout alrededor de un
 * `<main>` vacío. "Cargando…" en vez de `null` evita que ese instante se
 * vea como una pantalla en blanco (mismo texto que ya usa `SettingsModal`
 * mientras trae los datos).
 */
export default function ConfiguracionPage() {
  const router = useRouter();
  const { open } = useSettings();

  useEffect(() => {
    open();
    router.replace("/bandeja");
  }, [open, router]);

  return <p className="p-6 text-sm text-text-secondary">Cargando…</p>;
}
