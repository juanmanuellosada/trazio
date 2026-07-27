import type { Metadata } from "next";
import { ClosingSection } from "@/components/marketing/closing-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { ParserDemoSection } from "@/components/marketing/parser-demo-section";
import { ProblemSection } from "@/components/marketing/problem-section";
import { RoadmapSection } from "@/components/marketing/roadmap-section";
import { getSiteUrl } from "@/lib/site-url";

const TITLE = "Trazio — Tu día entero, en una sola pantalla";
const DESCRIPTION =
  "Escribí lo que tenés que hacer como se lo dirías a alguien. Trazio entiende la fecha, la hora y la prioridad solo. Gratis, sin tarjeta.";

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
    images: [
      {
        url: "/landing/today-hero.webp",
        width: 2880,
        height: 1800,
        alt: "La vista Hoy de Trazio",
      },
    ],
  },
};

/**
 * Landing pública (bloque 12): Server Components enteros salvo la demo del
 * parser (`ParserDemoSection` → `ParserDemo`), la única isla cliente. Las
 * siete secciones van en el orden de `docs/landing.md`; header y footer
 * viven en el layout del grupo, compartidos con `/terminos` y `/privacidad`.
 */
export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ParserDemoSection />
      <ProblemSection />
      <FeaturesSection />
      <RoadmapSection />
      <ClosingSection />
    </>
  );
}
