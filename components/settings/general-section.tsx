"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { DATE_FORMAT_OPTIONS, DEFAULT_VIEW_OPTIONS, WEEK_STARTS_ON_OPTIONS } from "@/lib/validation/preferences";
import { useUpdatePreferences, type PreferencesPatch } from "@/lib/preferences/mutations";
import type { DateFormatPreference, TimeFormatPreference } from "@/lib/dates/format";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimezoneCombobox } from "./timezone-combobox";

/**
 * Interruptor on/off (sonido al completar). Copia el patrón visual de
 * `SwitchRow` en `components/view-options/view-options-bar.tsx` —el único
 * interruptor pintado a mano que hay en el proyecto hoy— en vez de
 * extraerlo a un componente compartido: con un solo precedente todavía no
 * hay nada que valga la pena generalizar.
 */
function Switch({ id, checked, onClick }: { id: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        "flex h-4 w-7 shrink-0 items-center rounded-full border border-input px-0.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
        checked ? "justify-end bg-primary/15" : "justify-start",
      )}
    >
      <span className={cn("size-3 rounded-full bg-text-secondary transition-colors", checked && "bg-primary")} />
    </button>
  );
}

const DATE_FORMAT_LABELS: Record<DateFormatPreference, string> = {
  "dd-MM-yyyy": "dd-mm-aaaa (31-12-2026)",
  "yyyy-MM-dd": "aaaa-mm-dd (2026-12-31)",
};

const TIME_FORMAT_LABELS: Record<TimeFormatPreference, string> = {
  24: "24 horas (14:30)",
  12: "12 horas (2:30 p. m.)",
};

const WEEK_STARTS_ON_LABELS: Record<number, string> = {
  1: "Lunes",
  0: "Domingo",
  6: "Sábado",
};

const DEFAULT_VIEW_LABELS: Record<string, string> = {
  bandeja: "Bandeja de entrada",
  hoy: "Hoy",
  proximos: "Próximos",
};

type LocalPreferences = {
  timezone: string;
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
  weekStartsOn: 0 | 1 | 6;
  defaultView: "bandeja" | "hoy" | "proximos";
  soundOnComplete: boolean;
};

/**
 * Sección General (tarea 11.4/11.5): zona horaria, formato de fecha,
 * formato de hora, día de inicio de semana y pantalla por defecto. Cada
 * campo se guarda solo al elegir una opción — no hay botón de "Guardar"
 * aparte, mismo patrón instantáneo que el tema — con revert local si el
 * servidor rechaza y `router.refresh()` si acepta, para que el resto de la
 * app (sembrada una sola vez por `PreferencesProvider`) vea el valor nuevo
 * sin recargar a mano (tarea 11.7).
 */
export function GeneralSection({
  userId,
  timezone,
  dateFormat,
  timeFormat,
  weekStartsOn,
  defaultView,
  soundOnComplete,
}: {
  userId: string;
  timezone: string;
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
  weekStartsOn: 0 | 1 | 6;
  defaultView: "bandeja" | "hoy" | "proximos";
  soundOnComplete: boolean;
}) {
  const router = useRouter();
  const updatePreferences = useUpdatePreferences();
  const [local, setLocal] = useState<LocalPreferences>({
    timezone,
    dateFormat,
    timeFormat,
    weekStartsOn,
    defaultView,
    soundOnComplete,
  });

  const timezoneLabelId = useId();
  const dateFormatId = useId();
  const timeFormatId = useId();
  const weekStartsOnId = useId();
  const defaultViewId = useId();
  const soundOnCompleteId = useId();

  function save<K extends keyof LocalPreferences>(key: K, value: LocalPreferences[K], patch: PreferencesPatch) {
    const previous = local[key];
    setLocal((current) => ({ ...current, [key]: value }));
    updatePreferences.mutate(
      { userId, patch },
      {
        onSuccess: () => router.refresh(),
        onError: () => setLocal((current) => ({ ...current, [key]: previous })),
      },
    );
  }

  return (
    <section className="space-y-5">
      <h2 className="text-lg font-semibold text-foreground">General</h2>

      <div className="space-y-1.5">
        <Label id={timezoneLabelId}>Zona horaria</Label>
        <TimezoneCombobox
          labelId={timezoneLabelId}
          value={local.timezone}
          onChange={(value) => save("timezone", value, { timezone: value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={dateFormatId}>Formato de fecha</Label>
        <Select
          items={DATE_FORMAT_LABELS}
          value={local.dateFormat}
          onValueChange={(value) => {
            const dateFormat = value as DateFormatPreference;
            save("dateFormat", dateFormat, { date_format: dateFormat });
          }}
        >
          <SelectTrigger id={dateFormatId} className="w-full max-w-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_FORMAT_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {DATE_FORMAT_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={timeFormatId}>Formato de hora</Label>
        <Select
          items={TIME_FORMAT_LABELS}
          value={String(local.timeFormat)}
          onValueChange={(value) => {
            const timeFormat = Number(value) as TimeFormatPreference;
            save("timeFormat", timeFormat, { time_format: timeFormat });
          }}
        >
          <SelectTrigger id={timeFormatId} className="w-full max-w-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24">{TIME_FORMAT_LABELS[24]}</SelectItem>
            <SelectItem value="12">{TIME_FORMAT_LABELS[12]}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={weekStartsOnId}>Día de inicio de semana</Label>
        <Select
          items={WEEK_STARTS_ON_LABELS}
          value={String(local.weekStartsOn)}
          onValueChange={(value) => {
            const weekStartsOn = Number(value) as 0 | 1 | 6;
            save("weekStartsOn", weekStartsOn, { week_starts_on: weekStartsOn });
          }}
        >
          <SelectTrigger id={weekStartsOnId} className="w-full max-w-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEEK_STARTS_ON_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {WEEK_STARTS_ON_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={defaultViewId}>Pantalla por defecto al entrar</Label>
        <Select
          items={DEFAULT_VIEW_LABELS}
          value={local.defaultView}
          onValueChange={(value) => {
            const defaultView = value as "bandeja" | "hoy" | "proximos";
            save("defaultView", defaultView, { default_view: defaultView });
          }}
        >
          <SelectTrigger id={defaultViewId} className="w-full max-w-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEFAULT_VIEW_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {DEFAULT_VIEW_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={soundOnCompleteId}>Sonido al completar y descompletar</Label>
        <Switch
          id={soundOnCompleteId}
          checked={local.soundOnComplete}
          onClick={() => save("soundOnComplete", !local.soundOnComplete, { sound_on_complete: !local.soundOnComplete })}
        />
      </div>
    </section>
  );
}
