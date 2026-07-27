import Image from "next/image";
import Link from "next/link";

/**
 * Cabecera de la landing (bloque 12.2): sin menú de navegación que saque al
 * visitante afuera. Como mucho el logo y un "Iniciar sesión" discreto.
 */
export function SiteHeader() {
  return (
    <header className="flex items-center justify-between px-4 py-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Image src="/logo.png" alt="" width={28} height={28} />
        <span className="text-base font-semibold text-foreground">Trazio</span>
      </Link>
      <Link
        href="/login"
        className="rounded-md px-2 py-1 text-sm text-text-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Iniciar sesión
      </Link>
    </header>
  );
}
