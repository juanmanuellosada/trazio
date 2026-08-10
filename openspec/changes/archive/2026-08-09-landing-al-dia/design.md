## Context

Dos deudas de la landing, previas a un rediseño que viene después:

1. `components/marketing/roadmap-section.tsx` presenta como "lo que viene"
   cuatro funciones ya construidas y en producción (verificado leyendo
   `app/(app)/habitos/`, `app/(app)/filtros/`, `components/reminders/` y
   `components/shortcuts/`: las cuatro tienen lógica real, no stubs — rachas
   calculadas por RPC de Postgres, CRUD completo de filtros contra la tabla
   `filters`, un picker de recordatorios usado en tareas y hábitos, y un
   `ShortcutProvider` montado en `app/(app)/layout.tsx` con tests propios).
2. Los tres CTA de la landing (hero, banda, cierre) disparan el mismo evento
   `cta_click` sin ubicación, así que no se puede saber cuál convierte mejor.

## Goals / Non-Goals

**Goals:**
- Que la landing deje de subestimar el producto.
- Que `docs/landing.md` y `openspec/specs/landing-publica/spec.md` describan
  lo que existe, no lo que existía antes.
- Poder distinguir qué CTA (hero, banda o cierre) generó un clic.

**Non-Goals:**
- No se toca el FAQ (dos respuestas desactualizadas quedan para el rediseño).
- No se agrega medición nueva del embudo de registro: ver la decisión de
  privacidad más abajo.
- No se mide nada más allá de lo que ya autoriza la política de privacidad.

## Decisiones de privacidad (tarea 2a)

**Hallazgo primero: el evento de registro completado ya existe.** Antes de
diseñar nada, se leyó `app/(marketing)/privacidad/page.tsx` completo,
`docs/product-spec.md` y `docs/decisions.md`. Al revisar el código real del
flujo de registro se encontró que `app/(auth)/registro/page.tsx` ya monta su
propia instancia de `<Analytics />` (no en un layout compartido de
`(auth)`), y que `app/(auth)/registro/registro-form.tsx` ya llama a
`track("registro_completado")` al confirmar el alta, antes de la navegación
cliente (`router.push`) que sigue. Es decir: la parte de la tarea 2b que pedía
"medir el registro completado" ya estaba implementada — este change no la
duplica, solo la deja documentada como decisión ya tomada y ya conforme a la
política.

**Por qué está permitido.** La política de privacidad tiene una sección
dedicada a esto, cuya cita textual es:

> "La página pública de Trazio (la que ves antes de crear una cuenta) mide
> cuatro cosas, y nada más: visitas a la página, clics en el botón principal,
> interacciones con la demo del parser, y cuántos registros se completan.
> Esto sirve para saber si la landing funciona, no para conocerte a vos. Es
> información agregada de la página pública y no tiene relación con lo que
> hacés dentro de la app una vez que tenés cuenta."
> — `app/(marketing)/privacidad/page.tsx`

Y la prohibición que sí existe está acotada de otra forma:

> "No hay analítica de comportamiento dentro de la app. No medimos qué
> pantallas visitás, cuánto tiempo pasás en cada una, ni con qué frecuencia
> usás cada función."
> — `app/(marketing)/privacidad/page.tsx`

La línea que traza la política no es "ruta `(marketing)` vs. ruta `(auth)`":
es "antes de tener cuenta" vs. "dentro de la app, una vez que tenés cuenta".
`/registro` es, por definición, previo a tener cuenta — y el evento
`registros completados` está nombrado explícitamente entre las cuatro cosas
permitidas. Por eso medir que el registro se completó no viola la política;
violarla sería, por ejemplo, medir tiempo en pantalla, qué campos completa el
usuario, o cualquier cosa dentro de `login`, `recuperar-contrasena` o
`restablecer-contrasena` — pantallas que la política no menciona y que además
son las más sensibles (contraseñas).

**Qué queda explícitamente fuera de medición, para que nadie lo agregue
"porque ya hay":**
- Nada en `login/`, `recuperar-contrasena/` ni `restablecer-contrasena/`.
  `app/(auth)/` no tiene un `layout.tsx` compartido a propósito: si existiera,
  montar `<Analytics />` ahí mediría esas tres pantallas sin que la política
  lo autorice. `<Analytics />` sigue montado únicamente en
  `registro/page.tsx`, página por página, no a nivel de grupo de rutas.
- Tiempo en pantalla, scroll, campos del formulario, el correo ingresado: la
  política dice "cuatro cosas, y nada más".
- Cualquier evento nuevo que no sea una de esas cuatro cosas. Distinguir el
  CTA por ubicación (`hero`/`banda`/`cierre`) no es una métrica nueva: sigue
  siendo "clics en el botón principal", solo que ahora se puede saber cuál de
  los tres botones fue.

## Decisiones de implementación

### D-A — Ubicación del CTA como parte del nombre del evento, no como propiedad

`components/marketing/analytics-bridge.tsx` es un `<script>` plano (vía
`next/script`, sin `'use client'`) que delega clics de `[data-analytics-event]`
a `window.va("event", { name })`. Hoy no reenvía propiedades adicionales.

Alternativas consideradas:
- (a) Agregar un segundo atributo `data-analytics-location` y extender el
  script del bridge para leerlo y pasarlo como `data: { location }` en la
  llamada a `window.va`.
- (b) Que `CtaLink` reciba una prop `location` y arme el propio
  `data-analytics-event` como `cta_click_hero` / `cta_click_banda` /
  `cta_click_cierre` (tres eventos en vez de uno con propiedad).

Se elige (b): no toca `analytics-bridge.tsx`, que es el componente más
sensible de auditar (es el único lugar que le habla a `window.va`), así que
el diff es exclusivamente `cta-link.tsx` (nueva prop requerida) y los tres
call sites (hero, banda, cierre) pasándola. Menos superficie de cambio para
el mismo resultado: se sigue pudiendo saber, agregado, cuántos clics tuvo
cada ubicación.

## Risks / Trade-offs

- [Fragmentar `cta_click` en tres nombres de evento distintos] → si en algún
  reporte se suma "clics en el CTA" como un solo número, hay que sumar los
  tres eventos. Se acepta porque el bridge no cambia y el número total sigue
  siendo trivial de calcular sumando los tres.
- [El hallazgo de que `registro_completado` ya existe cambia el alcance de la
  tarea 2b] → se deja documentado acá explícitamente para que quede registro
  de que no es una omisión, sino una verificación que evitó duplicar trabajo
  ya hecho y ya conforme a la política.
