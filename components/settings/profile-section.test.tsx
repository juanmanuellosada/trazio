// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { ProfileSection } from "./profile-section";

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
  return {
    createClient: () => ({ from, auth: { signInWithPassword, updateUser } }),
    __mock: { from, update, eq },
  };
});

const { update, eq } = (
  supabaseClientModule as unknown as {
    __mock: { from: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn> };
  }
).__mock;

function renderSection() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <ProfileSection userId="user-1" fullName="Juan" email="juan@trazio.com.ar" hasPassword />
    </QueryClientProvider>,
  );
}

describe("ProfileSection (tarea 11.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eq.mockResolvedValue({ error: null });
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
});
