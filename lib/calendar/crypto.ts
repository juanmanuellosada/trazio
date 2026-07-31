import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifra y descifra el refresh token de Google con AES-256-GCM (decisión D-A
 * de openspec/changes/fase-4-calendario/design.md). GCM y no CBC porque
 * autentica: un ciphertext manipulado tiene que fallar al descifrar, no
 * devolver basura en silencio.
 *
 * Formato de lo que se guarda en `calendar_connections.refresh_token`: un
 * único string en base64 con, concatenados en este orden, el nonce (12
 * bytes), el tag de autenticación (16 bytes) y el ciphertext. Un solo campo
 * de texto porque `refresh_token` es `text` en el esquema (docs/data-model.md)
 * y no hay columnas separadas para nonce/tag.
 *
 * La clave sale de `CALENDAR_REFRESH_TOKEN_ENCRYPTION_KEY` (32 bytes en
 * base64, ver docs/setup-google-calendar.md) y solo se lee acá, del lado
 * servidor: este módulo importa `node:crypto`, que no existe en el
 * navegador, así que cualquier intento de usarlo desde un componente
 * cliente falla en el build en vez de exponer la clave silenciosamente.
 */

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH_BYTES = 32;
const NONCE_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;

function getEncryptionKey(): Buffer {
  const raw = process.env.CALENDAR_REFRESH_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "Falta la variable de entorno CALENDAR_REFRESH_TOKEN_ENCRYPTION_KEY. " +
        "Generala con `openssl rand -base64 32` (ver docs/setup-google-calendar.md).",
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `CALENDAR_REFRESH_TOKEN_ENCRYPTION_KEY debe decodificar en base64 a ${KEY_LENGTH_BYTES} bytes, ` +
        `pero tiene ${key.length}. Generala de nuevo con \`openssl rand -base64 32\`.`,
    );
  }

  return key;
}

/** Cifra el refresh token de Google. Devuelve el valor listo para guardar en `calendar_connections.refresh_token`. */
export function encryptRefreshToken(plaintext: string): string {
  const key = getEncryptionKey();
  const nonce = randomBytes(NONCE_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([nonce, tag, ciphertext]).toString("base64");
}

/**
 * Descifra un valor guardado en `calendar_connections.refresh_token`. Lanza
 * si el ciphertext, el nonce o el tag fueron manipulados: GCM verifica la
 * autenticación antes de devolver nada.
 */
export function decryptRefreshToken(stored: string): string {
  const key = getEncryptionKey();
  const buffer = Buffer.from(stored, "base64");

  const nonce = buffer.subarray(0, NONCE_LENGTH_BYTES);
  const tag = buffer.subarray(NONCE_LENGTH_BYTES, NONCE_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
  const ciphertext = buffer.subarray(NONCE_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);

  const decipher = createDecipheriv(ALGORITHM, key, nonce);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
