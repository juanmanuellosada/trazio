// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RestablecerContrasenaForm } from "./restablecer-contrasena-form";
import { resetPasswordAction } from "./actions";

vi.mock("./actions", () => ({
  resetPasswordAction: vi.fn(),
}));

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("RestablecerContrasenaForm", () => {
  beforeEach(() => {
    vi.mocked(resetPasswordAction).mockReset();
    push.mockReset();
    refresh.mockReset();
  });

  it("muestra un error de validación cuando las contraseñas no coinciden", async () => {
    const user = userEvent.setup();
    render(<RestablecerContrasenaForm />);

    await user.type(screen.getByLabelText("Contraseña nueva"), "12345678");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "87654321");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(await screen.findByText(/no coinciden/i)).toBeInTheDocument();
    expect(resetPasswordAction).not.toHaveBeenCalled();
  });

  it("guarda la contraseña nueva y redirige a la app, ya con sesión iniciada", async () => {
    vi.mocked(resetPasswordAction).mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<RestablecerContrasenaForm />);

    await user.type(screen.getByLabelText("Contraseña nueva"), "12345678");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "12345678");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/bandeja"));
  });

  it("muestra el error del servidor cuando el token ya no es válido", async () => {
    vi.mocked(resetPasswordAction).mockResolvedValue({
      success: false,
      message: "Este enlace ya no es válido porque venció o ya se usó.",
    });
    const user = userEvent.setup();
    render(<RestablecerContrasenaForm />);

    await user.type(screen.getByLabelText("Contraseña nueva"), "12345678");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "12345678");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("venció o ya se usó");
  });
});
