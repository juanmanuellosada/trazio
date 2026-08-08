// Edge function de recordatorios (bloque 4.13/4.14, decisión D-C de
// design.md; ampliada por openspec/changes/recordatorios-de-habitos, D-H):
// la invoca `pg_cron` cada minuto vía `pg_net`
// (`supabase/migrations/20260729140000_reminders_claim_recalc_and_cron.sql`).
// El `pg_cron` no cambia: sigue invocando esta misma función.
//
// El orden es: reclamar y RECIÉN DESPUÉS enviar, para las dos fuentes.
// `claim_due_reminders` hace el `update ... returning` con `for update skip
// locked`; `claim_due_habit_reminders` hace el `insert ... on conflict do
// nothing returning` (D-B del design de recordatorios-de-habitos) — las dos
// son la única sentencia que toca su tabla de entrega. Invertir el orden
// (enviar y marcar/insertar después) produce duplicados ante cualquier
// reintento o solapamiento del cron, que es justo lo que el criterio de
// aceptación prohíbe.
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

type ClaimedTaskReminder = { id: string; user_id: string; task_id: string; title: string };
type ClaimedHabitReminder = { habit_id: string; user_id: string; name: string };
type PushSubscriptionRow = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };

/** Lo mínimo para armar un envío, ya con el destino resuelto (D-H): `url` es lo que sigue `public/sw.js`, `taskId` queda como respaldo para un service worker viejo que todavía no lo lea. */
type PendingNotification = { user_id: string; title: string; url: string; taskId?: string };

Deno.serve(async () => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error("Faltan las claves VAPID: no se puede enviar ningún push todavía.");
    return new Response(JSON.stringify({ error: "faltan-claves-vapid" }), { status: 500 });
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Reclamar antes de enviar (D-C): esta es la única llamada que toca
  // `delivered_at`. Todo lo que sigue puede fallar sin que un recordatorio
  // de tarea ya reclamado vuelva a intentarse en la próxima ejecución del
  // cron. Un fallo acá sí aborta la función entera (como antes de este
  // cambio): sin recordatorios de tarea reclamados no hay nada que este
  // camino pueda enviar.
  const { data: claimedTasks, error: taskClaimError } = await supabase.rpc("claim_due_reminders", {
    p_limit: BATCH_SIZE,
  });
  if (taskClaimError) {
    console.error("No se pudieron reclamar los recordatorios de tarea pendientes", taskClaimError);
    return new Response(JSON.stringify({ error: taskClaimError.message }), { status: 500 });
  }
  const taskReminders = (claimedTasks ?? []) as ClaimedTaskReminder[];

  // Reclamo de hábitos (D-H): deliberadamente aislado con su propio
  // try/catch en vez de un `if (error) return` como el de arriba. Si esta
  // mitad nueva falla, los recordatorios de tarea que ya se reclamaron un
  // instante atrás tienen que enviarse igual — abortar acá los dejaría
  // reclamados y sin enviar, que es peor que no haberlos tocado (tarea
  // 4.4: un error en la mitad nueva no puede tirar abajo la que ya
  // funciona en producción).
  let habitReminders: ClaimedHabitReminder[] = [];
  const { data: claimedHabits, error: habitClaimError } = await supabase.rpc("claim_due_habit_reminders", {
    p_limit: BATCH_SIZE,
  });
  if (habitClaimError) {
    console.error("No se pudieron reclamar los recordatorios de hábito pendientes", habitClaimError);
  } else {
    habitReminders = (claimedHabits ?? []) as ClaimedHabitReminder[];
  }

  const notifications: PendingNotification[] = [
    ...taskReminders.map((reminder) => ({
      user_id: reminder.user_id,
      title: reminder.title,
      url: `/tarea/${reminder.task_id}`,
      taskId: reminder.task_id,
    })),
    ...habitReminders.map((reminder) => ({
      user_id: reminder.user_id,
      title: reminder.name,
      url: "/habitos",
    })),
  ];

  if (notifications.length === 0) {
    return new Response(JSON.stringify({ reclamados: 0, enviados: 0 }), { status: 200 });
  }

  const userIds = [...new Set(notifications.map((notification) => notification.user_id))];
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
    notifications.flatMap((notification) => {
      const subs = subsByUser.get(notification.user_id) ?? [];
      const payload = JSON.stringify({ title: notification.title, url: notification.url, taskId: notification.taskId });

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
    JSON.stringify({
      reclamados: notifications.length,
      reclamados_tarea: taskReminders.length,
      reclamados_habito: habitReminders.length,
      enviados,
      suscripciones_eliminadas: invalidSubscriptionIds.length,
    }),
    { status: 200 },
  );
});
