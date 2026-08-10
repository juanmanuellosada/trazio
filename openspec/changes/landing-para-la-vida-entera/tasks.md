## 0. Gobernanza

- [x] 0.1 Confirmar con el dueño la decisión D-HERO de `design.md`
      (reubicar la galería de transformaciones dentro de "Lo que tenés que
      hacer" en vez de dejarla como sección propia) antes de tocar código —
      es la única interpretación no explícita del pedido original.
      Confirmada: el pedido de implementación lo pide explícito ("Lo que
      tenés que hacer — con la galería de transformaciones reubicada
      adentro, sin encabezado propio").
- [x] 0.2 Esta propuesta de OpenSpec (`proposal.md`, `design.md`,
      `tasks.md`, spec delta) — ya redactada, queda para revisión.

## 1. Hero fusionado con la demo

- [x] 1.1 `components/marketing/hero-section.tsx`: titular y subtítulo
      nuevos (texto exacto en `design.md`), embeber `ParserDemo` debajo del
      subtítulo, CTA + "Gratis. Sin tarjeta." debajo de la demo.
- [x] 1.2 Borrar `components/marketing/hero-parser-preview.tsx` (el campo
      congelado deja de usarse — la demo interactiva ocupa su lugar desde
      el primer render).
- [x] 1.3 Borrar `components/marketing/parser-demo-section.tsx` y su uso en
      `app/(marketing)/page.tsx` (el encabezado "Escribís como hablás" se
      elimina, no se reubica — el subtítulo del hero ya cubre esa idea).
- [x] 1.4 Confirmar que `components/marketing/parser-demo.tsx` no necesita
      cambios (sigue siendo la única isla cliente, mismo contrato).
- [x] 1.5 Verificar que no queda nada huérfano tras 1.2/1.3 (imports,
      estilos, tests de los componentes borrados). `HERO_TEXT`/
      `HERO_PARSE_RESULT` en `static-parses.ts` también se borraron (solo
      los usaba `HeroParserPreview`); sin tests dedicados a estos
      componentes.

## 2. El problema (nueva)

- [x] 2.1 `components/marketing/problem-section.tsx`: encabezado y cuerpo
      exactos de `design.md` §3. Server Component puro, sin imágenes.

## 3. Lo que tenés que hacer (reescritura)

- [x] 3.1 Reescribir `components/marketing/product-narrative-section.tsx`
      (o renombrarlo si el nombre deja de calzar): encabezado y primer
      cuerpo de `design.md` §4, sin el árbol de jerarquía HTML anidado que
      tiene hoy.
- [x] 3.2 Reubicar `TransformationsSection` dentro de esta sección: sacarle
      su `<section>`/encabezado propio (pasa a ser un bloque interno, ya
      tiene su propio H2 que hay que degradar o quitar) — depende de 0.1.
- [x] 3.3 Agregar el subencabezado y la galería de tres ejemplos de
      lenguaje de consulta (`design.md` §4, tabla de consultas) — mismo
      tratamiento visual que la galería del parser (consulta + significado),
      componente nuevo o extensión de `TransformationsSection` si el patrón
      es reutilizable sin acoplar lógica de parser.
- [x] 3.4 Actualizar `app/(marketing)/page.tsx`: sacar `<TransformationsSection />`
      como entrada propia de la lista de secciones.

## 4. Lo que querés sostener (nueva)

- [x] 4.1 `components/marketing/habits-section.tsx`: encabezado y cuerpo
      exactos de `design.md` §5. Server Component puro, sin datos reales de
      hábitos — es copy, no una demo funcional.

## 5. Lo que ya está agendado (nueva, fondo oscuro)

- [x] 5.1 `lib/landing/calendar-preview-data.ts`: 3-4 bloques hardcodeados
      (una tarea, un hábito, un evento de Google) para un día de ejemplo
      fijo, con horario, tipo y color — mismo patrón que
      `lib/landing/demo-context.ts` (D-CAL). Hecho en paralelo por otro
      agente sobre `el-dia-que-entra`; verificado acá que cumple el
      contrato (Server Component, sin `components/calendar/`).
- [x] 5.2 `components/marketing/calendar-day-preview.tsx`: Server Component
      puro, sin ningún import de `components/calendar/`. Ventana de 8:00 a
      20:00, forma por tipo reimplementada localmente (caja/píldora/barra
      lateral, D-CAL), colores reutilizados desde `lib/validation/colors.ts`
      (solo los valores hex, no componentes). Ídem 5.1.
- [x] 5.3 `components/marketing/calendar-section.tsx`: encabezado y cuerpo
      exactos de `design.md` §6, envuelve al preview con la sección de fondo
      oscuro fijo (D-DARK: colores arbitrarios hardcodeados, no
      `bg-background`/`.dark`), con el comentario explícito de por qué no
      usa las utilidades semánticas.
- [x] 5.4 Verificar contraste AA de la sección en los dos temas del sistema
      (visitante en claro, visitante en oscuro) — el fondo de la sección no
      cambia en ninguno de los dos casos. Verificado en el navegador con
      Playwright, tema claro y oscuro forzados — ver reporte final.

## 6. El día que entra (nueva)

- [x] 6.1 `components/marketing/day-fits-section.tsx`: encabezado y cuerpo
      exactos de `design.md` §7. Solo copy, sin componente de datos —
      Server Component puro.
- [x] 6.2 Dejar comentado en el componente el gate de D-GATE: esta sección
      puede mergearse a `main`, pero el deploy a producción de la landing
      espera a que `el-dia-que-entra` esté en producción.

## 7. Por qué es gratis (nueva)

- [x] 7.1 `components/marketing/free-section.tsx`: encabezado y cuerpo
      exactos de `design.md` §8. Server Component puro. Cuerpo corregido por
      el dueño respecto del texto original de `design.md` (matiz temporal) —
      ver D-GRATIS.

## 8. Preguntas directas (dos respuestas corregidas)

- [x] 8.1 `components/marketing/faq-section.tsx`: reemplazar las respuestas
      a "¿Puedo compartir un proyecto con alguien?" y "¿Puedo exportar mis
      tareas?" con el texto exacto de `design.md` §9. Las otras cuatro
      preguntas y respuestas quedan sin cambios.

## 9. CTA fijo en móvil (nueva)

- [x] 9.1 `components/marketing/mobile-sticky-cta.tsx`: `fixed inset-x-0
      bottom-0`, `sm:hidden`, `env(safe-area-inset-bottom)`, mismo
      `CtaLink`. Sin JavaScript (D-STICKY).
- [x] 9.2 Montarlo en `app/(marketing)/layout.tsx` o `page.tsx` — verificar
      que no tapa el CTA del cierre ni introduce un scroll horizontal.
      Montado en `layout.tsx` (aplica a las tres rutas del grupo);
      `SiteFooter` gana `pb-28` en móvil para reservar el espacio que tapa
      la barra fija. Verificado en el navegador — ver reporte final.

## 10. Reensamblado de la página

- [x] 10.1 `app/(marketing)/page.tsx`: orden final — Hero, CtaBand, El
      problema, Lo que tenés que hacer, Lo que querés sostener, Lo que ya
      está agendado, El día que entra, Por qué es gratis, Preguntas
      directas, Cierre.
- [x] 10.2 Actualizar el comentario de cabecera del archivo (describe hoy
      el esqueleto "El editor" viejo) para reflejar la estructura nueva.

## 11. Limpieza

- [x] 11.1 Borrar `components/marketing/legend-section.tsx` y su uso en
      `app/(marketing)/page.tsx`.
- [x] 11.2 Borrar `public/landing/` completo (7 imágenes + `README.md`) —
      confirmado sin referencias en el código antes de este change.
- [x] 11.3 Borrar `scripts/seed-landing-demo.mjs` y
      `scripts/capture-landing-screenshots.mjs` (huérfanos de 11.2).
- [x] 11.4 Quitar la entrada `"landing:screenshots"` de `package.json`.
- [x] 11.5 Confirmar que no queda nada huérfano de las tareas 1-3 y 11.1
      (imports sin usar, datos en `lib/landing/` que solo usara una sección
      eliminada, estilos muertos en `app/globals.css` si alguno era
      exclusivo de la leyenda o el árbol). Sin estilos muertos (leyenda y
      árbol usaban solo utilidades de Tailwind). Comentarios que
      mencionaban los scripts/archivos borrados (`seed-production-demo.mjs`,
      `lib/landing/demo-context.ts`) actualizados.

## 12. Documentación

- [x] 12.1 Reescribir la sección "Estructura" de `docs/landing.md` (§1 a
      §10 actuales quedan obsoletas) con la estructura nueva de diez
      secciones.
- [x] 12.2 Corregir la nota de la línea ~107 de `docs/landing.md` ("como lo
      que viene, no como lo que hay... recién existe en fase 3-4") — con
      las cuatro fases en producción, la nota queda al revés.
- [x] 12.3 Actualizar la sección "Precio" de `docs/landing.md` con la
      decisión D-GRATIS (dónde entraría una sección de precio el día que
      exista).
- [x] 12.4 Actualizar "Sistema gráfico" de `docs/landing.md` para incluir el
      preview de calendario (D-CAL) y la sección oscura (D-DARK) como
      recursos gráficos nuevos, en la misma lógica de "cero imágenes" que ya
      describe la sección.

## 13. Spec

- [ ] 13.1 Aplicar el delta de `specs/landing-publica/spec.md` de este
      change al archivar — repone al día los requirements que estaban
      desactualizados desde antes de este change (ver "Nota sobre el spec
      vigente" en `proposal.md`) además de agregar los nuevos.
- [x] 13.2 Correr `openspec validate --changes --strict`. Pasa: 3/3 changes,
      0 errores.

## 14. Cierre

- [x] 14.1 `pnpm lint && pnpm typecheck && pnpm test` en verde. Lint y
      typecheck completos en verde; `test` corrido solo sobre
      `components/marketing` y `lib/landing` (los archivos de este change) —
      el gate completo lo corre el orquestador al final, con otro trabajo en
      curso en paralelo.
- [x] 14.2 Verificar en el navegador, en tema claro y en tema oscuro: la
      sección "Lo que ya está agendado" se ve oscura en los dos casos, sin
      perder contraste. Ver reporte final.
- [x] 14.3 Verificar en viewport de teléfono: CTA fijo alcanzable con el
      pulgar, no tapa contenido ni el CTA del cierre. Ver reporte final.
- [ ] 14.4 Lighthouse ≥ 90 en rendimiento y accesibilidad sobre el deploy de
      preview (G5, ya cubierto por CI) — corre en CI sobre el deploy de
      preview, no en esta verificación local.
- [ ] 14.5 **Gate de publicación (D-GATE):** confirmar que `el-dia-que-entra`
      está en producción antes de desplegar este change a producción. El
      merge a `main` no espera; el deploy a producción sí.
- [ ] 14.6 Archivar el change con `/opsx:archive landing-para-la-vida-entera`.
