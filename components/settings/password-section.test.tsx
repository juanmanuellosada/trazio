// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { PasswordSection } from "./password-section";

vi.mock("@/lib/supabase/client", () => {
  const signInWithPassword = vi.fn();
  const updateUser = vi.fn();
  return {
    createClient: () => ({ auth: { signInWithPassword, updateUser } }),
    __mock: { signInWithPassword, updateUser },
  };
});

const { signInWithPassword, updateUser } = (
  supabaseClientModule as unknown as {
    __mock: { signInWithPassword: ReturnType<typeof vi.fn>; updateUser: ReturnType<typeof vi.fn> };
  }
).__mock;

function renderSection(props: Partial<React.ComponentProps<typeof PasswordSection>> = {}) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PasswordSection email="juan@trazio.com.ar" hasPassword {...props} />
    </QueryClientProvider>,
  );
}

/**
 * El caso que importa (tarea 11.2): una cuenta que entró con Google no
 * tiene contraseña, así que el formulario de "establecerla por primera
 * vez" no puede pedir ni validar una "contraseña actual" que no existe —
 * y una cuenta que ya tiene una sí se tiene que reautenticar antes de
 * cambiarla.
 */
describe("PasswordSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cuenta que entró con Google (hasPassword=false)", () => {
    it("no muestra el campo «contraseña actual»", () => {
      renderSection({ hasPassword: false });
      expect(screen.queryByLabelText("Contraseña actual")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Contraseña nueva")).toBeInTheDocument();
    });

    it("establece la contraseña sin reautenticar (no hay una actual que verificar)", async () => {
      updateUser.mockResolvedValue({ error: null });
      const user = userEvent.setup();
      renderSection({ hasPassword: false });

      await user.type(screen.getByLabelText("Contraseña nueva"), "unaClaveLarga1");
      await user.type(screen.getByLabelText("Confirmar contraseña"), "unaClaveLarga1");
      await user.click(screen.getByRole("button", { name: "Definir contraseña" }));

      await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: "unaClaveLarga1" }));
      expect(signInWithPassword).not.toHaveBeenCalled();
    });

    it("después de establecerla, el próximo cambio ya pide la contraseña actual", async () => {
      updateUser.mockResolvedValue({ error: null });
      const user = userEvent.setup();
      renderSection({ hasPassword: false });

      await user.type(screen.getByLabelText("Contraseña nueva"), "unaClaveLarga1");
      await user.type(screen.getByLabelText("Confirmar contraseña"), "unaClaveLarga1");
      await user.click(screen.getByRole("button", { name: "Definir contraseña" }));

      expect(await screen.findByLabelText("Contraseña actual")).toBeInTheDocument();
    });
  });

  describe("cuenta que ya tiene contraseña (hasPassword=true)", () => {
    it("pide la contraseña actual y reautentica antes de cambiarla", async () => {
      signInWithPassword.mockResolvedValue({ error: null });
      updateUser.mockResolvedValue({ error: null });
      const user = userEvent.setup();
      renderSection({ hasPassword: true, email: "juan@trazio.com.ar" });

      await user.type(screen.getByLabelText("Contraseña actual"), "laViejaClave1");
      await user.type(screen.getByLabelText("Contraseña nueva"), "laNuevaClave1");
      await user.type(screen.getByLabelText("Confirmar contraseña"), "laNuevaClave1");
      await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

      await waitFor(() =>
        expect(signInWithPassword).toHaveBeenCalledWith({ email: "juan@trazio.com.ar", password: "laViejaClave1" }),
      );
      expect(updateUser).toHaveBeenCalledWith({ password: "laNuevaClave1" });
    });

    it("si la contraseña actual está mal, no llega a actualizar y muestra el error", async () => {
      signInWithPassword.mockResolvedValue({
        error: {
          __isAuthError: true,
          name: "AuthApiError",
          code: "invalid_credentials",
          message: "Invalid login credentials",
        },
      });
      const user = userEvent.setup();
      renderSection({ hasPassword: true });

      await user.type(screen.getByLabelText("Contraseña actual"), "unaClaveEquivocada");
      await user.type(screen.getByLabelText("Contraseña nueva"), "laNuevaClave1");
      await user.type(screen.getByLabelText("Confirmar contraseña"), "laNuevaClave1");
      await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

      await waitFor(() => expect(signInWithPassword).toHaveBeenCalled());
      expect(updateUser).not.toHaveBeenCalled();
      expect(await screen.findByRole("alert")).toHaveTextContent(/no coinciden/i);
    });
  });
});
