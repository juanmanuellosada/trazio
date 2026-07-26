// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";
import { loginAction } from "./actions";

vi.mock("./actions", () => ({
  loginAction: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signInWithOAuth: vi.fn().mockResolvedValue({ error: null }) },
  }),
}));

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.mocked(loginAction).mockReset();
    push.mockReset();
    refresh.mockReset();
  });

  it("muestra un error de validación cuando falta la contraseña", async () => {
    const user = userEvent.setup();
    render(<LoginForm siteUrl="https://trazio.com.ar" next="/bandeja" initialError={null} />);

    await user.type(screen.getByLabelText("Correo"), "juan@trazio.com.ar");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText(/falta tu contraseña/i)).toBeInTheDocument();
    expect(loginAction).not.toHaveBeenCalled();
  });

  it("inicia sesión y vuelve al `redirectTo` que resuelve la acción", async () => {
    vi.mocked(loginAction).mockResolvedValue({ success: true, redirectTo: "/proyecto/1" });
    const user = userEvent.setup();
    render(<LoginForm siteUrl="https://trazio.com.ar" next="/proyecto/1" initialError={null} />);

    await user.type(screen.getByLabelText("Correo"), "juan@trazio.com.ar");
    await user.type(screen.getByLabelText("Contraseña"), "12345678");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    await waitFor(() => expect(loginAction).toHaveBeenCalledWith(
      { email: "juan@trazio.com.ar", password: "12345678" },
      "/proyecto/1",
    ));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/proyecto/1"));
  });

  it("muestra el error de credenciales inválidas sin código técnico", async () => {
    vi.mocked(loginAction).mockResolvedValue({
      success: false,
      message: "No pudimos iniciar tu sesión porque el correo o la contraseña no coinciden.",
    });
    const user = userEvent.setup();
    render(<LoginForm siteUrl="https://trazio.com.ar" next="/bandeja" initialError={null} />);

    await user.type(screen.getByLabelText("Correo"), "juan@trazio.com.ar");
    await user.type(screen.getByLabelText("Contraseña"), "incorrecta");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "el correo o la contraseña no coinciden",
    );
  });

  it("muestra el error inicial traducido de `?error=oauth`", () => {
    render(
      <LoginForm
        siteUrl="https://trazio.com.ar"
        next="/bandeja"
        initialError="No pudimos iniciar tu sesión con Google."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos iniciar tu sesión con Google");
  });
});
