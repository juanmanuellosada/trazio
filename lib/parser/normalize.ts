/**
 * Normaliza texto para comparar palabras clave sin distinguir mayúsculas ni
 * acentos (R11, E7). Reemplazo carácter a carácter (no `.normalize("NFD")`
 * + strip de diacríticos) a propósito: así el resultado tiene exactamente
 * la misma longitud que el original, y los rangos `{start, end}` que
 * calculan los reconocedores sobre el texto normalizado siguen siendo
 * válidos como índices del texto original.
 */
const ACCENTED_TO_PLAIN: Record<string, string> = {
  á: "a",
  é: "e",
  í: "i",
  ó: "o",
  ú: "u",
  ü: "u",
  ñ: "n",
};

export function normalize(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const lower = text[i].toLowerCase();
    result += ACCENTED_TO_PLAIN[lower] ?? lower;
  }
  return result;
}
