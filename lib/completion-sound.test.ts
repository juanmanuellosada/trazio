// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as CompletionSoundModule from "./completion-sound";

/**
 * Mock mínimo de `AudioContext`: solo lo que `playCompletionSound` toca
 * (oscilador + ganancia + conectar + arrancar/parar). No hay nada que
 * escuchar en un test — el gate solo puede probar que se invoque la API
 * correcta, no que suene bien (eso se escucha en el navegador).
 */
function installAudioContextMock() {
  const oscillator = { type: "", frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
  const gain = {
    gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  };
  const context = {
    state: "running",
    currentTime: 0,
    resume: vi.fn(),
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gain),
    destination: {},
  };
  // `vi.fn(() => context)` con una arrow function no sirve como constructor
  // acá (Vitest 4 la ejecuta con `new` cuando el módulo hace `new ctor()`) —
  // hace falta una `function` de verdad para que `new` la acepte.
  const ctor = vi.fn(function AudioContextMock() {
    return context;
  });
  vi.stubGlobal("AudioContext", ctor);
  return { ctor, context, oscillator, gain };
}

describe("playCompletionSound", () => {
  // El módulo guarda una sola instancia de `AudioContext` en una variable de
  // módulo a propósito (D-F). Eso es justo lo que hay que resetear entre
  // tests: `vi.resetModules()` + reimportar da un módulo nuevo, con el
  // singleton en blanco, para que cada test empiece de cero.
  let mod: typeof CompletionSoundModule;

  beforeEach(async () => {
    vi.unstubAllGlobals();
    vi.resetModules();
    mod = await import("./completion-sound");
  });

  it("crea una sola instancia de AudioContext aunque se llame varias veces (D-F)", () => {
    const { ctor } = installAudioContextMock();

    mod.playCompletionSound();
    mod.playCompletionSound();
    mod.playCompletionSound();

    expect(ctor).toHaveBeenCalledTimes(1);
  });

  it("arranca y para el oscilador una sola vez por llamado", () => {
    const { oscillator } = installAudioContextMock();

    mod.playCompletionSound();

    expect(oscillator.start).toHaveBeenCalledTimes(1);
    expect(oscillator.stop).toHaveBeenCalledTimes(1);
  });

  it("no reproduce nada si el interruptor está apagado", () => {
    const { ctor } = installAudioContextMock();
    mod.setSoundOnCompleteEnabled(false);

    mod.playCompletionSound();

    expect(ctor).not.toHaveBeenCalled();
  });

  it("no explota si el navegador no soporta AudioContext (falla en silencio)", () => {
    vi.stubGlobal("AudioContext", undefined);

    expect(() => mod.playCompletionSound()).not.toThrow();
  });

  it("no explota si createOscillator tira un error", () => {
    const { context } = installAudioContextMock();
    context.createOscillator.mockImplementation(() => {
      throw new Error("boom");
    });

    expect(() => mod.playCompletionSound()).not.toThrow();
  });
});
