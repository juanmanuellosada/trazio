/**
 * "Lo que viene" (bloque 12.7): hoja de ruta explícita, no funcionalidad
 * presente. Incluye los atajos de teclado, que salieron de la grilla de
 * Funcionalidades porque son de fase 2.
 */
const ROADMAP_ITEMS = ["Hábitos con rachas", "Filtros guardados", "Recordatorios", "Google Calendar", "Atajos de teclado"];

export function RoadmapSection() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-semibold text-foreground">Lo que viene</h2>
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
