"use client";

import { useId, useState } from "react";
import { AppDialog } from "@/components/primitives/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Antepone `https://` cuando la persona escribe un dominio sin protocolo (`trazio.com.ar`), que es el caso más común al pegar o tipear un enlace a mano. */
function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Contenido del diálogo, separado del `LinkDialog` de más abajo para que
 * `url` arranque de `initialUrl` con el inicializador de `useState` en vez
 * de un efecto que lo resincronice: `AppDialog` solo monta su contenido
 * cuando `open` es `true` (bloque 2.3, verificado en `dialog.test.tsx`), así
 * que este componente se crea de cero cada vez que el diálogo abre y el
 * campo ya arranca con el valor correcto sin `setState` dentro de un
 * efecto.
 */
function LinkForm({
  initialUrl,
  onConfirm,
  onRemove,
  onCancel,
}: {
  initialUrl: string | null;
  onConfirm: (url: string) => void;
  onRemove?: () => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const inputId = useId();

  function handleConfirm() {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    onConfirm(normalized);
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        handleConfirm();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={inputId}>URL</Label>
        <Input
          id={inputId}
          autoFocus
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://…"
          type="text"
          inputMode="url"
        />
      </div>
      <div className="flex justify-end gap-2">
        {onRemove && (
          <Button type="button" variant="ghost" onClick={onRemove}>
            Quitar enlace
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!url.trim()}>
          {initialUrl ? "Guardar" : "Insertar"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Diálogo propio para insertar y editar un enlace (bloque 7.8, auditoría
 * A1): reemplaza el `window.prompt` que pedía la URL — el último control
 * nativo que quedaba en toda la aplicación. Se construye sobre `AppDialog`
 * (bloque 2.3), que ya resuelve foco atrapado, cierre con `Escape` y
 * devolución de foco.
 */
export function LinkDialog({
  open,
  onOpenChange,
  initialUrl,
  onConfirm,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presente cuando se edita un enlace existente (el botón del link ya activo): precarga el campo y habilita "Quitar enlace". */
  initialUrl?: string | null;
  onConfirm: (url: string) => void;
  onRemove?: () => void;
}) {
  return (
    <AppDialog open={open} onOpenChange={onOpenChange} title={initialUrl ? "Editar enlace" : "Insertar enlace"}>
      {open && (
        <LinkForm
          initialUrl={initialUrl ?? null}
          onConfirm={(url) => {
            onConfirm(url);
            onOpenChange(false);
          }}
          onRemove={
            onRemove &&
            (() => {
              onRemove();
              onOpenChange(false);
            })
          }
          onCancel={() => onOpenChange(false)}
        />
      )}
    </AppDialog>
  );
}
