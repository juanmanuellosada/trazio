import { describe, expect, it } from "vitest";
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "./auth";

describe("registerSchema", () => {
  it("acepta nombre, correo y contraseña de 8 caracteres o más", () => {
    const result = registerSchema.safeParse({
      name: "Juan",
      email: "juan@trazio.com.ar",
      password: "12345678",
    });

    expect(result.success).toBe(true);
  });

  it("rechaza una contraseña de 7 caracteres", () => {
    const result = registerSchema.safeParse({
      name: "Juan",
      email: "juan@trazio.com.ar",
      password: "1234567",
    });

    expect(result.success).toBe(false);
  });

  it("rechaza un correo sin formato válido", () => {
    const result = registerSchema.safeParse({
      name: "Juan",
      email: "no-es-un-correo",
      password: "12345678",
    });

    expect(result.success).toBe(false);
  });

  it("rechaza un nombre vacío", () => {
    const result = registerSchema.safeParse({
      name: "  ",
      email: "juan@trazio.com.ar",
      password: "12345678",
    });

    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("acepta correo y contraseña", () => {
    const result = loginSchema.safeParse({
      email: "juan@trazio.com.ar",
      password: "cualquiera",
    });

    expect(result.success).toBe(true);
  });

  it("rechaza una contraseña vacía", () => {
    const result = loginSchema.safeParse({
      email: "juan@trazio.com.ar",
      password: "",
    });

    expect(result.success).toBe(false);
  });

  it("rechaza un correo inválido", () => {
    const result = loginSchema.safeParse({
      email: "no-es-un-correo",
      password: "cualquiera",
    });

    expect(result.success).toBe(false);
  });
});

describe("requestPasswordResetSchema", () => {
  it("acepta un correo válido", () => {
    const result = requestPasswordResetSchema.safeParse({
      email: "juan@trazio.com.ar",
    });

    expect(result.success).toBe(true);
  });

  it("rechaza un correo inválido", () => {
    const result = requestPasswordResetSchema.safeParse({
      email: "no-es-un-correo",
    });

    expect(result.success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("acepta una contraseña de 8 caracteres o más con confirmación igual", () => {
    const result = resetPasswordSchema.safeParse({
      password: "12345678",
      confirmPassword: "12345678",
    });

    expect(result.success).toBe(true);
  });

  it("rechaza una contraseña de 7 caracteres", () => {
    const result = resetPasswordSchema.safeParse({
      password: "1234567",
      confirmPassword: "1234567",
    });

    expect(result.success).toBe(false);
  });

  it("rechaza cuando la confirmación no coincide", () => {
    const result = resetPasswordSchema.safeParse({
      password: "12345678",
      confirmPassword: "87654321",
    });

    expect(result.success).toBe(false);
  });
});
