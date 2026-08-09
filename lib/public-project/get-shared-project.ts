import { cache } from "react";
import { createAnonClient } from "@/lib/supabase/anon-client";
import type { SharedProject } from "./types";

/**
 * Trae el proyecto compartido por su token (D-F: siempre con el cliente
 * anónimo, nunca con la sesión de quien mira). `null` cubre los dos casos
 * que `get_shared_project` no distingue —token inexistente y token
 * revocado (tarea 2.4)— así que acá tampoco hay forma de diferenciarlos:
 * quien llama solo puede mostrar "este enlace no funciona", nunca por qué.
 *
 * `cache()` de React: `app/enlace/[token]/page.tsx` la llama tanto en
 * `generateMetadata` (para el `<title>`) como en el componente de página;
 * sin esto, cada visita pegaría dos veces contra la función `security
 * definer`, una por cada lugar que la llama.
 */
export const getSharedProject = cache(async (token: string): Promise<SharedProject | null> => {
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("get_shared_project", { p_token: token });
  if (error) throw error;
  return (data as SharedProject | null) ?? null;
});
