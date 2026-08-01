/**
 * "Seguimos sumando funciones" (bloque 12.7): hoja de ruta explícita, no
 * funcionalidad presente. Incluye los atajos de teclado, que salieron de la
 * grilla de Funcionalidades porque son de fase 2. Google Calendar sale de
 * acá en la fase 4 (bloque 7.9): ya está en la app, no es más "lo próximo".
 */
const ROADMAP_ITEMS = ["Hábitos con rachas", "Filtros guardados", "Recordatorios", "Atajos de teclado"];

export function RoadmapSection() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-landing-section font-semibold text-foreground">Seguimos sumando funciones</h2>
        <p className="mt-2 text-text-secondary">Todavía no está en la app. Es lo próximo en la hoja de ruta.</p>
        <ul className="mt-6 flex flex-wrap justify-center gap-3">
          {ROADMAP_ITEMS.map((item) => (
            <li key={item} className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-text-secondary">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
