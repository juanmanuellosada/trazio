"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { parse } from "@/lib/parser/parse";
import { todayInTimeZone } from "@/lib/dates/today";
import type { ParseResult, ParserContext } from "@/lib/parser/types";
import { cn } from "@/lib/utils";
import { CalendarGrid } from "./calendar-grid";
import { getQuickDateOptions } from "./quick-dates";

const DEBOUNCE_MS = 120;

export type CommittedDate = Pick<ParseResult, "dueDate" | "dueAt" | "durationMinutes">;

function formatPreview(result: CommittedDate, timezone: string): string {
  if (result.dueAt) {
    return formatInTimeZone(result.dueAt, timezone, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });
  }
  if (result.dueDate) {
    return format(parseISO(result.dueDate), "EEEE d 'de' MMMM", { locale: es });
  }
  return "";
}

/**
 * Cuerpo compartido del selector de fecha y del selector de fecha límite
 * (bloque 4.2-4.4, 4.6): campo de texto en lenguaje natural que delega
 * enteramente en `lib/parser/` (nunca una segunda interpretación propia),
 * accesos rápidos y calendario mensual. Cada selector que lo usa decide por
 * su cuenta a qué columna va el resultado y si ofrece hora y duración —
 * `DateSelect` sí, `DeadlineSelect` no.
 */
export function DatePickerBody({
  inputId,
  inputLabel,
  placeholder,
  ctx,
  selectedDate,
  onCommitText,
  onSelectDate,
}: {
  inputId: string;
  inputLabel: string;
  placeholder: string;
  ctx: Omit<ParserContext, "ahora">;
  /** `yyyy-MM-dd` ya elegido, para resaltar en el calendario y en los accesos rápidos. */
  selectedDate: string | null;
  onCommitText: (result: CommittedDate) => void;
  onSelectDate: (date: string) => void;
}) {
  const [ahora] = useState(() => new Date());
  const today = todayInTimeZone(ahora, ctx.zonaHoraria);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<CommittedDate | null>(null);
  const [month, setMonth] = useState(() => parseISO(selectedDate ?? today));

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!text.trim()) {
        setPreview(null);
        return;
      }
      const resultado = parse(text, { ahora, ...ctx });
      setPreview({ dueDate: resultado.dueDate, dueAt: resultado.dueAt, durationMinutes: resultado.durationMinutes });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, ahora, ctx]);

  const quickDates = useMemo(() => getQuickDateOptions(ahora, ctx), [ahora, ctx]);

  function commit() {
    if (!preview || (!preview.dueDate && !preview.dueAt)) return;
    onCommitText(preview);
    setText("");
    setPreview(null);
  }

  function selectDate(date: string) {
    setMonth(parseISO(date));
    onSelectDate(date);
  }

  return (
    <div className="space-y-2.5">
      <div className="space-y-1">
        <label htmlFor={inputId} className="text-xs font-medium text-text-secondary">
          {inputLabel}
        </label>
        <Input
          id={inputId}
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
          className="h-8 text-sm"
        />
        {text.trim() !== "" && (
          <p className="text-xs text-text-secondary">
            {preview && (preview.dueDate || preview.dueAt)
              ? `Enter para guardar: ${formatPreview(preview, ctx.zonaHoraria)}`
              : "No reconocimos ninguna fecha en lo que escribiste."}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {quickDates.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => selectDate(option.date)}
            className={cn(
              "flex w-full flex-col items-start rounded-lg border border-input px-2 py-1 text-left text-xs outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50",
              option.date === selectedDate && "border-primary bg-primary/10",
            )}
          >
            <span className="font-medium">{option.label}</span>
            <span className="text-text-secondary">{option.dayLabel}</span>
          </button>
        ))}
      </div>

      <CalendarGrid
        month={month}
        onMonthChange={setMonth}
        selectedDate={selectedDate}
        today={today}
        weekStartsOn={ctx.semanaEmpiezaEn}
        onSelectDate={selectDate}
      />
    </div>
  );
}
