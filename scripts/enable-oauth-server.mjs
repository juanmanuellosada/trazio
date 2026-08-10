// Habilita el servidor OAuth 2.1 de Supabase (beta) en el proyecto hospedado.
//
// `supabase config push` NO sincroniza la sección `[auth.oauth_server]` de
// `supabase/config.toml`: en el código del CLI, las dos funciones que lo
// harían son cuerpos vacíos con `// TODO(cemal) :: implement me`, porque la
// función está en beta. Poner `enabled = true` en `config.toml` no hace nada
// en el proyecto hospedado, y `supabase link` tampoco reporta la deriva — es
// una inconsistencia silenciosa. El único camino reproducible es este script,
// que llama a la Management API directamente
// (openspec/changes/servidor-mcp/design.md, D-A; docs/setup-mcp-oauth-server.md).
//
// Modo de solo lectura por defecto: sin --apply, el script solo hace un GET,
// compara contra el estado deseado y muestra la diferencia. No escribe nada
// hasta que se pasa --apply de forma explícita. Es idempotente: correrlo dos
// veces con --apply no rompe nada (si ya está en el estado deseado, no manda
// ningún PATCH).
//
// Variables de entorno:
//   SUPABASE_ACCESS_TOKEN  Token personal de la Management API, generado en
//                          https://supabase.com/dashboard/account/tokens
//                          (no es la SUPABASE_SERVICE_ROLE_KEY ni la clave
//                          publicable del proyecto: es un token de cuenta,
//                          con acceso a la configuración de todos tus
//                          proyectos de Supabase — tratarlo como una
//                          contraseña, nunca commitearlo, nunca loguearlo).
//   SUPABASE_PROJECT_REF   Identificador del proyecto hospedado (el de la URL
//                          del dashboard: supabase.com/dashboard/project/<ref>).
//                          También se puede pasar como --project-ref=<ref>.
//
// Uso:
//   node scripts/enable-oauth-server.mjs                     # solo lectura (default)
//   node scripts/enable-oauth-server.mjs --apply              # aplica el cambio
//   node scripts/enable-oauth-server.mjs --project-ref=xxxx   # o via env var
//
// Ejemplo completo:
//   SUPABASE_ACCESS_TOKEN=sbp_xxx SUPABASE_PROJECT_REF=aqijvhoesjozstzojlzr \
//     node scripts/enable-oauth-server.mjs --apply

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const projectRefArg = args.find((a) => a.startsWith("--project-ref="))?.split("=")[1];

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = projectRefArg ?? process.env.SUPABASE_PROJECT_REF;

// Dominio canónico de producción (lib/site-url.ts): la pantalla de
// consentimiento tiene que vivir en el mismo origen que el Site URL
// configurado en Supabase (limitación del proveedor, ver design.md D-A).
const EXPECTED_SITE_URL_HOST = "www.trazio.com.ar";

const DESIRED = {
  oauth_server_enabled: true,
  oauth_server_allow_dynamic_registration: true,
  oauth_server_authorization_path: "/oauth/consent",
};

if (!ACCESS_TOKEN) {
  console.error(
    "Falta SUPABASE_ACCESS_TOKEN. Generar uno en https://supabase.com/dashboard/account/tokens " +
      "y pasarlo como variable de entorno (ver comentario de cabecera de este script).",
  );
  process.exit(1);
}
if (!PROJECT_REF) {
  console.error(
    "Falta el identificador del proyecto: pasarlo con --project-ref=<ref> o con la variable de " +
      "entorno SUPABASE_PROJECT_REF (el <ref> de supabase.com/dashboard/project/<ref>).",
  );
  process.exit(1);
}

const API_BASE = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;

async function getAuthConfig() {
  const res = await fetch(`${API_BASE}/config/auth`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`GET config/auth: ${res.status} ${res.statusText} — ${await res.text()}`);
  }
  return res.json();
}

async function patchAuthConfig(body) {
  const res = await fetch(`${API_BASE}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`PATCH config/auth: ${res.status} ${res.statusText} — ${await res.text()}`);
  }
  return res.json();
}

// Test binario (design.md D-A / tasks.md 1.4): con el servidor OAuth
// apagado, este endpoint devuelve 404 con `feature_disabled`.
async function verifyMetadataEndpoint() {
  const url = `https://${PROJECT_REF}.supabase.co/.well-known/oauth-authorization-server/auth/v1`;
  const res = await fetch(url);
  if (res.status === 404) {
    const body = await res.text().catch(() => "");
    if (body.includes("feature_disabled")) {
      return { ok: false, detail: "404 feature_disabled: el servidor OAuth sigue apagado en el proyecto hospedado." };
    }
    return { ok: false, detail: `404 sin "feature_disabled" en el cuerpo (revisar a mano): ${body}` };
  }
  if (!res.ok) {
    return { ok: false, detail: `${res.status} ${res.statusText}` };
  }
  return { ok: true, detail: "la metadata responde: el servidor OAuth está activo." };
}

function fieldLine(field, current, desired) {
  const same = current === desired;
  return `  ${same ? "OK " : "!! "}${field}: actual=${JSON.stringify(current)} deseado=${JSON.stringify(desired)}`;
}

async function main() {
  console.log(`Consultando la configuración de auth del proyecto ${PROJECT_REF}...`);
  const current = await getAuthConfig();

  const fields = Object.keys(DESIRED);
  const diffs = fields.map((field) => ({
    field,
    current: current[field],
    desired: DESIRED[field],
    same: current[field] === DESIRED[field],
  }));
  const pending = diffs.filter((d) => !d.same);

  console.log("\n--- Servidor OAuth (oauth_server) ---");
  for (const d of diffs) {
    console.log(fieldLine(d.field, d.current, d.desired));
  }

  // El nombre del campo de Site URL no está confirmado contra la API real
  // (este script no se corrió nunca contra un proyecto hospedado, ver
  // docs/setup-mcp-oauth-server.md): se prueban las dos formas conocidas de
  // la Management API. Si ninguna aparece, no se aborta — se le pide a quien
  // corre el script que lo revise a mano en el panel.
  const siteUrl = current.site_url ?? current.SITE_URL ?? null;
  if (siteUrl) {
    console.log(`\nSite URL configurada: ${siteUrl}`);
    if (!siteUrl.includes(EXPECTED_SITE_URL_HOST)) {
      console.warn(
        `ADVERTENCIA: la pantalla de consentimiento (${DESIRED.oauth_server_authorization_path}) tiene que ` +
          `vivir en el mismo origen que el Site URL del proyecto (limitación del proveedor, ver ` +
          `openspec/changes/servidor-mcp/design.md D-A). El Site URL actual (${siteUrl}) no contiene el ` +
          `dominio esperado (${EXPECTED_SITE_URL_HOST}). Confirmar antes de aplicar.`,
      );
    }
  } else {
    console.warn(
      "\nADVERTENCIA: no se encontró el Site URL en la respuesta de la Management API (revisar a mano en " +
        "Authentication > URL Configuration del panel) — confirmar que coincide con " +
        `${EXPECTED_SITE_URL_HOST} antes de aplicar.`,
    );
  }

  if (pending.length === 0) {
    console.log("\nYa está todo en el estado deseado. Nada para aplicar.");
    if (APPLY) {
      console.log("\nSe pidió --apply igual: verificando el endpoint público de metadata...");
      const result = await verifyMetadataEndpoint();
      console.log(result.ok ? `OK: ${result.detail}` : `ATENCIÓN: ${result.detail}`);
      if (!result.ok) process.exit(1);
    }
    return;
  }

  if (!APPLY) {
    console.log(
      `\n${pending.length} campo(s) difieren de lo deseado. Modo solo lectura (default): no se escribió nada.`,
    );
    console.log("Para aplicar el cambio, correr de nuevo con --apply.");
    return;
  }

  console.log(`\nAplicando ${pending.length} campo(s)...`);
  const body = Object.fromEntries(pending.map((d) => [d.field, d.desired]));
  await patchAuthConfig(body);

  console.log("PATCH aplicado. Confirmando contra la Management API...");
  const after = await getAuthConfig();
  const stillPending = fields.filter((field) => after[field] !== DESIRED[field]);
  if (stillPending.length > 0) {
    console.error(
      `ATENCIÓN: después del PATCH, estos campos siguen sin coincidir: ${stillPending.join(", ")}. Revisar a mano.`,
    );
    process.exit(1);
  }
  console.log("OK: la Management API confirma el estado deseado.");

  console.log("\nConfirmando contra el endpoint público de metadata...");
  const result = await verifyMetadataEndpoint();
  if (!result.ok) {
    console.error(
      `ATENCIÓN: ${result.detail} — la Management API dice que está prendido pero el endpoint público ` +
        "todavía no lo refleja. Puede ser demora de propagación: correr de nuevo el script (sin --apply) " +
        "en un rato para confirmar.",
    );
    process.exit(1);
  }
  console.log(`OK: ${result.detail}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
