import "server-only";

/**
 * Cliente da API da Pluggy (agregador Open Finance). Isolado neste arquivo
 * de propósito: é a única peça que fala com um serviço externo, então se o
 * formato de algum endpoint mudar (ou a gente trocar de agregador), o ajuste
 * fica contido aqui — o resto do app só conhece `PluggyTransaction` e
 * `lib/bank-transactions.ts`.
 *
 * Endpoints conferidos contra a API real (conta MeuPluggy conectada), não só
 * contra a documentação — a doc pública ficou desatualizada em pelo menos um
 * ponto (ver `fetchRecentTransactions`). Se algo mudar de novo, o sintoma é
 * sempre um erro vindo de `pluggyFetch` com o status/corpo da resposta.
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
  balance: number;
  // Santander (e outros) varrem o saldo da conta corrente pra uma aplicação
  // automática todo dia — "balance" sozinho mostraria quase sempre perto de
  // zero, mesmo com dinheiro de verdade na conta.
  bankData?: { automaticallyInvestedBalance?: number } | null;
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

/**
 * Busca transações recentes de uma conta — chamado quando o webhook avisa
 * que houve sincronização nova, ou pelo "Sincronizar agora".
 *
 * GET /transactions foi descontinuado pela Pluggy (410 ENDPOINT_DEPRECATED)
 * em favor de GET /v2/transactions, que não aceita mais `from`/`pageSize` —
 * pagina por cursor (`next`) e não filtra por data na query. Por isso busca
 * tudo que o cursor trouxer e filtra `fromDateIso` aqui mesmo.
 */
export async function fetchRecentTransactions(
  accountId: string,
  fromDateIso: string
): Promise<PluggyTransaction[]> {
  const all: PluggyTransaction[] = [];
  let cursor: string | null = null;

  do {
    const query = new URLSearchParams({ accountId });
    if (cursor) query.set("cursor", cursor);
    const data: { results: PluggyTransaction[]; next: string | null } = await pluggyFetch(
      `/v2/transactions?${query.toString()}`
    );
    all.push(...data.results);
    cursor = data.next;
  } while (cursor);

  return all.filter((t) => t.date.slice(0, 10) >= fromDateIso);
}
