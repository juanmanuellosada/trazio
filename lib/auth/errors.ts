import { isAuthApiError, isAuthRetryableFetchError } from "@supabase/supabase-js";

/**
 * Traducción centralizada de errores de autenticación (tarea 4.17): un solo
 * lugar que conoce los códigos de Supabase Auth, para que ninguna pantalla
 * repita la lógica ni muestre un código técnico. Todo mensaje sigue
 * `.claude/rules/copy.md` — qué pasó, por qué, qué hacer — sin culpar a la
 * persona usuaria.
 *
 * Los colores de error del diseño (`--error`) reemplazan al rojo de marca
 * (D5); acá solo se define el texto, el color lo aplica cada componente con
 * los tokens de `docs/design-system.md`.
 */
const MENSAJES = {
  invalid_credentials:
    "No pudimos iniciar tu sesión porque el correo o la contraseña no coinciden. Revisá los dos datos y volvé a intentar.",
  email_exists:
    "No pudimos crear la cuenta porque ese correo ya está registrado. Iniciá sesión con él, o recuperá tu contraseña si no la recordás.",
  user_already_exists:
    "No pudimos crear la cuenta porque ese correo ya está registrado. Iniciá sesión con él, o recuperá tu contraseña si no la recordás.",
  email_not_confirmed:
    "Todavía no podés entrar porque falta confirmar tu correo. Revisá tu bandeja de entrada y hacé clic en el enlace que te mandamos.",
  otp_expired:
    "Este enlace ya no es válido porque venció o ya se usó. Pedí uno nuevo para continuar.",
  weak_password:
    "La contraseña no cumple los requisitos mínimos de seguridad. Elegí una de 8 caracteres o más y volvé a intentar.",
  same_password:
    "No pudimos actualizar la contraseña porque es igual a la anterior. Elegí una distinta y volvé a intentar.",
  over_email_send_rate_limit:
    "Pediste demasiados correos en poco tiempo, así que hay que esperar un poco por seguridad. Esperá unos minutos y volvé a intentar.",
  network:
    "No pudimos completar la operación porque se cortó la conexión. Revisá tu internet y volvé a intentar.",
  token:
    "Este enlace ya no es válido porque venció o ya se usó. Pedí uno nuevo para continuar.",
  oauth:
    "No pudimos iniciar tu sesión con Google porque algo falló en el intercambio con su servidor. Volvé a intentar en un momento.",
  desconocido:
    "Algo falló de nuestro lado y no pudimos completar la operación. Volvé a intentar en un momento.",
} as const;

export type AuthErrorMessageKey = keyof typeof MENSAJES;

/** Traduce un error lanzado por el SDK de Supabase Auth a un mensaje de tres partes. */
export function translateAuthError(error: unknown): string {
  if (isAuthRetryableFetchError(error)) {
    return MENSAJES.network;
  }

  if (isAuthApiError(error) && error.code && error.code in MENSAJES) {
    return MENSAJES[error.code as AuthErrorMessageKey];
  }

  if (error instanceof Error && /fetch|network/i.test(error.message)) {
    return MENSAJES.network;
  }

  return MENSAJES.desconocido;
}

/**
 * Traduce un código de error que llega por query string (por ejemplo
 * `?error=oauth` del callback, o `?error=token` del reset de contraseña),
 * no una excepción del SDK.
 */
export function translateAuthErrorCode(code: string | null | undefined): string {
  if (code && code in MENSAJES) {
    return MENSAJES[code as AuthErrorMessageKey];
  }
  return MENSAJES.desconocido;
}
