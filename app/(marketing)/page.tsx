import type { Metadata } from "next";
import { ClosingSection } from "@/components/marketing/closing-section";
import { CtaBand } from "@/components/marketing/cta-band";
import { FaqSection } from "@/components/marketing/faq-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { LegendSection } from "@/components/marketing/legend-section";
import { ParserDemoSection } from "@/components/marketing/parser-demo-section";
import { ProductNarrativeSection } from "@/components/marketing/product-narrative-section";
import { RoadmapSection } from "@/components/marketing/roadmap-section";
import { TransformationsSection } from "@/components/marketing/transformations-section";
import { getSiteUrl } from "@/lib/site-url";

const TITLE = "Trazio — Gestor de tareas personal para tu día entero";
const DESCRIPTION =
  "Escribí lo que tenés que hacer como se lo dirías a alguien. Trazio entiende la fecha, la hora y la prioridad solo. Gestor de tareas personal, gratis y sin tarjeta.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "Trazio",
    locale: "es_AR",
    type: "website",
    // La imagen sale de `opengraph-image.tsx` (convención de archivo de
    // Next.js, mismo grupo de rutas): no se referencia acá para no pisarla.
  },
};

/**
 * Landing pública (bloque 12, rediseño "El editor" — ver `docs/landing.md`):
 * Server Components enteros salvo la demo del parser (`ParserDemoSection` →
 * `ParserDemo`), la única isla cliente. El parser deja de ser una sección
 * más y pasa a ser el esqueleto de la página: hero congelado → demo
 * interactiva → leyenda de sintaxis → galería de transformaciones (que
 * reemplaza a la vieja grilla de seis funcionalidades) → el resto del
 * producto en una narrativa → preguntas directas → hoja de ruta → cierre.
 * Header y footer viven en el layout del grupo, compartidos con
 * `/terminos` y `/privacidad`.
 *
 * El CTA principal (`CtaLink`, texto único) se repite tres veces con el
 * mismo texto y el mismo destino: hero, después de la galería de
 * transformaciones (`CtaBand`, sin titular propio, en el punto más alto de
 * la página) y cierre. Es un solo CTA distinto repetido, no varios CTA
 * compitiendo — ver "Un solo CTA principal" en `docs/landing.md`.
 */
export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ParserDemoSection />
      <LegendSection />
      <TransformationsSection />
      <CtaBand />
      <ProductNarrativeSection />
      <FaqSection />
      <RoadmapSection />
      <ClosingSection />
    </>
  );
}
