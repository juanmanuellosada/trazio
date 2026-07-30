import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { toastError, toastSuccess } from "./toast";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe("toastError", () => {
  it("arma el mensaje de tres partes y se auto-descarta", () => {
    toastError("No pudimos guardar el cambio", "se cortó la conexión", "Revisá tu internet y volvé a intentar.");

    expect(toast.error).toHaveBeenCalledWith(
      "No pudimos guardar el cambio porque se cortó la conexión.",
      expect.objectContaining({ description: "Revisá tu internet y volvé a intentar.", duration: expect.any(Number) }),
    );
    const [, options] = vi.mocked(toast.error).mock.calls[0];
    expect(options?.duration).not.toBe(Infinity);
  });
});

describe("toastSuccess", () => {
  it("un toast informativo se auto-descarta", () => {
    toastSuccess("Tarea duplicada.");

    const [, options] = vi.mocked(toast.success).mock.calls.at(-1)!;
    expect(options?.duration).toEqual(expect.any(Number));
    expect(options?.duration).not.toBe(Infinity);
  });

  it("un toast con acción de deshacer dura más que uno informativo", () => {
    toastSuccess("Tarea eliminada.");
    const [, infoOptions] = vi.mocked(toast.success).mock.calls.at(-1)!;

    toastSuccess("Tarea eliminada.", { action: { label: "Deshacer", onClick: () => {} } });
    const [, actionOptions] = vi.mocked(toast.success).mock.calls.at(-1)!;

    expect(actionOptions?.duration).toBeGreaterThan(infoOptions?.duration as number);
    expect(actionOptions?.duration).not.toBe(Infinity);
  });

  it("conserva la acción pasada además de agregar la duración", () => {
    const onClick = vi.fn();
    toastSuccess("Tarea eliminada.", { action: { label: "Deshacer", onClick } });

    const [, options] = vi.mocked(toast.success).mock.calls.at(-1)!;
    expect(options?.action).toEqual({ label: "Deshacer", onClick });
  });
});
