import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { AnalyticsBridge } from "@/components/marketing/analytics-bridge";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { getSiteUrl } from "@/lib/site-url";

/**
 * `metadataBase` vive acá, no en cada `page.tsx`, porque `/terminos` y
 * `/privacidad` heredan el `opengraph-image.tsx` de este mismo grupo de
 * rutas: sin una base, Next no puede armar la URL absoluta de esa imagen y
 * el build tira warning ("metadataBase property... is not set").
 */
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
};

/**
 * `<Analytics />` se monta acá y no en el layout raíz (bloque 12.12): la
 * política de privacidad de la landing (`docs/legales.md`) promete que no
 * hay analítica de comportamiento dentro de la app, así que el script solo
 * carga en las rutas públicas de `app/(marketing)/`. `AnalyticsBridge` es
 * un `<script>` plano (sin `'use client'`) que traduce clics con
 * `data-analytics-event` en eventos personalizados — la demo del parser
 * sigue siendo la única isla cliente real de la landing (G1).
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RegisterServiceWorker />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <AnalyticsBridge />
      <Analytics />
    </>
  );
}
