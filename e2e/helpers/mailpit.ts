import { MAILPIT_URL } from "./env";

type MailpitSummary = { ID: string; To: { Address: string }[]; Subject: string };

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mailpit respondió ${res.status} en ${url}.`);
  return (await res.json()) as T;
}

function unescapeHtmlEntities(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}

/**
 * Busca en Mailpit (bandeja local de `pnpm supabase start`, ver
 * `supabase/config.toml` `[local_smtp]`) el correo más reciente para `to` y
 * `subject`, y devuelve el primer link `http(s)` de su HTML: el
 * `{{ .ConfirmationURL }}` de `supabase/templates/confirmation.html` y
 * `recovery.html` (el único href de esas plantillas, ver ese archivo). Poll
 * corto porque no hay SMTP real de por medio — Mailpit lo tiene casi al
 * instante.
 */
export async function waitForEmailLink(options: { to: string; subject: string; timeoutMs?: number }): Promise<string> {
  const { to, subject, timeoutMs = 15_000 } = options;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { messages } = await fetchJson<{ messages: MailpitSummary[] }>(`${MAILPIT_URL}/api/v1/messages?limit=50`);
    const match = messages.find(
      (m) => m.Subject === subject && m.To.some((recipient) => recipient.Address.toLowerCase() === to.toLowerCase()),
    );
    if (match) {
      const full = await fetchJson<{ HTML: string }>(`${MAILPIT_URL}/api/v1/message/${match.ID}`);
      const linkMatch = full.HTML.match(/href="(http[^"]+)"/);
      if (!linkMatch) throw new Error(`El correo "${subject}" para ${to} no tiene ningún link http en el HTML.`);
      return unescapeHtmlEntities(linkMatch[1]);
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw new Error(`No llegó a Mailpit ningún correo con asunto "${subject}" para ${to} en ${timeoutMs}ms.`);
}
