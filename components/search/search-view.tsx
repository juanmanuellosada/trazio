"use client";

import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { useSearch } from "@/lib/search/use-search";
import { Input } from "@/components/ui/input";
import { TaskListEmptyState } from "@/components/tasks/task-list-empty-state";
import { TaskRow } from "@/components/tasks/task-row";

/**
 * Buscador (bloque 2.18, capacidad `buscador`): mínimo dos caracteres,
 * tope de 50 resultados, pendientes primero y después por fecha. Sin
 * `initialData`: la búsqueda arranca vacía, no hay nada que sembrar desde
 * el servidor.
 */
export function SearchView() {
  const [term, setTerm] = useState("");
  const search = useSearch(term);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <div className="flex w-full max-w-content items-center gap-2">
          <SearchIcon aria-hidden className="size-5 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Buscar</h1>
        </div>
      </header>

      <div className="w-full max-w-content flex-1 overflow-y-auto p-4 sm:p-6">
        <Input
          autoFocus
          type="search"
          aria-label="Buscar tareas"
          placeholder="Buscá por título o descripción…"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          className="h-11 text-base"
        />

        <div className="mt-4">
          {search.status === "corto" ? (
            term.length === 0 ? (
              <p className="text-sm text-text-secondary">Escribí al menos dos caracteres para empezar a buscar.</p>
            ) : (
              <p className="text-sm text-text-secondary">Escribí un carácter más para buscar.</p>
            )
          ) : search.status === "buscando" ? (
            <p className="text-sm text-text-secondary">Buscando…</p>
          ) : search.tasks.length === 0 ? (
            <TaskListEmptyState
              icon={SearchIcon}
              title="No encontramos tareas para esa búsqueda."
              description="Probá con otra palabra del título o de la descripción."
            />
          ) : (
            <ul className="flex flex-col">
              {search.tasks.map((task) => (
                <TaskRow key={task.id} task={task} allTasks={search.tasks} siblings={[]} depth={0} variant="flat" />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
