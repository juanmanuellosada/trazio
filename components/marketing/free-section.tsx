/**
 * "Por qué es gratis" (`landing-para-la-vida-entera`): la landing repetía
 * "gratis, sin tarjeta" sin decir por qué, que es justo lo que genera la
 * duda. Server Component puro.
 *
 * El cuerpo lleva el matiz temporal pedido por el dueño después de revisar
 * el texto original de `design.md` §8 (ver D-GRATIS ahí para el detalle):
 * la primera versión afirmaba, sin matiz, que no existe una versión
 * recortada atrás de un botón de pago — cierto hoy, pero falso el día que
 * exista un plan pago, y esa frase quedaría mintiendo. La segunda oración
 * de acá aclara que el estado de hoy no es una promesa eterna, sin insinuar
 * un cobro que todavía no está definido — ni amenaza, ni venta.
 */
export function FreeSection() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="free-heading">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="free-heading" className="text-landing-section font-semibold text-foreground">
          Por qué es gratis
        </h2>
        <p className="mt-4 text-lg text-text-secondary">
          No hay anuncios, no vendemos tus datos, y hoy usás la app completa, sin tarjeta y sin nada
          guardado atrás de un pago. Que sea así hoy no es una promesa de que lo va a ser para siempre,
          ni un indicio de que algo esté por cambiar. Gratis, sin tarjeta, sin período de prueba que se
          vence.
        </p>
      </div>
    </section>
  );
}
