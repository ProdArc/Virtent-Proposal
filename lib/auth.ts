import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

// Um usuário por variável de ambiente — senha nunca fica hardcoded no código
// (que vai pro git), só em .env.local (gitignored).
const USERS: Record<string, string | undefined> = {
  ryan: process.env.ADMIN_PASSWORD,
  lucas: process.env.LUCAS_PASSWORD,
  fratti: process.env.FRATTI_PASSWORD,
  duvaz: process.env.DUVAZ_PASSWORD,
  "ryanvini.dos@gmail.com": process.env.RYANVINI_PASSWORD,
};

export const SESSION_COOKIE = "virtent_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 dias

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET não configurada. Veja .env.local.example.");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("hex");
}

/** Confere usuário/senha contra USERS — usado só pela action de login. */
export function validateCredentials(username: string, password: string): boolean {
  const expected = USERS[username.trim().toLowerCase()];
  return Boolean(expected) && password === expected;
}

/**
 * Sessão sem estado: o cookie carrega `usuario.validade.assinatura`, assinada
 * com HMAC-SHA256 (AUTH_SECRET). Não precisa de tabela de sessões no banco —
 * só 2 usuários fixos, então validar a assinatura é suficiente pra confiar no
 * cookie sem round-trip nenhum.
 */
export function createSessionToken(username: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${username.toLowerCase()}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

/** Valida assinatura + validade do token de sessão e devolve o usuário, ou null. */
export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [username, expiresAtRaw, signature] = parts;

  const expected = sign(`${username}.${expiresAtRaw}`);
  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return username;
}

/** Lê e valida a sessão da requisição atual — usado em Server Components e Server Actions. */
export async function getSessionUser(): Promise<string | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/**
 * Confere a sessão dentro de uma Server Action e devolve uma mensagem de erro
 * pronta pra UI, ou null se autorizado. Defesa em profundidade — o proxy.ts
 * já protege as rotas, mas a doc do Next recomenda não confiar só nisso pra
 * Server Actions (elas são invocadas via POST na mesma rota da página onde
 * vivem, então um matcher mal ajustado no proxy pode acabar não cobrindo).
 */
export async function requireSession(): Promise<string | null> {
  const user = await getSessionUser();
  return user ? null : "Não autorizado.";
}
