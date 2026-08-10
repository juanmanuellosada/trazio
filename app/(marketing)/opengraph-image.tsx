import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Tarjeta de Open Graph (bloque 12.7 del rediseño "El editor"): generada con
 * `ImageResponse` a partir del logo y la tipografía de marca, versionada en
 * el repo en vez de depender de una captura de pantalla. Se lee el logo del
 * sistema de archivos (`fs.readFile`, sin red) para que el build no dependa
 * de conectividad — `fetch(new URL(..., import.meta.url))` para un archivo
 * local falla con Turbopack ("fetch failed: not implemented"). Sin fuente
 * Inter cargada acá a propósito: Satori necesita el archivo de la fuente
 * aparte, y traerlo de red en build time introduciría una dependencia frágil
 * para una sola imagen — la familia `sans-serif` del sistema es una
 * degradación aceptable en una tarjeta que casi nadie mira de cerca.
 */
export const alt = "Trazio — Tareas, hábitos y calendario";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logoBuffer = await readFile(join(process.cwd(), "public/logo.png"));
  // Satori pide un ArrayBuffer real: el de un Buffer de Node puede venir con
  // offset/padding, así que no alcanza con `.buffer` solo.
  const logo = logoBuffer.buffer.slice(logoBuffer.byteOffset, logoBuffer.byteOffset + logoBuffer.byteLength);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#283B56",
          backgroundImage: "radial-gradient(circle at 22% 18%, #3a537a 0%, #283B56 55%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <img src={logo as unknown as string} width={140} height={140} alt="" />
          <span style={{ fontSize: 104, fontWeight: 700, color: "#FFFFFF", letterSpacing: -2 }}>Trazio</span>
        </div>
        <span style={{ marginTop: 28, fontSize: 38, color: "#C7D2E3" }}>
          Tareas, hábitos y calendario. Todo tu día.
        </span>
      </div>
    ),
    { ...size },
  );
}
