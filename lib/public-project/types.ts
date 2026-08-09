import type { Json } from "@/lib/supabase/database.types";

/**
 * Forma exacta de lo que devuelve `get_shared_project`
 * (20260809030000_get_shared_project.sql): un espejo en TypeScript de sus
 * tres `jsonb_build_object`, campo por campo. Si la función cambia sus
 * columnas, este tipo tiene que cambiar con ella — es la lista blanca de
 * D-E leída del lado del cliente.
 */
export type SharedProjectInfo = {
  name: string;
  color: string | null;
  icon: string | null;
};

export type SharedSection = {
  id: string;
  name: string;
  description: string | null;
};

export type SharedTask = {
  id: string;
  section_id: string | null;
  parent_id: string | null;
  title: string;
  description: Json | null;
  due_date: string | null;
  due_at: string | null;
  deadline: string | null;
  priority: number;
  completed: boolean;
};

export type SharedProject = {
  project: SharedProjectInfo;
  sections: SharedSection[];
  tasks: SharedTask[];
};
