import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { entityExists, invalidUuidError, isValidUuid } from "./shared";

export const archivarInputSchema = z.object({
  tipo: z
    .string()
    .describe('Tipo de entidad a archivar: "proyecto" o "habito". Es la única forma de "dar de baja" que ofrece el MCP — nunca borra.'),
  id: z.string().describe("Id del proyecto o hábito a archivar, obtenido de listar_estructura o listar_habitos."),
});
export type ArchivarInput = z.infer<typeof archivarInputSchema>;

export type ArchivarResult = { ok: true } | { ok: false; error: string };

/**
 * `archivar` (spec `mcp`): único tipo de baja que el MCP ofrece, sobre
 * `proyecto` y `habito` únicamente — ningún otro `tipo`, y nunca un borrado
 * físico (ver el requirement "El servidor MCP nunca ofrece borrar"; la
 * migración `20260810010000_oauth_client_delete_restrictions.sql` de la Ola
 * 4 ya bloquea el DELETE de estas tablas para un token OAuth de todas
 * formas). Archivar es un `UPDATE is_archived = true` directo: el esquema
 * ya protege este campo (columna booleana simple, sin invariante propio que
 * un `UPDATE` ingenuo pueda romper), así que no hace falta envolverlo
 * (D-E).
 */
export async function archivar(supabase: SupabaseClient<Database>, input: ArchivarInput): Promise<ArchivarResult> {
  if (!isValidUuid(input.id)) return { ok: false, error: invalidUuidError(input.id) };

  if (input.tipo !== "proyecto" && input.tipo !== "habito") {
    return { ok: false, error: `tipo "${input.tipo}" no es válido: usar "proyecto" o "habito".` };
  }

  const table = input.tipo === "proyecto" ? "projects" : "habits";
  if (!(await entityExists(supabase, table, input.id))) {
    return { ok: false, error: `No se encontró un ${input.tipo} con ese id.` };
  }

  const { error } = await supabase.from(table).update({ is_archived: true }).eq("id", input.id);
  if (error) throw error;
  return { ok: true };
}
