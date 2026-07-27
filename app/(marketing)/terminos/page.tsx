import type { Metadata } from "next";
import { LegalPageShell } from "@/components/marketing/legal-page-shell";

export const metadata: Metadata = {
  title: "Términos de servicio — Trazio",
  description: "Qué es Trazio, que el servicio es gratuito y los límites de responsabilidad del producto.",
};

/**
 * Bloque 12.9 / decisión D20: texto tomado literal de `docs/legales.md`
 * ("## Términos de servicio"). No se redacta contenido legal nuevo acá —
 * ver `LegalDraftNotice` para el aviso de que falta aprobación del dueño.
 */
export default function TerminosPage() {
  return (
    <LegalPageShell title="Términos de servicio">
      <h2>Qué es Trazio</h2>
      <p>
        Trazio es un gestor de tareas personal. Cada cuenta es de una sola persona: no hay equipos, no
        hay forma de compartir un proyecto ni de asignarle una tarea a otra persona. Lo que ves en tu
        cuenta es tuyo y solo tuyo.
      </p>

      <h2>El servicio es gratuito</h2>
      <p>
        Hoy Trazio no tiene plan pago ni versión paga. Usarlo no cuesta nada. Esto puede cambiar en el
        futuro, pero mientras no haya un modelo de precios definido, no corresponde decir nada más
        específico que esto: es gratis, sin condiciones ocultas y sin fecha de vencimiento anunciada.
      </p>

      <h2>Necesitás conexión a internet</h2>
      <p>
        Trazio funciona enteramente online. No hay una versión que guarde cambios sin conexión para
        sincronizarlos después: si no tenés internet, la app te lo dice y no te deja escribir. No es una
        limitación temporal — es como está construida a propósito, para no arriesgarse a perder algo
        que escribiste offline y que nunca llegó a guardarse.
      </p>

      <h2>El contenido es tuyo</h2>
      <p>
        Los proyectos, tareas, descripciones y etiquetas que creás en Trazio son tuyos. Los usamos
        únicamente para darte el servicio: mostrártelos, ordenarlos, avisarte cuando corresponda. No los
        usamos para nada más.
      </p>

      <h2>Límites de responsabilidad</h2>
      <p>Antes de volcar ahí algo importante, conviene que sepas esto:</p>
      <ul>
        <li>
          <strong>Es un producto joven.</strong> Puede tener errores, cambios de comportamiento entre
          versiones, y funcionalidad que todavía no existe.
        </li>
        <li>
          <strong>No garantizamos disponibilidad continua.</strong> Puede haber cortes, mantenimiento o
          interrupciones, sobre todo en esta etapa.
        </li>
        <li>
          <strong>No hay forma de exportar tus datos.</strong> Si en algún momento querés dejar de usar
          Trazio, hoy no existe un botón que te dé una copia de lo que cargaste. Es una decisión tomada
          (no un olvido) y la explicamos con más detalle en la política de privacidad.
        </li>
      </ul>
      <p>
        Nada de esto es una forma elegante de decir que no nos importa: es preferible que lo sepas antes
        de depender de la app para algo crítico, y no después.
      </p>
    </LegalPageShell>
  );
}
