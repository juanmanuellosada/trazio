"use client";

import { useEffect } from "react";

/**
 * Registra el service worker de instalabilidad (`public/sw.js`) desde el
 * cliente, después de la hidratación. No lee nada del servidor ni bloquea el
 * primer pintado, así que no afecta el renderizado estático de la página que
 * la monta.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return null;
}
