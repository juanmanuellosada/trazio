// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountAvatar } from "./account-avatar";

/**
 * Tests del avatar de cuenta (`foto-de-perfil-de-google`, D-D/D-E):
 * las iniciales son el caso normal (no un estado de carga), la foto se
 * superpone cuando existe y carga bien, y el respaldo a iniciales ante un
 * error de carga está cableado a mano — nunca un hueco ni un ícono roto.
 */
describe("AccountAvatar", () => {
  it("sin avatarUrl, muestra las iniciales del nombre", () => {
    render(<AccountAvatar avatarUrl={null} fullName="Ana Pérez" email="ana@example.com" />);

    expect(screen.getByText("AP")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("sin nombre, usa el correo para las iniciales", () => {
    render(<AccountAvatar avatarUrl={null} fullName={null} email="beto@example.com" />);

    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("con avatarUrl, muestra la foto además de las iniciales de respaldo", () => {
    render(<AccountAvatar avatarUrl="https://lh3.googleusercontent.com/a/foto" fullName="Ana Pérez" email={null} />);

    // Las iniciales siguen en el DOM (nunca son un estado de carga, D-E):
    // la foto se superpone, no las reemplaza condicionalmente hasta cargar.
    expect(screen.getByText("AP")).toBeInTheDocument();
    const img = screen.getByRole("presentation", { hidden: true }) as HTMLImageElement;
    expect(img.tagName).toBe("IMG");
    expect(img.src).toBe("https://lh3.googleusercontent.com/a/foto");
    expect(img).toHaveAttribute("referrerPolicy", "no-referrer");
  });

  it("si la foto falla al cargar, cae a las iniciales sin dejar hueco ni ícono roto", () => {
    render(<AccountAvatar avatarUrl="https://lh3.googleusercontent.com/a/rota" fullName="Ana Pérez" email={null} />);

    const img = screen.getByRole("presentation", { hidden: true });
    fireEvent.error(img);

    expect(screen.queryByRole("presentation", { hidden: true })).not.toBeInTheDocument();
    expect(screen.getByText("AP")).toBeInTheDocument();
  });
});
