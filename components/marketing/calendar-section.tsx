import { CalendarDayPreview } from "./calendar-day-preview";

/**
 * "Lo que ya está agendado" (`landing-para-la-vida-entera`, D-DARK en
 * `design.md`): fondo oscuro **fijo**, sea cual sea el tema del sistema del
 * visitante — es una decisión de contenido (mostrar cómo se ve la app de
 * verdad), no una preferencia de tema. Por eso los colores de acá son
 * valores arbitrarios de Tailwind tomados literalmente de la paleta `.dark`
 * de `app/globals.css` (`--background: #0f172a`, `--surface: #1a2436`,
 * `--border: #2a3547`, `--text-primary: #f1f4f8`, `--text-secondary:
 * #94a3b8`), en vez de las utilidades semánticas (`bg-background`,
 * `text-foreground`) que sí cambian con `.dark`.
 *
 * **No "corregir" esto a `bg-background`/`text-foreground`**: el desacople
 * de la clase `.dark` del `<html>` es intencional, no un olvido. Son los
 * mismos pares hex ya auditados para contraste AA en tema oscuro — el
 * contraste no es una decisión nueva, se hereda.
 */
export function CalendarSection() {
  return (
    <section
      className="bg-[#0f172a] px-4 py-12 text-[#f1f4f8] sm:px-6 sm:py-16"
      aria-labelledby="calendar-heading"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="calendar-heading" className="text-landing-section font-semibold text-[#f1f4f8]">
          Lo que ya está agendado, al lado de todo lo demás
        </h2>
        <p className="mt-4 text-lg text-[#94a3b8]">
          Conectás tu Google Calendar una vez y tus reuniones, turnos y eventos aparecen en la misma
          grilla que tus tareas y tus hábitos, con su hora real. Arrastrás una tarea a un hueco libre y
          queda agendada ahí. Es el único lugar de la landing donde se ve el día completo: lo que tenés
          que hacer, lo que querés sostener y lo que ya no depende de vos, todo en la misma pantalla.
        </p>
      </div>
      <div className="mx-auto mt-10 max-w-3xl">
        <CalendarDayPreview />
      </div>
    </section>
  );
}
