import Image from "next/image";
import Link from "next/link";

/**
 * Pie mínimo (bloque 12.8): logo, año y links a términos/privacidad. Sin
 * mapa del sitio ni redes sociales. El año se calcula en build time (página
 * estática): se actualiza en cada deploy, no en cada request.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-sm text-text-secondary sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={20} height={20} />
          <span>Trazio © {year}</span>
        </div>
        <nav className="flex items-center gap-4" aria-label="Legal">
          <Link
            href="/terminos"
            className="rounded-md hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Términos
          </Link>
          <Link
            href="/privacidad"
            className="rounded-md hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Privacidad
          </Link>
        </nav>
      </div>
    </footer>
  );
}
