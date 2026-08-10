/**
 * "El problema" (`landing-para-la-vida-entera`): describe el estado sin
 * sistema único —tareas, hábitos y calendario en lugares que no se hablan
 * entre sí— sin nombrar todavía la solución: la muestran las tres secciones
 * que siguen ("Lo que tenés que hacer", "Lo que querés sostener", "Lo que ya
 * está agendado"). Server Component puro, sin imágenes.
 */
export function ProblemSection() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="problem-heading">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="problem-heading" className="text-landing-section font-semibold text-foreground">
          Tu día, repartido en tres lugares
        </h2>
        <p className="mt-4 text-lg text-text-secondary">
          Las tareas viven en una lista. Los hábitos, si los llevás en algún lado, viven en otra. Y lo
          que ya tenés agendado vive en el calendario, que casi nunca se abre cuando se arma la lista
          del día. Ninguna de las tres partes sabe de las otras dos, así que la única forma de saber si
          el día entra es hacerlo vos, a mano, cada vez.
        </p>
      </div>
    </section>
  );
}
