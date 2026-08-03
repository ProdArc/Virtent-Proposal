import "server-only";

// Um usuário por variável de ambiente — senha nunca fica hardcoded no código
// (que vai pro git), só em .env.local (gitignored).
const USERS: Record<string, string | undefined> = {
  ryan: process.env.ADMIN_PASSWORD,
  lucas: process.env.LUCAS_PASSWORD,
};

/**
 * Valida um header "Authorization: Basic ..." contra os usuários em USERS.
 * Usado pelo proxy.ts (gate da rota /propostas) e, por segurança, de novo
 * dentro de cada Server Action sensível — Server Functions são invocadas via
 * POST na mesma rota da página onde vivem, então em teoria o matcher do
 * proxy já cobre, mas a doc do Next recomenda explicitamente não confiar só
 * nisso: https://nextjs.org/docs .../file-conventions/proxy#execution-order
 */
export function isValidBasicAuth(authHeader: string | null): boolean {
  if (!authHeader?.startsWith("Basic ")) return false;

  const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
  const separatorIndex = decoded.indexOf(":");
  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  const expected = USERS[username];
  return Boolean(expected) && password === expected;
}
