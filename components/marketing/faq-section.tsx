type Faq = { question: string; answer: string };

/**
 * Preguntas directas (bloque 12.6, rediseño "El editor"): estilo Basecamp.
 * Trazio todavía no tiene usuarios reales que generen estas preguntas, pero
 * alguien evaluando una app sin usuarios las va a tener igual — contestarlas
 * de frente es mejor que dejar que las adivine. Cada respuesta sale de
 * `docs/product-spec.md` §13 o `docs/decisions.md`; no son concesiones de
 * copy, son restricciones reales del producto.
 */
const FAQS: Faq[] = [
  {
    question: "¿Funciona sin internet?",
    answer: "No. Trazio es 100% online: sin conexión no podés crear ni editar tareas, y la app te lo avisa en vez de fingir que guardó algo que no guardó.",
  },
  {
    question: "¿Puedo compartir un proyecto con alguien?",
    answer: "No. Trazio es personal: una cuenta, una persona. No hay equipos, invitaciones ni tareas asignadas a otro.",
  },
  {
    question: "¿Hay una app en Google Play o el App Store?",
    answer: "Todavía no. Se instala directo desde el navegador, como cualquier PWA — con ícono, pantalla completa y notificaciones.",
  },
  {
    question: "¿Puedo exportar mis tareas?",
    answer: "No, en ninguna versión. Lo que cargás en Trazio se queda en Trazio.",
  },
  {
    question: "¿Trazio tiene versión en inglés?",
    answer: "No. Es una app en español, pensada para Argentina, y no hay planes de traducirla.",
  },
  {
    question: "¿Cuánto cuesta usar Trazio?",
    answer: "Nada. Es gratis, sin tarjeta.",
  },
];

export function FaqSection() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-2xl">
        <h2 id="faq-heading" className="text-landing-section text-center font-semibold text-foreground">
          Preguntas directas
        </h2>
        <dl className="mt-10 space-y-6">
          {FAQS.map((faq) => (
            <div key={faq.question} className="border-b border-border pb-6 last:border-b-0 last:pb-0">
              <dt className="text-base font-semibold text-foreground">{faq.question}</dt>
              <dd className="mt-1.5 text-text-secondary">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
