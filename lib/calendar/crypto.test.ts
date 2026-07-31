import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptRefreshToken, encryptRefreshToken } from "./crypto";

// Clave generada al vuelo, no una fija en el entorno de test: cualquier
// clave válida de 32 bytes en base64 sirve, y así el test no depende de
// que exista una en el entorno (ver docs/setup-google-calendar.md).
const VALID_KEY = randomBytes(32).toString("base64");

describe("encryptRefreshToken / decryptRefreshToken", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ida y vuelta: descifrar el resultado de cifrar devuelve el texto original", () => {
    vi.stubEnv("CALENDAR_REFRESH_TOKEN_ENCRYPTION_KEY", VALID_KEY);

    const plaintext = "1//refresh-token-de-google-de-prueba";
    const ciphertext = encryptRefreshToken(plaintext);

    expect(ciphertext).not.toBe(plaintext);
    expect(decryptRefreshToken(ciphertext)).toBe(plaintext);
  });

  it("un ciphertext manipulado falla al descifrar en vez de devolver basura", () => {
    vi.stubEnv("CALENDAR_REFRESH_TOKEN_ENCRYPTION_KEY", VALID_KEY);

    const ciphertext = encryptRefreshToken("1//refresh-token-de-google-de-prueba");
    const bytes = Buffer.from(ciphertext, "base64");
    // Cambia un byte del ciphertext (después de nonce + tag, que ocupan los
    // primeros 28 bytes): con GCM, cualquier alteración hace que la
    // verificación del tag de autenticación falle al descifrar.
    bytes[bytes.length - 1] ^= 0xff;
    const tampered = bytes.toString("base64");

    expect(() => decryptRefreshToken(tampered)).toThrow();
  });

  it("falla con un mensaje claro si falta la variable de entorno", () => {
    expect(() => encryptRefreshToken("token")).toThrow(/CALENDAR_REFRESH_TOKEN_ENCRYPTION_KEY/);
  });

  it("falla con un mensaje claro si la clave no decodifica a 32 bytes", () => {
    vi.stubEnv("CALENDAR_REFRESH_TOKEN_ENCRYPTION_KEY", Buffer.from("demasiado corta").toString("base64"));

    expect(() => encryptRefreshToken("token")).toThrow(/32 bytes/);
  });
});
