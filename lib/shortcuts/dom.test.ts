// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { clickButtonByText, clickFirstButton } from "./dom";

describe("clickFirstButton", () => {
  it("clickea el primer botón del contenedor", () => {
    const container = document.createElement("div");
    container.innerHTML = "<button>Uno</button><button>Dos</button>";
    const onClick = vi.fn();
    container.querySelector("button")!.addEventListener("click", onClick);
    clickFirstButton(container);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("no revienta con un contenedor nulo", () => {
    expect(() => clickFirstButton(null)).not.toThrow();
  });
});

describe("clickButtonByText", () => {
  it("clickea el botón cuyo texto coincide, aunque no sea el primero", () => {
    const container = document.createElement("div");
    container.innerHTML = "<button>Mover arriba</button><button>Agregar subtarea</button>";
    const onClick = vi.fn();
    container.querySelectorAll("button")[1].addEventListener("click", onClick);
    clickButtonByText(container, "Agregar subtarea");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("no hace nada si ningún botón coincide", () => {
    const container = document.createElement("div");
    container.innerHTML = "<button>Otra cosa</button>";
    expect(() => clickButtonByText(container, "Agregar subtarea")).not.toThrow();
  });
});
