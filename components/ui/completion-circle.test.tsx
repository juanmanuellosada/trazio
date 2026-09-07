// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompletionCircle } from "./completion-circle";

// Requirement `sistema-de-componentes` (tarea 1.1-1.5): un único control de
// completar, con cuatro tamaños —uno por superficie que ya existía en el
// código, no dos— y el área tocable de 24×24 como piso en los cuatro. Ver
// `openspec/changes/bloques-de-calendario-consistentes/specs/sistema-de-componentes/spec.md`.

describe("CompletionCircle — los cuatro tamaños", () => {
  it("xs (calendario): círculo de 12px, punto de 4px, área tocable 24×24 (-inset-1.5)", () => {
    render(<CompletionCircle size="xs" checked={false} aria-label="Completar" />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.className).toContain("-inset-1.5");
    const dot = checkbox.firstElementChild as HTMLElement;
    expect(dot.className).toContain("size-3");
  });

  // Guardarraíl parcial (bug real: el ancla era un `<span>` sin `display`
  // propio — `inline` por defecto, así que `width`/`height` no aplicaban y
  // su caja real era 0×0, dejando el área tocable en la mitad del piso de
  // 24×24). Esta aserción solo puede atrapar que la clase de display siga
  // presente en el markup; jsdom no hace layout, así que no puede medir el
  // tamaño real de la caja ni el del `<button absolute -inset-*>` que se
  // posiciona contra ella — esa parte solo la prueba abrir el navegador (o
  // un `boundingBox` de Playwright).
  it("el ancla tiene un display con caja propia, no `inline` (si no, width/height no aplican)", () => {
    render(<CompletionCircle size="xs" checked={false} aria-label="Completar" />);
    const anchor = screen.getByRole("checkbox").parentElement as HTMLElement;
    expect(anchor.className).toMatch(/\b(inline-block|inline-flex|block|flex|grid)\b/);
  });

  it("sm (task-row, habit-today-row): círculo de 16px, punto de 6px, área tocable 24×24 (-inset-1)", () => {
    render(<CompletionCircle size="sm" checked={false} aria-label="Completar" />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.className).toContain("-inset-1");
    expect(checkbox.className).not.toContain("-inset-1.5");
    const dot = checkbox.firstElementChild as HTMLElement;
    expect(dot.className).toContain("size-4");
  });

  it("md (task-detail-content): círculo de 20px, punto de 8px, área tocable 24×24 (-inset-0.5)", () => {
    render(<CompletionCircle size="md" checked={false} aria-label="Completar" />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.className).toContain("-inset-0.5");
    const dot = checkbox.firstElementChild as HTMLElement;
    expect(dot.className).toContain("size-5");
  });

  it("lg (habit-card): círculo de 24px, punto de 8px, área tocable ya en el piso (inset-0)", () => {
    render(<CompletionCircle size="lg" checked={false} aria-label="Completar" />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.className).toContain("inset-0");
    const dot = checkbox.firstElementChild as HTMLElement;
    expect(dot.className).toContain("size-6");
  });
});

describe("CompletionCircle — rol y estado", () => {
  it("anuncia el rol checkbox y el estado marcado", () => {
    render(<CompletionCircle size="md" checked aria-label="Descompletar" />);
    expect(screen.getByRole("checkbox", { name: "Descompletar" })).toHaveAttribute("aria-checked", "true");
  });

  it("anuncia el estado sin marcar", () => {
    render(<CompletionCircle size="md" checked={false} aria-label="Completar" />);
    expect(screen.getByRole("checkbox", { name: "Completar" })).toHaveAttribute("aria-checked", "false");
  });
});

describe("CompletionCircle — color del borde sin marcar", () => {
  it("sin marcar y sin color explícito, usa el token neutro border-input", () => {
    render(<CompletionCircle size="md" checked={false} aria-label="Completar" />);
    const dot = screen.getByRole("checkbox").firstElementChild as HTMLElement;
    expect(dot.className).toContain("border-input");
    expect(dot.style.borderColor).toBe("");
  });

  it("sin marcar y con color explícito, lo aplica como borde", () => {
    render(<CompletionCircle size="md" checked={false} uncheckedColor="#0284C7" aria-label="Completar" />);
    const dot = screen.getByRole("checkbox").firstElementChild as HTMLElement;
    expect(dot.style.borderColor).toBe("rgb(2, 132, 199)");
  });

  it("marcado se ve igual pase lo que pase por uncheckedColor", () => {
    render(<CompletionCircle size="md" checked uncheckedColor="#0284C7" aria-label="Descompletar" />);
    const dot = screen.getByRole("checkbox").firstElementChild as HTMLElement;
    expect(dot.className).toContain("border-primary");
    expect(dot.className).toContain("bg-primary");
    expect(dot.style.borderColor).toBe("");
  });
});
