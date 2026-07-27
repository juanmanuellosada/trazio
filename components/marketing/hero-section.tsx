import Image from "next/image";
import { CtaLink } from "./cta-link";

/**
 * Hero (bloque 12.2): titular orientado al resultado, subtítulo de una
 * línea, un solo CTA y la captura real de la vista Hoy con prioridad de
 * carga — es el elemento de LCP de la página (requisito de <2.5s).
 */
export function HeroSection() {
  return (
    <section className="px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-20">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="space-y-6 text-center lg:text-left">
          <h1 className="text-3xl font-bold text-balance text-foreground sm:text-4xl">
            Tu día entero, en una sola pantalla.
          </h1>
          <p className="text-lg text-text-secondary">
            Escribí lo que tenés que hacer como se lo dirías a alguien. Trazio entiende la fecha, la
            hora y la prioridad solo.
          </p>
          <div className="flex flex-col items-center gap-2 lg:items-start">
            <CtaLink size="lg" />
            <p className="text-sm text-text-secondary">Gratis. Sin tarjeta.</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border shadow-sm">
          <Image
            src="/landing/today-hero.webp"
            alt="La vista Hoy de Trazio, con las tareas atrasadas destacadas arriba y las de hoy debajo"
            width={1440}
            height={900}
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
