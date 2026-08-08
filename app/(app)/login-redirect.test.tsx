import { describe, expect, it, vi } from "vitest";
import AppLayout from "./layout";
import BandejaPage from "./bandeja/page";
import HoyPage from "./hoy/page";
import CompletadoPage from "./completado/page";
import ProximosPage from "./proximos/page";

/**
 * Recorrido de las rutas protegidas (tareas 1.3/4.4 de `redireccion-al-login`):
 * un test por página no detecta el riesgo real —olvidarse una—, así que esto
 * recorre `PROTECTED_PREFIXES` completo contra `app/(app)/layout.tsx`, que es
 * el `redirect` que de verdad se ejecuta (D-C: gana sobre el de cada página),
 * y además cubre el `redirect` propio de las cuatro páginas de ruta fija
 * (tarea 1.1) para que quede consistente aunque hoy no se llegue a ejecutar.
 *
 * Los Server Components se invocan directo como funciones (mismo patrón que
 * `lib/supabase/proxy.test.ts` con `updateSession`), sin renderizar. Con
 * `getCurrentUser` mockeado a `null`, el `redirect` mockeado tira antes de
 * llegar a cualquier consulta con `user.id`, así que no hace falta mockearlas.
 */
const { redirectMock, headersGetMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string): never => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  }),
  headersGetMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/headers", () => ({
  headers: async () => ({ get: headersGetMock }),
}));
vi.mock("@/lib/supabase/current-user", () => ({
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));

/** Asegura que un `redirect("/login?next=...")` haya conservado exactamente `destino`. */
function expectRedirectPreservedDestination(destino: string) {
  expect(redirectMock).toHaveBeenCalledTimes(1);
  const [calledWith] = redirectMock.mock.calls[0];
  const url = new URL(calledWith, "http://localhost");
  expect(url.pathname).toBe("/login");
  expect(url.searchParams.get("next")).toBe(destino);
}

/** Una ruta concreta por cada prefijo protegido de `lib/supabase/proxy.ts`, incluidas las de detalle con `id`. */
const PROTECTED_ROUTES = [
  "/bandeja",
  "/hoy",
  "/proximos",
  "/proyecto/proyecto-1",
  "/tarea/tarea-1",
  "/completado",
  "/etiquetas",
  "/etiquetas/etiqueta-1",
  "/filtros",
  "/filtros/filtro-1",
  "/buscar",
  "/habitos",
  "/configuracion",
];

describe("app/(app)/layout.tsx: todo camino al login conserva el destino", () => {
  it.each(PROTECTED_ROUTES)("sin sesión verificable en %s, el redirect conserva ese destino", async (route) => {
    redirectMock.mockClear();
    headersGetMock.mockReset().mockReturnValue(route);

    await expect(AppLayout({ children: null })).rejects.toThrow("NEXT_REDIRECT");

    expectRedirectPreservedDestination(route);
  });

  it("si el header del pathname faltara, igual redirige a login (sin romper)", async () => {
    redirectMock.mockClear();
    headersGetMock.mockReset().mockReturnValue(null);

    await expect(AppLayout({ children: null })).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});

/**
 * Las cuatro páginas de ruta fija: su `redirect` no llega a ejecutarse en la
 * práctica (el del layout gana), pero tiene que quedar consistente.
 */
const PAGINAS_DE_RUTA_FIJA: Array<{ nombre: string; pagina: () => Promise<unknown>; destino: string }> = [
  { nombre: "bandeja", pagina: () => BandejaPage(), destino: "/bandeja" },
  { nombre: "hoy", pagina: () => HoyPage(), destino: "/hoy" },
  { nombre: "completado", pagina: () => CompletadoPage(), destino: "/completado" },
  { nombre: "proximos", pagina: () => ProximosPage(), destino: "/proximos" },
];

describe("páginas de ruta fija: el redirect propio también conserva el destino", () => {
  it.each(PAGINAS_DE_RUTA_FIJA)("$nombre redirige conservando $destino", async ({ pagina, destino }) => {
    redirectMock.mockClear();

    await expect(pagina()).rejects.toThrow("NEXT_REDIRECT");

    expectRedirectPreservedDestination(destino);
  });
});
