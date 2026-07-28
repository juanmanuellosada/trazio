import Script from "next/script";

/**
 * Delega clics de elementos `data-analytics-event` al evento personalizado
 * de Vercel Analytics (`window.va`, inyectado por `<Analytics />` en el
 * layout). Usa `next/script` — el mecanismo de Next.js para inyectar scripts
 * de terceros dentro de Server Components sin `'use client'` ni boundary de
 * React — así que no cuenta como isla cliente (G1, bloque 12.13): la única
 * isla cliente de la landing sigue siendo la demo del parser.
 */
export function AnalyticsBridge() {
  return (
    <Script
      id="analytics-bridge"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html:
          'document.addEventListener("click",function(e){' +
          'var el=e.target.closest("[data-analytics-event]");' +
          "if(!el)return;" +
          'if(window.va)window.va("event",{name:el.getAttribute("data-analytics-event")});' +
          "});",
      }}
    />
  );
}
