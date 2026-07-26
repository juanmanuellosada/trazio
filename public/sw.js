// Service worker mínimo, solo para instalabilidad.
//
// AGENTS.md dice "service worker solo para push", y push es de fase 2. Pero
// los navegadores basados en Chromium exigen un service worker registrado
// para ofrecer la instalación de la PWA, que es criterio de aceptación de
// fase 1 (ver bloque 13 de openspec/changes/fase-1-base-usable/tasks.md y
// sección H1 del design). Por eso este archivo existe ya en fase 1, aunque
// todavía no maneje push.
//
// A propósito NO define un manejador de `fetch` ni usa la Cache API: Trazio
// es 100% online, sin modo offline, sin caché de datos y sin cola de
// mutaciones (docs/decisions.md D1). Un manejador de `fetch` que sirva algo
// desde caché violaría esa decisión, así que no se agrega ninguno, ni acá ni
// en fase 2.
//
// En fase 2 este mismo archivo suma el manejador de `push` para las
// notificaciones, y nada más.
