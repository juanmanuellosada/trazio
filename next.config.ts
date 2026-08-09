import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Los enlaces de correo de Supabase local (confirmación, reset de
  // contraseña) usan 127.0.0.1; sin esto, la protección de cross-origin
  // requests de Next en modo dev los rechaza.
  allowedDevOrigins: ["127.0.0.1"],

  // enlace-de-lectura-de-un-proyecto, D-C y D-D: el token de la vista
  // pública viaja en la URL, así que `Referrer-Policy: no-referrer` evita
  // que el navegador lo entregue como parte del `Referer` al tocar un
  // enlace de la descripción de una tarea (la otra mitad de D-C es
  // `rel="noopener noreferrer"` en esos enlaces, resuelta por defecto en
  // `components/tasks/description-editor/extensions.ts`). `X-Robots-Tag`
  // es la mitad "cabecera" de D-D — la mitad "meta" vive en
  // `app/enlace/[token]/page.tsx` (`generateMetadata`).
  async headers() {
    return [
      {
        source: "/enlace/:token*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
