"use client";

import { Search as SearchIcon } from "lucide-react";
import { SearchCommand } from "./search-command";

/**
 * Pantalla del buscador en la ruta `/buscar` (D-A de `buscador-como-paleta`):
 * la ruta se mantiene como destino válido (puede estar en un historial o un
 * favorito), reutilizando el mismo cuerpo de grupos (`SearchCommand`) que la
 * paleta que abre el atajo `S` — sin el wrapper de `Dialog`, para no tener
 * que decidir sobre qué vista "de fondo" abrir un modal al entrar directo
 * por URL. `onNavigate` queda sin pasar: acá no hay nada que cerrar.
 */
export function SearchView() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <div className="flex w-full max-w-content mx-auto items-center gap-2">
          <SearchIcon aria-hidden className="size-5 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Buscar</h1>
        </div>
      </header>
      <div className="w-full max-w-content mx-auto flex-1 overflow-y-auto p-4 sm:p-6">
        <SearchCommand listClassName="max-h-none" />
      </div>
    </div>
  );
}
