// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConsentActions } from "./consent-actions";

const approveAuthorization = vi.fn();
const denyAuthorization = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { oauth: { approveAuthorization, denyAuthorization } } }),
}));

describe("ConsentActions", () => {
  beforeEach(() => {
    approveAuthorization.mockReset();
    denyAuthorization.mockReset();
  });

  it("aprueba la conexión con el `authorization_id` recibido", async () => {
    approveAuthorization.mockResolvedValue({ data: { redirect_url: "https://cliente.test/callback?code=abc" }, error: null });
    const user = userEvent.setup();
    render(<ConsentActions authorizationId="auth-123" />);

    await user.click(screen.getByRole("button", { name: "Aprobar" }));

    expect(approveAuthorization).toHaveBeenCalledWith("auth-123");
    expect(denyAuthorization).not.toHaveBeenCalled();
  });

  it("rechaza la conexión con el `authorization_id` recibido", async () => {
    denyAuthorization.mockResolvedValue({ data: { redirect_url: "https://cliente.test/callback?error=access_denied" }, error: null });
    const user = userEvent.setup();
    render(<ConsentActions authorizationId="auth-123" />);

    await user.click(screen.getByRole("button", { name: "Rechazar" }));

    expect(denyAuthorization).toHaveBeenCalledWith("auth-123");
    expect(approveAuthorization).not.toHaveBeenCalled();
  });

  it("muestra un error de tres partes si falla la red al aprobar, sin bloquear un reintento", async () => {
    approveAuthorization.mockResolvedValue({ data: null, error: new Error("network down") });
    const user = userEvent.setup();
    render(<ConsentActions authorizationId="auth-123" />);

    await user.click(screen.getByRole("button", { name: "Aprobar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("se cortó la comunicación con el servidor");
    expect(screen.getByRole("button", { name: "Aprobar" })).not.toBeDisabled();
  });

  it("muestra un error de tres partes si falla la red al rechazar", async () => {
    denyAuthorization.mockResolvedValue({ data: null, error: new Error("network down") });
    const user = userEvent.setup();
    render(<ConsentActions authorizationId="auth-123" />);

    await user.click(screen.getByRole("button", { name: "Rechazar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("se cortó la comunicación con el servidor");
  });

  it("deshabilita los dos botones mientras hay una decisión en curso", async () => {
    let resolveApprove: (value: { data: null; error: null }) => void = () => {};
    approveAuthorization.mockReturnValue(new Promise((resolve) => (resolveApprove = resolve)));
    const user = userEvent.setup();
    render(<ConsentActions authorizationId="auth-123" />);

    await user.click(screen.getByRole("button", { name: "Aprobar" }));

    expect(screen.getByRole("button", { name: "Aprobando…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rechazar" })).toBeDisabled();

    resolveApprove({ data: null, error: null });
  });
});
