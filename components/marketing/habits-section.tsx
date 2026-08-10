/**
 * "Lo que querés sostener" (`landing-para-la-vida-entera`): un hábito no es
 * una tarea que se repite (no vence, no desaparece al completarse una vez),
 * y Trazio lleva la cuenta de racha, mejor racha y constancia. Server
 * Component puro, sin datos reales de hábitos — es copy, no una demo
 * funcional. Sin lenguaje motivacional: la racha se informa, no se arenga
 * (`.claude/rules/copy.md`).
 */
export function HabitsSection() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="habits-heading">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="habits-heading" className="text-landing-section font-semibold text-foreground">
          Lo que querés sostener, no solo lo que tenés que hacer
        </h2>
        <p className="mt-4 text-lg text-text-secondary">
          Un hábito no es una tarea que se repite: no vence, y no se completa una vez y desaparece.
          Elegís todos los días, cierta cantidad de veces por semana, o días puntuales, y Trazio lleva
          la cuenta: racha actual, mejor racha, y cuánto lo sostuviste en el último mes. Si un día no
          te da, lo salteás sin perder la racha.
        </p>
      </div>
    </section>
  );
}
