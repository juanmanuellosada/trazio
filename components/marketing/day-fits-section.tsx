/**
 * "El día que entra" (`landing-para-la-vida-entera`): la resta entre lo
 * pedido y las horas que quedan. Solo copy y layout, sin componente de
 * datos — Server Component puro.
 *
 * Gate de publicación (D-GATE en `design.md`): esta sección se puede
 * escribir y mergear a `main` sin que `el-dia-que-entra` esté en producción
 * todavía, porque el contenido es estático. Lo que sí está bloqueado es el
 * **deploy a producción de la landing completa** hasta que esa función
 * exista de verdad — publicar antes prometería, en este texto, algo que
 * todavía no hace nada. Ver Impact en `proposal.md` y la tarea 14.5 de
 * `tasks.md`.
 */
export function DayFitsSection() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="day-fits-heading">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="day-fits-heading" className="text-landing-section font-semibold text-foreground">
          Y te dice si entra
        </h2>
        <p className="mt-4 text-lg text-text-secondary">
          Trazio resta lo que pediste contra las horas que te quedan en el día. Si sobra tiempo, lo
          ves. Si no entra, te avisa — sin números en rojo ni culpa, solo la cuenta hecha. Y si no
          sabés por dónde arrancar, &ldquo;¿Qué hago ahora?&rdquo; te propone una tarea que entra justo en el
          próximo hueco libre.
        </p>
      </div>
    </section>
  );
}
