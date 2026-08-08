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
// `{ title, url, taskId }` (ampliado por openspec/changes/recordatorios-de-habitos,
// D-H — antes era siempre `{ title, taskId }`). `url` ya viene resuelto
// (`/tarea/<id>` para una tarea, `/habitos` para un hábito), así este
// service worker no necesita saber de dónde salió el recordatorio. `taskId`
// se conserva como respaldo: un service worker se actualiza cuando el
// navegador quiere, así que durante un rato puede convivir una versión
// vieja de este archivo (que todavía no lee `url`) con la edge function ya
// actualizada — sin `taskId`, esa ventana abriría la raíz en vez de la
// tarea. `title` es texto plano (nombre del hábito o título de la tarea,
// sin marcado) — se pasa tal cual a `showNotification`, que siempre lo
// muestra como texto plano (D2): la API de notificaciones no interpreta
// HTML.
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
      data: { url: payload.url ?? null, taskId: payload.taskId ?? null },
    }),
  );
});

// Tocar la notificación abre su destino (spec "Entrega de la notificación
// push" de tareas, y "La notificación nombra el hábito y abre la pantalla
// de Hábitos" de recordatorios-de-habitos): si ya hay una pestaña de Trazio
// abierta, la enfoca y navega ahí; si no, abre una nueva. `url` manda;
// `taskId` es el único respaldo para un payload viejo sin `url` (ver el
// comentario de más arriba).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const url = data.url || (data.taskId ? `/tarea/${data.taskId}` : "/");

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
