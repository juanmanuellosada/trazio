import { describe, expect, it } from "vitest";
import { decideConnectionUpdate } from "./connection";
import type { GoogleTokens } from "./google-client";

// `decideConnectionUpdate` es la parte de lib/calendar/connection.ts que no
// toca Supabase, así que se puede testear sin base atrás (a diferencia del
// resto del módulo, que se verifica con pnpm test:rls y a mano — ver el
// informe final del agente).

function tokens(refreshToken: string | null): GoogleTokens {
  return { accessToken: "at", refreshToken, expiresInSeconds: 3600 };
}

describe("decideConnectionUpdate", () => {
  it("con refresh token, guarda ese refresh token sin importar si ya había una conexión", () => {
    expect(decideConnectionUpdate(tokens("rt-nuevo"), false)).toEqual({ action: "save", refreshToken: "rt-nuevo" });
    expect(decideConnectionUpdate(tokens("rt-nuevo"), true)).toEqual({ action: "save", refreshToken: "rt-nuevo" });
  });

  it("sin refresh token pero con una conexión existente, conserva el refresh token que ya tenía", () => {
    // Es lo que pasa si alguien se olvida de prompt=consent o Google no
    // reemite uno: perder la conexión sería peor que seguir con el que ya
    // funcionaba.
    expect(decideConnectionUpdate(tokens(null), true)).toEqual({ action: "keep-existing-refresh-token" });
  });

  it("sin refresh token y sin conexión previa, no hay nada que conservar: se rechaza", () => {
    expect(decideConnectionUpdate(tokens(null), false)).toEqual({ action: "reject-missing-refresh-token" });
  });
});
