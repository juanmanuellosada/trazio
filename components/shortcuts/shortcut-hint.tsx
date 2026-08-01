import { Fragment } from "react";
import type { ShortcutCombo } from "@/lib/shortcuts/types";
import { cn } from "@/lib/utils";
import { ShortcutKey } from "./shortcut-key";

/** Rótulo visual de la tecla principal de un combo. Los nombres sin letra imprimible se escriben en español; el resto se muestra en mayúscula aunque `ShortcutCombo.key` llegue en minúscula (así se guarda en `lib/shortcuts/`). */
function mainKeyLabel(key: string): string {
  const named: Record<string, string> = {
    " ": "Espacio",
    escape: "Esc",
    delete: "Supr",
    enter: "Enter",
    tab: "Tab",
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
  };
  return named[key.toLowerCase()] ?? key.toUpperCase();
}

/** Las teclas de un combo simultáneo, en el orden en que se leen: modificadores primero, tecla principal al final. */
function comboKeyLabels(combo: ShortcutCombo): string[] {
  const labels: string[] = [];
  if (combo.ctrl) labels.push("Ctrl");
  if (combo.shift) labels.push("⇧");
  if (combo.alt) labels.push("Alt");
  labels.push(mainKeyLabel(combo.key));
  return labels;
}

/**
 * Indicador de atajo compartido (bloque 2, D-B y D-C): un único componente
 * dibuja la tecla de cualquier atajo de la aplicación a partir del mismo
 * `ShortcutCombo` que lo registra en `lib/shortcuts/` o en el
 * `useShortcutScope` de quien lo monta — nunca de una cadena escrita a mano
 * en el lugar donde se ve.
 *
 * `combo` es un único `ShortcutCombo` para un atajo de una sola pulsación
 * (con o sin modificadores), o una tupla de dos para un acorde: ahí se
 * dibujan dos grupos de teclas separados por un espacio mayor —nunca una
 * cadena `"G H"`— porque son dos pulsaciones en secuencia, no una tecla
 * sostenida junto con otra (requirement "Un acorde se dibuja como dos
 * teclas separadas").
 *
 * Oculto por debajo del punto de corte de teléfono (`md`, 768px, el mismo
 * que ya separa el panel lateral de escritorio de la barra inferior en
 * `app-sidebar.tsx`/`mobile-nav.tsx`): ahí no hay teclado físico que use el
 * atajo, aunque el atajo se dispare igual si hay uno conectado (requirement
 * "Los indicadores no se muestran en ancho de teléfono"). `aria-hidden`
 * porque es un refuerzo visual del control que lo contiene, que ya tiene su
 * propio nombre accesible.
 */
export function ShortcutHint({
  combo,
  className,
}: {
  combo: ShortcutCombo | [ShortcutCombo, ShortcutCombo];
  className?: string;
}) {
  const steps = Array.isArray(combo) ? combo : [combo];

  return (
    <span aria-hidden className={cn("hidden items-center gap-1.5 md:inline-flex", className)}>
      {steps.map((step, stepIndex) => (
        <Fragment key={stepIndex}>
          {stepIndex > 0 && <span className="text-text-secondary">·</span>}
          <span className="inline-flex items-center gap-0.5">
            {comboKeyLabels(step).map((label, labelIndex) => (
              <ShortcutKey key={labelIndex}>{label}</ShortcutKey>
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  );
}
