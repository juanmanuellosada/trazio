import { createClient } from "@/lib/supabase/server";

/**
 * Id de la Bandeja de entrada del usuario (bloque 8.1): el trigger de
 * aprovisionamiento (B3 del design) garantiza que existe una sola por
 * cuenta desde el primer login, así que `null` acá indica un dato
 * corrupto, no un caso normal a manejar en la interfaz.
 */
export async function getInboxProjectId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("id").eq("user_id", userId).eq("is_inbox", true).single();
  return data?.id ?? null;
}
