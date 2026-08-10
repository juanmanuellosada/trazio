// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { GeneralSection } from "./general-section";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/lib/supabase/client", () => {
  const eq = vi.fn();
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  return {
    createClient: () => ({ from }),
    __mock: { from, update, eq },
  };
});

const { update, eq } = (
  supabaseClientModule as unknown as {
    __mock: { from: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn> };
  }
).__mock;

function renderSection(overrides: Partial<{ soundOnComplete: boolean }> = {}) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <GeneralSection
        userId="user-1"
        timezone="America/Buenos_Aires"
        dateFormat="dd-MM-yyyy"
        timeFormat={24}
        weekStartsOn={1}
        defaultView="bandeja"
        soundOnComplete={overrides.soundOnComplete ?? true}
        dayEndTime="22:00:00"
      />
    </QueryClientProvider>,
  );
}

/**
 * Prueba de punta a punta de la sección General (tarea 11.4/11.5/11.7):
 * elegir una opción tiene que escribir el campo correcto en
 * `user_preferences` para ese `user_id`, y avisarle al resto de la app con
 * `router.refresh()` — sin esto, la pantalla de configuración sería
 * decorativa.
 */
describe("GeneralSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eq.mockResolvedValue({ error: null });
  });

  it("cambiar el formato de hora a 12 horas guarda time_format=12 para el usuario y refresca", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("combobox", { name: "Formato de hora" }));
    await user.click(await screen.findByRole("option", { name: "12 horas (2:30 p. m.)" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ time_format: 12 }));
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("cambiar el formato de fecha guarda date_format", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("combobox", { name: "Formato de fecha" }));
    await user.click(await screen.findByRole("option", { name: "aaaa-mm-dd (2026-12-31)" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ date_format: "yyyy-MM-dd" }));
  });

  it("cambiar el día de inicio de semana a domingo guarda week_starts_on=0 (D15)", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("combobox", { name: "Día de inicio de semana" }));
    await user.click(await screen.findByRole("option", { name: "Domingo" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ week_starts_on: 0 }));
  });

  it("cambiar la pantalla por defecto a Hoy guarda default_view='hoy'", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("combobox", { name: "Pantalla por defecto al entrar" }));
    await user.click(await screen.findByRole("option", { name: "Hoy" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ default_view: "hoy" }));
  });

  it("si el servidor rechaza el cambio, no llama a router.refresh()", async () => {
    eq.mockResolvedValue({ error: new Error("network") });
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("combobox", { name: "Formato de hora" }));
    await user.click(await screen.findByRole("option", { name: "12 horas (2:30 p. m.)" }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(refresh).not.toHaveBeenCalled();
  });

  it("cada selector muestra la etiqueta legible, no el valor crudo guardado", () => {
    renderSection();

    expect(screen.getByRole("combobox", { name: "Formato de fecha" })).toHaveTextContent(
      "dd-mm-aaaa (31-12-2026)",
    );
    expect(screen.getByRole("combobox", { name: "Formato de hora" })).toHaveTextContent("24 horas (14:30)");
    expect(screen.getByRole("combobox", { name: "Día de inicio de semana" })).toHaveTextContent("Lunes");
    expect(screen.getByRole("combobox", { name: "Pantalla por defecto al entrar" })).toHaveTextContent(
      "Bandeja de entrada",
    );
  });

  it("apagar el interruptor de sonido guarda sound_on_complete=false y refresca", async () => {
    const user = userEvent.setup();
    renderSection({ soundOnComplete: true });

    const toggle = screen.getByRole("switch", { name: "Sonido al completar y descompletar" });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await user.click(toggle);

    await waitFor(() => expect(update).toHaveBeenCalledWith({ sound_on_complete: false }));
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("cambiar la hora de fin del día guarda day_end_time y refresca", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("combobox", { name: "Elegir hora de una lista" }));
    await user.click(await screen.findByRole("option", { name: "23:00" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ day_end_time: "23:00" }));
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("el interruptor de sonido arranca apagado si la preferencia ya lo estaba", () => {
    renderSection({ soundOnComplete: false });

    expect(screen.getByRole("switch", { name: "Sonido al completar y descompletar" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });
});
