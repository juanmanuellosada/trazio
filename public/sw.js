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
// En fase 2 este mismo archivo suma el manejador de `push` y el de
// `notificationclick` (bloque 4.7) — nada más, ni un manejador de `fetch`
// ni Cache API, para no reabrir D1.

// El payload lo arma la edge function `supabase/functions/enviar-recordatorios/`:
// `{ title, taskId }`. `title` es el título de la tarea, sin marcado — se
// pasa tal cual a `showNotification`, que siempre lo muestra como texto
// plano (D2): la API de notificaciones no interpreta HTML.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const title = String(payload.title ?? "");
  event.waitUntil(
    self.registration.showNotification(title, {
      data: { taskId: payload.taskId ?? null },
    }),
  );
});

// Tocar la notificación abre el detalle de esa tarea (spec "Entrega de la
// notificación push"): si ya hay una pestaña de Trazio abierta, la enfoca
// y navega ahí; si no, abre una nueva.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const taskId = event.notification.data && event.notification.data.taskId;
  const url = taskId ? `/tarea/${taskId}` : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if ("focus" in client) {
          if ("navigate" in client) client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
