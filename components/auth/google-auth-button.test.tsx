// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleAuthButton } from "./google-auth-button";

const signInWithOAuth = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOAuth } }),
}));

describe("GoogleAuthButton", () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
  });

  it("dispara el OAuth con la URL de redirección resuelta y propaga `next`", async () => {
    signInWithOAuth.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<GoogleAuthButton siteUrl="https://trazio-preview.vercel.app" next="/proyecto/1" />);

    await user.click(screen.getByRole("button", { name: "Continuar con Google" }));

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://trazio-preview.vercel.app/callback?next=%2Fproyecto%2F1",
      },
    });
  });

  it("muestra un error de tres partes si Google no responde", async () => {
    signInWithOAuth.mockResolvedValue({ error: new Error("network down") });
    const user = userEvent.setup();
    render(<GoogleAuthButton siteUrl="https://trazio.com.ar" next="/bandeja" />);

    await user.click(screen.getByRole("button", { name: "Continuar con Google" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("se cortó la conexión");
  });
});
