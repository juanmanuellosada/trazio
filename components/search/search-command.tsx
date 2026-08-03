"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useSearch } from "@/lib/search/use-search";
import { useRecentTasks } from "@/lib/search/use-recent-tasks";
import { filterNavDestinations } from "@/lib/search/nav-destinations";
import { TaskListEmptyState } from "@/components/tasks/task-list-empty-state";
import { TaskRow } from "@/components/tasks/task-row";
import { ShortcutHint } from "@/components/shortcuts/shortcut-hint";
import { useTaskDetail } from "@/components/tasks/task-detail-context";
import { cn } from "@/lib/utils";

/**
 * Cuerpo compartido del buscador (buscador-como-paleta, D-A): los tres
 * grupos (recientes, resultados, ir a) más el campo, sin ningún wrapper de
 * diálogo — así lo usan tanto `SearchPalette` (dentro de `CommandDialog`,
 * el atajo `S`) como la ruta `/buscar` (standalone, sin modal por encima).
 * `shouldFilter={false}` porque cada grupo ya llega filtrado por su propia
 * fuente (búsqueda del servidor, IDs recientes, o `filterNavDestinations`):
 * el filtro difuso de `cmdk` no debe aplicarse encima.
 */
export function SearchCommand({
  onNavigate,
  listClassName,
}: {
  /** Se llama tras elegir una tarea o un destino — la paleta lo usa para cerrarse; la ruta standalone no necesita pasar nada. */
  onNavigate?: () => void;
  listClassName?: string;
}) {
  const [term, setTerm] = useState("");
  const search = useSearch(term);
  const router = useRouter();
  const { open: openTask } = useTaskDetail();
  const showRecent = term.length === 0;
  const recent = useRecentTasks(showRecent);
  const navDestinations = filterNavDestinations(term);

  function selectTask(taskId: string) {
    openTask(taskId);
    onNavigate?.();
  }

  function selectDestination(href: string) {
    router.push(href);
    onNavigate?.();
  }

  return (
    <Command shouldFilter={false}>
      <CommandInput
        autoFocus
        value={term}
        onValueChange={setTerm}
        placeholder="Buscá por título o descripción…"
        aria-label="Buscar tareas"
      />
      <CommandList className={cn("max-h-72", listClassName)}>
        {showRecent && (
          <CommandGroup heading="Visto recientemente">
            {recent.data && recent.data.length > 0 ? (
              recent.data.map((task) => (
                <CommandItem key={task.id} value={`reciente-${task.id}`} className="p-0" onSelect={() => selectTask(task.id)}>
                  <ul className="w-full">
                    <TaskRow task={task} allTasks={recent.data!} siblings={[]} depth={0} variant="flat" showProject />
                  </ul>
                </CommandItem>
              ))
            ) : (
              <p className="px-2 py-3 text-sm text-text-secondary">
                Todavía no viste ninguna tarea. Las que abras van a aparecer acá.
              </p>
            )}
          </CommandGroup>
        )}

        {!showRecent && (
          <CommandGroup heading="Resultados">
            {search.status === "corto" ? (
              <p className="px-2 py-3 text-sm text-text-secondary">Escribí un carácter más para buscar.</p>
            ) : search.status === "buscando" ? (
              <p className="px-2 py-3 text-sm text-text-secondary">Buscando…</p>
            ) : search.tasks.length === 0 ? (
              <TaskListEmptyState
                icon={SearchIcon}
                title="No encontramos tareas para esa búsqueda."
                description="Probá con otra palabra del título o de la descripción."
              />
            ) : (
              search.tasks.map((task) => (
                <CommandItem key={task.id} value={`resultado-${task.id}`} className="p-0" onSelect={() => selectTask(task.id)}>
                  <ul className="w-full">
                    <TaskRow task={task} allTasks={search.tasks} siblings={[]} depth={0} variant="flat" showProject />
                  </ul>
                </CommandItem>
              ))
            )}
          </CommandGroup>
        )}

        <CommandGroup heading="Ir a">
          {navDestinations.length === 0 ? (
            <p className="px-2 py-3 text-sm text-text-secondary">Ningún destino coincide con esa búsqueda.</p>
          ) : (
            navDestinations.map((destination) => (
              <CommandItem key={destination.id} value={destination.label} onSelect={() => selectDestination(destination.href)}>
                <destination.icon className="size-4" />
                <span className="flex-1">{destination.label}</span>
                <ShortcutHint combo={destination.shortcut} />
              </CommandItem>
            ))
          )}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
