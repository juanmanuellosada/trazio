/**
 * Delega clics de elementos `data-analytics-event` al evento personalizado
 * de Vercel Analytics (`window.va`, inyectado por `<Analytics />` en el
 * layout). Es un `<script>` plano sin `'use client'`: no abre un boundary
 * de React, así que no cuenta como isla cliente (G1, bloque 12.13) — la
 * única isla cliente de la landing sigue siendo la demo del parser.
 */
export function AnalyticsBridge() {
  return (
    <script
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
