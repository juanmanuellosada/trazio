import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { translateAuthError, translateAuthErrorCode } from "./errors";

describe("translateAuthError", () => {
  it("traduce credenciales inválidas sin código técnico", () => {
    const error = new AuthApiError("Invalid login credentials", 400, "invalid_credentials");
    const message = translateAuthError(error);

    expect(message).toContain("correo o la contraseña no coinciden");
    expect(message).not.toMatch(/invalid_credentials|400/);
  });

  it("traduce correo ya registrado", () => {
    const error = new AuthApiError("User already registered", 422, "user_already_exists");
    expect(translateAuthError(error)).toContain("ya está registrado");
  });

  it("traduce correo sin confirmar", () => {
    const error = new AuthApiError("Email not confirmed", 400, "email_not_confirmed");
    expect(translateAuthError(error)).toContain("confirmar tu correo");
  });

  it("traduce un enlace vencido", () => {
    const error = new AuthApiError("Token has expired", 403, "otp_expired");
    expect(translateAuthError(error)).toContain("venció o ya se usó");
  });

  it("traduce un fallo de red", () => {
    const error = new AuthRetryableFetchError("Service temporarily unavailable", 503);
    expect(translateAuthError(error)).toContain("se cortó la conexión");
  });

  it("cae a un mensaje genérico ante un error desconocido, sin códigos técnicos", () => {
    const error = new AuthApiError("Something weird happened", 500, "unexpected_failure");
    const message = translateAuthError(error);

    expect(message).toBe(
      "Algo falló de nuestro lado y no pudimos completar la operación. Volvé a intentar en un momento.",
    );
  });
});

describe("translateAuthErrorCode", () => {
  it("traduce el error de oauth que llega por query string", () => {
    expect(translateAuthErrorCode("oauth")).toContain("Google");
  });

  it("traduce el error de token del reset de contraseña", () => {
    expect(translateAuthErrorCode("token")).toContain("venció o ya se usó");
  });

  it("cae a un mensaje genérico si el código no existe", () => {
    expect(translateAuthErrorCode("lo-que-sea")).toContain("Algo falló");
  });
});
