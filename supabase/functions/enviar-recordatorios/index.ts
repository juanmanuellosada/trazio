// Edge function de recordatorios (bloque 4.13/4.14, decisión D-C de
// design.md): la invoca `pg_cron` cada minuto vía `pg_net`
// (`supabase/migrations/20260729140000_reminders_claim_recalc_and_cron.sql`).
//
// El orden es: reclamar y RECIÉN DESPUÉS enviar. `claim_due_reminders` (la
// misma migración) hace el `update ... returning` con `for update skip
// locked` en una sola sentencia atómica — acá no se vuelve a tocar
// `delivered_at`. Invertir el orden (enviar y marcar después) produce
// duplicados ante cualquier reintento o solapamiento del cron, que es
// justo lo que el criterio de aceptación prohíbe.
//
// `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase en
// toda edge function, no hace falta configurarlos. Las claves VAPID sí:
// `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`, como secreto
// del proyecto (`supabase secrets set ...`), documentado en `.env.example`.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:soporte@trazio.app";

const BATCH_SIZE = 200;

type ClaimedReminder = { id: string; user_id: string; task_id: string; title: string };
type PushSubscriptionRow = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };

Deno.serve(async () => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error("Faltan las claves VAPID: no se puede enviar ningún push todavía.");
    return new Response(JSON.stringify({ error: "faltan-claves-vapid" }), { status: 500 });
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Reclamar antes de enviar (D-C): esta es la única llamada que toca
  // `delivered_at`. Todo lo que sigue puede fallar sin que un recordatorio
  // ya reclamado vuelva a intentarse en la próxima ejecución del cron.
  const { data: claimed, error: claimError } = await supabase.rpc("claim_due_reminders", { p_limit: BATCH_SIZE });
  if (claimError) {
    console.error("No se pudieron reclamar los recordatorios pendientes", claimError);
    return new Response(JSON.stringify({ error: claimError.message }), { status: 500 });
  }

  const reminders = (claimed ?? []) as ClaimedReminder[];
  if (reminders.length === 0) {
    return new Response(JSON.stringify({ reclamados: 0, enviados: 0 }), { status: 200 });
  }

  const userIds = [...new Set(reminders.map((reminder) => reminder.user_id))];
  const { data: subscriptions, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (subsError) {
    console.error("No se pudieron leer las suscripciones", subsError);
    return new Response(JSON.stringify({ error: subsError.message }), { status: 500 });
  }

  const subsByUser = new Map<string, PushSubscriptionRow[]>();
  for (const subscription of (subscriptions ?? []) as PushSubscriptionRow[]) {
    const list = subsByUser.get(subscription.user_id) ?? [];
    list.push(subscription);
    subsByUser.set(subscription.user_id, list);
  }

  const invalidSubscriptionIds: string[] = [];
  let enviados = 0;

  await Promise.all(
    reminders.flatMap((reminder) => {
      const subs = subsByUser.get(reminder.user_id) ?? [];
      const payload = JSON.stringify({ title: reminder.title, taskId: reminder.task_id });

      return subs.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
            payload,
          );
          enviados += 1;
        } catch (error) {
          // Suscripciones inválidas se eliminan (spec "Suscripciones
          // inválidas se eliminan"): 404/410 significa que el navegador
          // dio de baja el endpoint del lado del proveedor de push.
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            invalidSubscriptionIds.push(subscription.id);
          } else {
            console.error(`Error enviando push a la suscripción ${subscription.id}`, error);
          }
        }
      });
    }),
  );

  if (invalidSubscriptionIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", invalidSubscriptionIds);
  }

  return new Response(
    JSON.stringify({ reclamados: reminders.length, enviados, suscripciones_eliminadas: invalidSubscriptionIds.length }),
    { status: 200 },
  );
});
