// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecuperarContrasenaForm } from "./recuperar-contrasena-form";
import { requestPasswordResetAction } from "./actions";

vi.mock("./actions", () => ({
  requestPasswordResetAction: vi.fn(),
}));

describe("RecuperarContrasenaForm", () => {
  beforeEach(() => {
    vi.mocked(requestPasswordResetAction).mockReset();
  });

  it("muestra un error de validación con un correo inválido", async () => {
    const user = userEvent.setup();
    render(<RecuperarContrasenaForm />);

    await user.type(screen.getByLabelText("Correo"), "no-es-un-correo");
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(await screen.findByText(/correo válido/i)).toBeInTheDocument();
    expect(requestPasswordResetAction).not.toHaveBeenCalled();
  });

  it("muestra la confirmación de envío sin revelar si el correo existe", async () => {
    vi.mocked(requestPasswordResetAction).mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<RecuperarContrasenaForm />);

    await user.type(screen.getByLabelText("Correo"), "juan@trazio.com.ar");
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(await screen.findByText("Revisá tu correo")).toBeInTheDocument();
    expect(screen.getByText("juan@trazio.com.ar")).toBeInTheDocument();
    expect(screen.getByText(/tiene una cuenta en trazio/i)).toBeInTheDocument();
  });

  it("muestra el error del servidor cuando falla el pedido", async () => {
    vi.mocked(requestPasswordResetAction).mockResolvedValue({
      success: false,
      message: "No pudimos completar la operación porque se cortó la conexión.",
    });
    const user = userEvent.setup();
    render(<RecuperarContrasenaForm />);

    await user.type(screen.getByLabelText("Correo"), "juan@trazio.com.ar");
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("se cortó la conexión");
  });
});
