import type { Metadata } from "next";
import { CalendarSection } from "@/components/marketing/calendar-section";
import { ClosingSection } from "@/components/marketing/closing-section";
import { CtaBand } from "@/components/marketing/cta-band";
import { DayFitsSection } from "@/components/marketing/day-fits-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { FreeSection } from "@/components/marketing/free-section";
import { HabitsSection } from "@/components/marketing/habits-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { ProblemSection } from "@/components/marketing/problem-section";
import { ProductNarrativeSection } from "@/components/marketing/product-narrative-section";
import { getSiteUrl } from "@/lib/site-url";

const TITLE = "Trazio — Tareas, hábitos y calendario en una sola pantalla";
const DESCRIPTION =
  "El gestor de tareas personal que junta lo que tenés que hacer, lo que querés sostener y lo que ya está agendado. En español, gratis y sin tarjeta.";

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
 * Landing pública (`landing-para-la-vida-entera`, ver `docs/landing.md`):
 * Server Components enteros salvo la demo del parser (`ParserDemo`, embebida
 * directo en `HeroSection`), la única isla cliente. Diez secciones, en el
 * orden en que responden lo que se pregunta un visitante: hero con la demo
 * interactiva desde el primer scroll → CTA (pico de intención, justo
 * después de jugar con la demo) → el problema sin sistema único → lo que
 * tenés que hacer (parser, galería de transformaciones y lenguaje de
 * consulta) → lo que querés sostener (hábitos) → lo que ya está agendado
 * (calendario, fondo oscuro fijo) → el día que entra → por qué es gratis →
 * preguntas directas → cierre.
 *
 * Header y footer viven en el layout del grupo, compartidos con
 * `/terminos` y `/privacidad`; el mismo layout monta `MobileStickyCta`
 * (visible solo en teléfono).
 *
 * El CTA principal (`CtaLink`, texto único) se repite en tres puntos del
 * flujo — hero, banda (`CtaBand`, sin titular propio, justo después del
 * hero) y cierre — más el CTA fijo de móvil, fuera del flujo. Es un solo
 * CTA distinto repetido, no varios CTA compitiendo — ver "Un solo CTA
 * principal" en `docs/landing.md`.
 */
export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <CtaBand />
      <ProblemSection />
      <ProductNarrativeSection />
      <HabitsSection />
      <CalendarSection />
      <DayFitsSection />
      <FreeSection />
      <FaqSection />
      <ClosingSection />
    </>
  );
}
