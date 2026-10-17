import "server-only";

/**
 * Cliente da API da Pluggy (agregador Open Finance). Isolado neste arquivo
 * de propósito: é a única peça que fala com um serviço externo, então se o
 * formato de algum endpoint mudar (ou a gente trocar de agregador), o ajuste
 * fica contido aqui — o resto do app só conhece `PluggyTransaction` e
 * `lib/bank-transactions.ts`.
 *
 * IMPORTANTE: escrito contra a documentação pública da Pluggy, mas sem conta
 * própria pra testar de verdade ainda — confira os endpoints/campos abaixo
 * contra https://docs.pluggy.ai assim que tiver acesso ao sandbox, antes de
 * depender disso em produção.
 */

const PLUGGY_BASE_URL = "https://api.pluggy.ai";

function requireCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET não configuradas. Veja .env.local.example.");
  }
  return { clientId, clientSecret };
}

// A apiKey da Pluggy vale ~2h. Cacheada em memória do processo pra não
// reautenticar a cada chamada — se o processo reiniciar, reautentica na boa.
let cachedApiKey: { key: string; expiresAt: number } | null = null;

async function getApiKey(): Promise<string> {
  if (cachedApiKey && cachedApiKey.expiresAt > Date.now()) return cachedApiKey.key;

  const { clientId, clientSecret } = requireCredentials();
  const res = await fetch(`${PLUGGY_BASE_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!res.ok) {
    throw new Error(`Falha ao autenticar na Pluggy (${res.status}).`);
  }
  const data = (await res.json()) as { apiKey: string };
  cachedApiKey = { key: data.apiKey, expiresAt: Date.now() + 110 * 60 * 1000 };
  return data.apiKey;
}

async function pluggyFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiKey = await getApiKey();
  const res = await fetch(`${PLUGGY_BASE_URL}${path}`, {
    ...init,
    headers: { ...init.headers, "X-API-KEY": apiKey, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Pluggy ${path} falhou (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Token de conexão pro widget "Pluggy Connect" — usado 1x pra ligar a conta
 * bancária (fluxo ainda não construído no app; ver app/financeiro/caixa/banco).
 */
export async function createConnectToken(itemId?: string): Promise<string> {
  const data = await pluggyFetch<{ accessToken: string }>("/connect_token", {
    method: "POST",
    body: JSON.stringify(itemId ? { itemId } : {}),
  });
  return data.accessToken;
}

/** Detalhes do item (a conexão em si) — usado só pra pegar o nome do banco conectado. */
export async function fetchItem(itemId: string): Promise<{ connectorName: string | null }> {
  const data = await pluggyFetch<{ connector?: { name?: string } }>(
    `/items/${encodeURIComponent(itemId)}`
  );
  return { connectorName: data.connector?.name ?? null };
}

export interface PluggyAccount {
  id: string;
  itemId: string;
  name: string;
  number: string | null;
  type: string;
}

/** Contas de um item recém-conectado pelo widget — o widget só devolve o item.id, as contas vêm daqui. */
export async function fetchAccounts(itemId: string): Promise<PluggyAccount[]> {
  const data = await pluggyFetch<{ results: PluggyAccount[] }>(
    `/accounts?itemId=${encodeURIComponent(itemId)}`
  );
  return data.results;
}

export interface PluggyTransaction {
  id: string;
  accountId: string;
  date: string; // ISO
  description: string;
  /** Convenção da Pluggy: negativo = saída da conta, positivo = entrada. */
  amount: number;
}

/** Busca transações recentes de uma conta — chamado quando o webhook avisa que houve sincronização nova. */
export async function fetchRecentTransactions(
  accountId: string,
  fromDateIso: string
): Promise<PluggyTransaction[]> {
  const data = await pluggyFetch<{ results: PluggyTransaction[] }>(
    `/transactions?accountId=${encodeURIComponent(accountId)}&from=${fromDateIso}&pageSize=200`
  );
  return data.results;
}
