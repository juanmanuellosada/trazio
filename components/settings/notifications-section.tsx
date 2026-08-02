"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isPushSubscribed } from "@/lib/reminders/subscribe";
import { usePushSubscriptions } from "@/lib/reminders/use-push-subscriptions";
import { useRemovePushSubscription, useSubscribePush, useUnsubscribePush } from "@/lib/reminders/use-push-toggle";
import { useUpdatePreferences } from "@/lib/preferences/mutations";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { TimeField, parseHHMM, toHHMM } from "@/components/selectors/time-field";

function formatSubscribedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Sección "Notificaciones y recordatorios" de Configuración (bloque 4.9,
 * spec "Activación de recordatorios push desde Configuración", ampliada por
 * `recordatorios-con-hora-de-referencia` D-A): activar o desactivar los
 * recordatorios push en este dispositivo, ver los demás dispositivos ya
 * suscritos con la misma cuenta, y configurar la hora de referencia — a qué
 * hora se considera que vence una tarea que tiene día pero no hora, para
 * los recordatorios relativos sobre esas tareas.
 */
export function NotificationsSection({ userId, referenceTime }: { userId: string; referenceTime: string }) {
  const [subscribedHere, setSubscribedHere] = useState<boolean | null>(null);
  const { data: subscriptions } = usePushSubscriptions();
  const subscribe = useSubscribePush();
  const unsubscribe = useUnsubscribePush();
  const removeSubscription = useRemovePushSubscription();
  const router = useRouter();
  const updatePreferences = useUpdatePreferences();
  const [localReferenceTime, setLocalReferenceTime] = useState(referenceTime.slice(0, 5));
  const referenceTimeId = useId();
  const { timeFormat } = useUserPreferences();

  useEffect(() => {
    isPushSubscribed().then(setSubscribedHere);
  }, []);

  function saveReferenceTime(value: string) {
    const previous = localReferenceTime;
    setLocalReferenceTime(value);
    updatePreferences.mutate(
      { userId, patch: { reference_time: value } },
      {
        onSuccess: () => router.refresh(),
        onError: () => setLocalReferenceTime(previous),
      },
    );
  }

  async function toggle() {
    if (subscribedHere) {
      await unsubscribe.mutateAsync();
      setSubscribedHere(false);
    } else {
      await subscribe.mutateAsync();
      setSubscribedHere(true);
    }
  }

  const pending = subscribe.isPending || unsubscribe.isPending;

  return (
    <section className="space-y-5">
      <h2 className="text-lg font-semibold text-foreground">Notificaciones y recordatorios</h2>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">Recordatorios push en este dispositivo</p>
          <p className="text-xs text-text-secondary">
            {subscribedHere
              ? "Activados: vas a recibir tus recordatorios acá."
              : "Activalos para recibir tus recordatorios como notificación."}
          </p>
        </div>
        <Button
          type="button"
          variant={subscribedHere ? "outline" : "default"}
          size="sm"
          onClick={toggle}
          disabled={pending || subscribedHere == null}
        >
          {subscribedHere ? (
            <>
              <BellOff className="size-3.5" /> Desactivar
            </>
          ) : (
            <>
              <Bell className="size-3.5" /> Activar
            </>
          )}
        </Button>
      </div>

      {subscriptions && subscriptions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-text-secondary">Dispositivos suscritos</p>
          <ul className="space-y-1">
            {subscriptions.map((subscription) => (
              <li
                key={subscription.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm"
              >
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <Smartphone className="size-3.5" aria-hidden />
                  Desde el {formatSubscribedAt(subscription.created_at)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Quitar este dispositivo"
                  onClick={() => removeSubscription.mutate(subscription.id)}
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-1.5 border-t border-border pt-4">
        <p className="text-sm font-medium text-foreground">Hora de referencia</p>
        <p className="text-xs text-text-secondary">
          A esta hora se considera que vence una tarea que tiene día pero no hora, para tus recordatorios relativos
          sobre esas tareas.
        </p>
        <TimeField
          id={referenceTimeId}
          value={parseHHMM(localReferenceTime)}
          onChange={(next) => saveReferenceTime(toHHMM(next))}
          timeFormat={timeFormat}
        />
      </div>
    </section>
  );
}
