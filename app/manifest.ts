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
    // Accesos directos al mantener apretado el ícono instalado (D-C de
    // `accesos-directos-y-compartir`): dos, no más — algunos sistemas
    // recortan la lista a cuatro sin avisar, y una lista larga acá es
    // ruido. Ninguno de los dos apunta a una pantalla nueva: "Hoy" ya
    // existe, y "Nueva tarea" abre el alta rápida global con el parámetro
    // `agregar` sobre la Bandeja (`ShortcutProvider` lo lee al montar) en
    // vez de inventar una ruta propia solo para el alta. Sin `icons`
    // propios: sin uno hecho a mano, el sistema usa el de la app.
    shortcuts: [
      { name: "Nueva tarea", url: "/bandeja?agregar=1" },
      { name: "Hoy", url: "/hoy" },
    ],
    // Destino de compartir (D-B): `GET`, no `POST`, porque no recibimos
    // archivos (Trazio no tiene adjuntos, decisión tomada) — con `GET` los
    // tres campos llegan en la URL y `app/compartir/route.ts` los lee sin
    // parsear un cuerpo. Ese mismo route.ts es el que combina `title`,
    // `text` y `url` de forma tolerante y redirige al alta rápida; acá solo
    // se declara el contrato.
    share_target: {
      action: "/compartir",
      method: "GET",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  };
}
