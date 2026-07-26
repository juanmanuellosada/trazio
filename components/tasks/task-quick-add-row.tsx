"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateTask } from "@/lib/tasks/mutations";
import { cn } from "@/lib/utils";

/**
 * Alta rápida de una tarea o subtarea (bloque 7.2, requirement "Crear una
 * tarea con un título"): solo título, en texto plano. El resto de los
 * campos (prioridad, fecha, duración, fecha límite, descripción,
 * etiquetas) se completan después desde el detalle, que se puede abrir de
 * inmediato tras crearla. El alta rápida con lenguaje natural (parser, `#`,
 * `@`) es el bloque 9 — acá el título se guarda tal cual se escribió.
 */
export function TaskQuickAddRow({
  projectId,
  sectionId,
  parentId,
  indent,
}: {
  projectId: string;
  sectionId: string | null;
  parentId: string | null;
  indent?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const createTask = useCreateTask();

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    createTask.mutate(
      { projectId, sectionId, parentId, title: trimmed },
      { onSuccess: () => setTitle("") },
    );
  }

  if (!adding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("justify-start text-text-secondary", indent && "ml-6")}
        onClick={() => setAdding(true)}
      >
        <Plus className="size-3.5" />
        {parentId ? "Agregar subtarea" : "Agregar tarea"}
      </Button>
    );
  }

  return (
    <div className={cn("py-0.5", indent && "ml-6")}>
      <Input
        autoFocus
        value={title}
        placeholder="Título de la tarea"
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => {
          submit();
          setAdding(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
          if (event.key === "Escape") {
            setTitle("");
            setAdding(false);
          }
        }}
        aria-label={parentId ? "Título de la nueva subtarea" : "Título de la nueva tarea"}
        className="h-8 max-w-96 text-sm"
      />
    </div>
  );
}
