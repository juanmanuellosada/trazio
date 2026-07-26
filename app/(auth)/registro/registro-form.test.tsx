// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegistroForm } from "./registro-form";
import { registerAction } from "./actions";

vi.mock("./actions", () => ({
  registerAction: vi.fn(),
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

describe("RegistroForm", () => {
  beforeEach(() => {
    vi.mocked(registerAction).mockReset();
    push.mockReset();
    refresh.mockReset();
  });

  it("muestra los errores de validación cuando los campos son inválidos", async () => {
    const user = userEvent.setup();
    render(<RegistroForm siteUrl="https://trazio.com.ar" next="/bandeja" />);

    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByText(/necesita 8 caracteres/i)).toBeInTheDocument();
    expect(registerAction).not.toHaveBeenCalled();
  });

  it("envía los datos y muestra la pantalla de confirmación cuando el registro necesita confirmar el correo", async () => {
    vi.mocked(registerAction).mockResolvedValue({ success: true, needsConfirmation: true });
    const user = userEvent.setup();
    render(<RegistroForm siteUrl="https://trazio.com.ar" next="/bandeja" />);

    await user.type(screen.getByLabelText("Nombre"), "Juan");
    await user.type(screen.getByLabelText("Correo"), "juan@trazio.com.ar");
    await user.type(screen.getByLabelText("Contraseña"), "12345678");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByText("Revisá tu correo")).toBeInTheDocument();
    expect(screen.getByText("juan@trazio.com.ar")).toBeInTheDocument();
    expect(registerAction).toHaveBeenCalledWith({
      name: "Juan",
      email: "juan@trazio.com.ar",
      password: "12345678",
    });
  });

  it("redirige a `next` cuando el registro no necesita confirmación", async () => {
    vi.mocked(registerAction).mockResolvedValue({ success: true, needsConfirmation: false });
    const user = userEvent.setup();
    render(<RegistroForm siteUrl="https://trazio.com.ar" next="/proyecto/1" />);

    await user.type(screen.getByLabelText("Nombre"), "Juan");
    await user.type(screen.getByLabelText("Correo"), "juan@trazio.com.ar");
    await user.type(screen.getByLabelText("Contraseña"), "12345678");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/proyecto/1"));
  });

  it("muestra el error de tres partes del servidor sin códigos técnicos", async () => {
    vi.mocked(registerAction).mockResolvedValue({
      success: false,
      message: "No pudimos crear la cuenta porque ese correo ya está registrado. Iniciá sesión con él.",
    });
    const user = userEvent.setup();
    render(<RegistroForm siteUrl="https://trazio.com.ar" next="/bandeja" />);

    await user.type(screen.getByLabelText("Nombre"), "Juan");
    await user.type(screen.getByLabelText("Correo"), "juan@trazio.com.ar");
    await user.type(screen.getByLabelText("Contraseña"), "12345678");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ese correo ya está registrado");
  });
});
