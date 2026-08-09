"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Iniciales a partir del nombre (o el correo si no hay nombre): hasta dos
 * palabras, la primera letra de cada una. Antes vivía solo en
 * `sidebar-content.tsx`; ahora la comparten las tres superficies que
 * muestran la cuenta (`foto-de-perfil-de-google`).
 */
export function getInitials(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

/**
 * Avatar de cuenta (`foto-de-perfil-de-google`, D-D/D-E): las iniciales son
 * el caso normal, no un estado de carga — quien se registró con correo y
 * contraseña no tiene foto y nunca la va a tener. El círculo con iniciales
 * se pinta siempre; la foto se superpone encima solo cuando hay
 * `avatarUrl` y termina de cargar sin error, nunca al revés.
 *
 * `<img>` simple, no `next/image` (D-D): `next.config.ts` no declara
 * `images.remotePatterns`, así que rechazaría el host de Google, y para
 * este tamaño el optimizador no aporta nada. `referrerPolicy="no-referrer"`
 * porque Google rechaza algunas peticiones según el referer. El respaldo a
 * iniciales ante un error de carga está cableado a mano con `onError`
 * (tarea 2.4): no alcanza con confiar en que el navegador muestre algo
 * razonable.
 */
export function AccountAvatar({
  avatarUrl,
  fullName,
  email,
  size = 32,
  className,
}: {
  avatarUrl: string | null;
  fullName: string | null;
  email: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = getInitials(fullName ?? email ?? "?");
  const showPhoto = !!avatarUrl && !failed;

  return (
    <span
      aria-hidden
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-primary-foreground",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initials}
      {showPhoto && (
        // eslint-disable-next-line @next/next/no-img-element -- D-D: next/image rechazaría el host de Google (sin images.remotePatterns) y no aporta nada para un avatar de este tamaño.
        <img
          src={avatarUrl}
          alt=""
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full rounded-full object-cover"
        />
      )}
    </span>
  );
}
