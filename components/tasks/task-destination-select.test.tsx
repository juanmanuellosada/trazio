// @vitest-environment jsdom
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TaskDestinationSelect, type TaskDestination } from "./task-destination-select";
import type { ParserProject } from "@/lib/parser/types";

const PROYECTOS: ParserProject[] = [
  {
    id: "p1",
    name: "Trabajo",
    path: "Trabajo",
    icon: "💼",
    sections: [{ id: "s1", name: "Backlog" }],
  },
];

function Harness() {
  const [value, setValue] = useState<TaskDestination>({ projectId: "p1", sectionId: null });
  return <TaskDestinationSelect value={value} onChange={setValue} proyectos={PROYECTOS} />;
}

describe("TaskDestinationSelect", () => {
  it("muestra el nombre de la sección solo, sin concatenar el proyecto", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Proyecto destino" }));

    expect(await screen.findByText("Backlog")).toBeInTheDocument();
    expect(screen.queryByText("Trabajo · Backlog")).not.toBeInTheDocument();
  });

  it("buscar por el nombre del proyecto sigue mostrando sus secciones", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Proyecto destino" }));
    await user.type(screen.getByRole("combobox"), "Trabajo");

    expect(await screen.findByText("Backlog")).toBeInTheDocument();
  });

  it("buscar por el nombre de la sección sigue mostrando su proyecto", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Proyecto destino" }));
    await user.type(screen.getByRole("combobox"), "Backlog");

    expect(await screen.findByText("Trabajo")).toBeInTheDocument();
  });
});
