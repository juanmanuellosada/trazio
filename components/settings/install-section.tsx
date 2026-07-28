"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

function isIphoneSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIphone = /iPhone/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIphone && isSafari;
}

/**
 * Sección Instalación (tarea 11.6): cómo instalar Trazio como app desde el
 * navegador, con instrucciones específicas para iPhone porque Safari en iOS
 * no implementa `beforeinstallprompt` (el prompt automático que sí ofrecen
 * Chrome/Edge/Android) — ahí la única forma de instalar es el paso manual
 * del botón Compartir.
 *
 * La detección de plataforma corre en un efecto, no en el primer render:
 * el servidor no conoce el navegador, así que siempre asume "no es
 * iPhone" y el cliente corrige recién después de montar, sin divergir de
 * lo que ya pintó el servidor (evita un error de hidratación).
 */
export function InstallSection() {
  const [isIphone, setIsIphone] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // El servidor no conoce el navegador: el primer render siempre asume
    // "no es iPhone" y esto lo corrige después de montar (ver comentario
    // de la función, mismo patrón que `app-sidebar.tsx` con `localStorage`).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ver comentario de arriba
    setIsIphone(isIphoneSafari());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function handleInstallClick() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Instalación</h2>

      {isIphone ? (
        <ol className="list-decimal space-y-2 pl-5 text-sm text-text-secondary">
          <li>
            Tocá el botón Compartir <Share className="inline size-3.5 align-text-bottom" aria-hidden /> en la barra
            de Safari.
          </li>
          <li>Deslizá hacia abajo y elegí “Agregar a inicio”.</li>
          <li>Tocá “Agregar” arriba a la derecha.</li>
        </ol>
      ) : (
        <ol className="list-decimal space-y-2 pl-5 text-sm text-text-secondary">
          <li>Buscá el ícono de instalar en la barra de direcciones del navegador (o el menú de tres puntos).</li>
          <li>Elegí “Instalar Trazio” (o “Agregar a la pantalla de inicio” en Android).</li>
          <li>Confirmá la instalación.</li>
        </ol>
      )}

      {installPrompt ? (
        <Button type="button" onClick={handleInstallClick} className="gap-2">
          <Download className="size-4" aria-hidden />
          Instalar Trazio
        </Button>
      ) : null}
    </section>
  );
}
