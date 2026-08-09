// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserIdentity } from "@supabase/supabase-js";
import * as supabaseClientModule from "@/lib/supabase/client";
import { AccountSection } from "./account-section";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/lib/supabase/client", () => {
  const eq = vi.fn();
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  const signInWithPassword = vi.fn();
  const updateUser = vi.fn();
  const unlinkIdentity = vi.fn();
  return {
    createClient: () => ({ from, auth: { signInWithPassword, updateUser, unlinkIdentity } }),
    __mock: { from, update, eq, unlinkIdentity },
  };
});

const { update, eq, unlinkIdentity } = (
  supabaseClientModule as unknown as {
    __mock: {
      from: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      unlinkIdentity: ReturnType<typeof vi.fn>;
    };
  }
).__mock;

const GOOGLE_IDENTITY: UserIdentity = {
  id: "identity-1",
  user_id: "user-1",
  identity_id: "identity-1",
  provider: "google",
  identity_data: {},
};

function renderSection(props: Partial<Parameters<typeof AccountSection>[0]> = {}) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <AccountSection
        userId="user-1"
        fullName="Juan"
        email="juan@trazio.com.ar"
        avatarUrl={null}
        hasPassword
        googleIdentity={null}
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe("AccountSection (bloque 9.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eq.mockResolvedValue({ error: null });
    unlinkIdentity.mockResolvedValue({ data: {}, error: null });
  });

  it("sin avatarUrl, muestra las iniciales de la cuenta (foto-de-perfil-de-google)", () => {
    renderSection();
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("con avatarUrl, muestra la foto de la cuenta", () => {
    renderSection({ avatarUrl: "https://lh3.googleusercontent.com/a/foto" });
    const img = screen.getByRole("presentation", { hidden: true }) as HTMLImageElement;
    expect(img.src).toBe("https://lh3.googleusercontent.com/a/foto");
  });

  it("muestra el correo como texto, no como campo editable", () => {
    renderSection();
    expect(screen.getByText("juan@trazio.com.ar")).toBeInTheDocument();
    expect(screen.queryByLabelText(/correo/i)).not.toBeInTheDocument();
  });

  it("guardar el nombre actualiza profiles.full_name para el usuario y refresca la app", async () => {
    const user = userEvent.setup();
    renderSection();

    const nameInput = screen.getByLabelText("Nombre");
    await user.clear(nameInput);
    await user.type(nameInput, "Juan Manuel");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ full_name: "Juan Manuel" }));
    expect(eq).toHaveBeenCalledWith("id", "user-1");
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("no deja guardar un nombre vacío", async () => {
    const user = userEvent.setup();
    renderSection();

    const nameInput = screen.getByLabelText("Nombre");
    await user.clear(nameInput);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText(/falta tu nombre/i)).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it("una cuenta sin Google vinculado no muestra ninguna indicación ni acción de Google", () => {
    renderSection({ googleIdentity: null });
    expect(screen.queryByText(/google/i)).not.toBeInTheDocument();
  });

  it("una cuenta vinculada con Google y con contraseña puede desvincularla", async () => {
    const user = userEvent.setup();
    renderSection({ googleIdentity: GOOGLE_IDENTITY, hasPassword: true });

    expect(screen.getByText(/vinculada con Google/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Desvincular Google" }));

    const dialog = await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "Desvincular" }));

    await waitFor(() => expect(unlinkIdentity).toHaveBeenCalledWith(GOOGLE_IDENTITY));
    expect(dialog).not.toBeInTheDocument();
  });

  it("una cuenta vinculada con Google como único acceso no ofrece desvincularla", () => {
    renderSection({ googleIdentity: GOOGLE_IDENTITY, hasPassword: false });

    expect(screen.getByText(/vinculada con Google/i)).toBeInTheDocument();
    expect(screen.getByText(/única forma de entrar/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desvincular Google" })).not.toBeInTheDocument();
  });

  it("si desvincular falla, muestra el error sin desvincular", async () => {
    unlinkIdentity.mockResolvedValue({ data: null, error: { message: "boom", name: "AuthApiError", status: 500 } });
    const user = userEvent.setup();
    renderSection({ googleIdentity: GOOGLE_IDENTITY, hasPassword: true });

    await user.click(screen.getByRole("button", { name: "Desvincular Google" }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "Desvincular" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
