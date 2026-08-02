/**
 * Sonido de confirmación al completar una tarea o marcar un hábito
 * (`sonido-al-completar`, D-A/D-C/D-F): sintetizado con la Web Audio API,
 * sin archivo y sin librería. Se llama desde el callback de éxito de la
 * mutación correspondiente (`lib/tasks/mutations.ts`, `lib/habits/mutations.ts`),
 * nunca desde un efecto que observe los datos (D-B) — así queda afuera,
 * sin ninguna guarda especial, lo que deshace la acción, lo que llega por
 * tiempo real y lo que revierte una actualización optimista.
 *
 * Confirmación, no premio (D-C): un solo evento, siempre el mismo. Para
 * afinarlo, tocar `FREQUENCY_HZ`, `DURATION_SECONDS` o `PEAK_GAIN` acá abajo
 * y nada más — no hay otro lugar del código que conozca estos números.
 */

const FREQUENCY_HZ = 520; // Registro medio, apagado — nunca agudo ni brillante.
const DURATION_SECONDS = 0.17; // Con cuerpo pero lejos de los ~250 ms donde empieza a sonar a campanita.
const PEAK_GAIN = 0.15; // Bajado desde 0.18: a igual pico, más duración se escucha más fuerte.

type AudioContextCtor = typeof AudioContext;

let audioContext: AudioContext | null = null;
let soundEnabled = true;

/**
 * Sincroniza el interruptor de Configuración > General con este módulo
 * (`components/providers/preferences-provider.tsx` la llama cuando cambia
 * la preferencia). Viene en `true` por default, igual que la columna.
 */
export function setSoundOnCompleteEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const ctor: AudioContextCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!ctor) return null;
  // D-F: una sola instancia reutilizada, creada con el primer gesto — esta
  // función solo corre dentro de `playCompletionSound`, nunca al cargar la
  // página. Crear una instancia por clic es la vía rápida a que el
  // navegador la corte.
  if (!audioContext) audioContext = new ctor();
  return audioContext;
}

/**
 * Reproduce la confirmación. Nunca está en el camino crítico: si el
 * navegador bloquea o no soporta la API, falla en silencio (D-F, requirement
 * "El sonido nunca bloquea ni interrumpe la acción") — completar la tarea o
 * el hábito no puede depender de que esto funcione.
 */
export function playCompletionSound(): void {
  if (!soundEnabled) return;

  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === "suspended") void context.resume();

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = FREQUENCY_HZ;

    // Ataque casi instantáneo y caída exponencial: un solo evento seco, sin
    // cola de reverberación (D-C).
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(PEAK_GAIN, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + DURATION_SECONDS);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + DURATION_SECONDS + 0.02);
  } catch {
    // Fallar en silencio: nunca mostrar un error por no poder sonar.
  }
}
