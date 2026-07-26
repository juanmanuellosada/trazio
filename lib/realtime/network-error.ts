/**
 * Señal 2 de D4 (`design.md`): distingue un fallo de red real (sin
 * respuesta del servidor — la app no tiene con quién hablar) de un rechazo
 * con respuesta (RLS, validación, conflicto). `fetch` lanza `TypeError` con
 * "fetch" o "network" en el mensaje cuando no hay conexión; eso es lo único
 * que cuenta acá. Es una heurística, no una lista cerrada de códigos: los
 * navegadores no estandarizan el mensaje exacto.
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && /fetch|network/i.test(error.message);
}
