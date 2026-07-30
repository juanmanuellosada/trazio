"use client";

import { createClient } from "@/lib/supabase/client";

/** VAPID pública en base64url → `Uint8Array`, formato que pide `PushManager.subscribe`. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

/**
 * Activa los recordatorios push en este dispositivo (bloque 4.8, spec
 * "Activación de recordatorios push desde Configuración"): pide permiso al
 * navegador, suscribe el `PushManager` del service worker y guarda la fila
 * en `push_subscriptions`. `upsert` sobre `endpoint` (único por
 * dispositivo/navegador) para que reactivar en el mismo dispositivo
 * actualice sus claves en vez de duplicar la fila.
 */
export async function subscribeToPush(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Este navegador no admite notificaciones push.");
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("Falta configurar la clave pública VAPID.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("permiso-denegado");
  }

  // `serviceWorker.ready` nunca se resuelve si no hay ninguna registración en
  // curso (por ejemplo, si `<RegisterServiceWorker />` no llegó a montarse
  // todavía): sin este chequeo, "Activar" se queda esperando para siempre en
  // vez de avisar que algo falló.
  const existingRegistration = await navigator.serviceWorker.getRegistration();
  if (!existingRegistration) {
    throw new Error("service-worker-no-registrado");
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("La suscripción del navegador no trajo las claves esperadas.");
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("No hay sesión activa.");

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: session.user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

/** Desactiva los recordatorios push en este dispositivo: cancela la suscripción del navegador y borra la fila. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  const supabase = createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

/** Si este dispositivo ya está suscripto (para pintar el estado activado/desactivado en Configuración). */
export async function isPushSubscribed(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  const subscription = await registration.pushManager.getSubscription();
  return subscription != null;
}
