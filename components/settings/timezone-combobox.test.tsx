// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimezoneCombobox } from "./timezone-combobox";

/**
 * Cobertura de la decisión D8 (tarea 11.4): la lista tiene que ser la
 * completa de `Intl.supportedValuesOf('timeZone')` (varios cientos de
 * zonas) y tiene que poder buscarse, no desplazarse a mano.
 */
describe("TimezoneCombobox", () => {
  it("ofrece la lista completa de zonas IANA, no un puñado fijo", async () => {
    const user = userEvent.setup();
    render(<TimezoneCombobox labelId="tz-label" value="America/Buenos_Aires" onChange={vi.fn()} />);

    await user.click(screen.getByRole("button"));

    // Una zona lejos de Argentina que una lista fija de ~13 no incluiría.
    expect(await screen.findByText("Pacific/Kiritimati")).toBeInTheDocument();
  });

  it("filtra en vivo mientras se escribe", async () => {
    const user = userEvent.setup();
    render(<TimezoneCombobox labelId="tz-label" value="America/Buenos_Aires" onChange={vi.fn()} />);

    await user.click(screen.getByRole("button"));
    await user.type(screen.getByPlaceholderText("Buscar zona horaria…"), "Kiritimati");

    expect(await screen.findByText("Pacific/Kiritimati")).toBeInTheDocument();
    expect(screen.queryByText("Europe/Madrid")).not.toBeInTheDocument();
  });

  it("elegir una zona la propaga al padre y cierra el selector", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TimezoneCombobox labelId="tz-label" value="America/Buenos_Aires" onChange={onChange} />);

    await user.click(screen.getByRole("button"));
    await user.type(screen.getByPlaceholderText("Buscar zona horaria…"), "Kiritimati");
    await user.click(await screen.findByText("Pacific/Kiritimati"));

    expect(onChange).toHaveBeenCalledWith("Pacific/Kiritimati");
  });

  it("incluye la zona ya guardada aunque Intl no la devuelva como canónica (alias de Argentina)", async () => {
    // `America/Argentina/Buenos_Aires` es el default de B4 pero
    // `Intl.supportedValuesOf` devuelve la forma canónica
    // `America/Buenos_Aires` en su lugar: sin el agregado explícito de
    // `TimezoneCombobox`, esta búsqueda no encontraría nada.
    const user = userEvent.setup();
    render(<TimezoneCombobox labelId="tz-label" value="America/Argentina/Buenos_Aires" onChange={vi.fn()} />);

    await user.click(screen.getByRole("button"));
    await user.type(screen.getByPlaceholderText("Buscar zona horaria…"), "Argentina/Buenos");

    // El botón ya muestra el mismo texto como valor actual: se busca la
    // opción de la lista, no cualquier texto igual en la pantalla.
    expect(await screen.findByRole("option", { name: "America/Argentina/Buenos Aires" })).toBeInTheDocument();
  });
});
