import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // El `id` identifica la app instalada ante el navegador y, por el spec
    // de Web App Manifest, tiene que quedarse estable aunque `start_url`
    // cambie más adelante (un rediseño, por ejemplo) — si no, quien ya la
    // instaló pierde el ícono o termina con una entrada duplicada. Se deja
    // fijo en "/" y a propósito desacoplado de `start_url`.
    id: "/",
    name: "Trazio",
    short_name: "Trazio",
    description: "Gestor de tareas personal",
    lang: "es-AR",
    // NO puede ser "/": ahí vive la landing de marketing
    // (`app/(marketing)/page.tsx`), así que quien instalaba la PWA y abría
    // el ícono se encontraba siempre con "Creá tu cuenta gratis" en vez de
    // sus tareas. `/entrar` (`app/entrar/route.ts`) resuelve el destino real
    // según sesión y preferencia — ver el comentario de esa ruta.
    start_url: "/entrar",
    // Se mantiene en "/" a propósito: cerrar sesión navega a "/" (la
    // landing, mismo origen — `components/auth/logout-button.tsx`), y ese
    // salto tiene que quedarse dentro de la ventana instalada en vez de
    // expulsar a la persona al navegador normal, que es lo que pasa al
    // navegar fuera del `scope` declarado.
    scope: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#283B56",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
