import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase";
import { fetchAccounts, fetchItem, fetchRecentTransactions } from "@/lib/pluggy";
import { upsertBankTransactions } from "@/lib/bank-transactions";

export interface PluggyConnectionRow {
  id: string;
  pluggy_item_id: string;
  pluggy_account_id: string;
  institution_name: string;
  account_name: string | null;
  last_synced_at: string | null;
  created_at: string;
}

export async function listConnections(): Promise<PluggyConnectionRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("pluggy_connections")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Falha ao listar contas conectadas: ${error.message}`);
  return data ?? [];
}

/**
 * Chamado depois que o widget Pluggy Connect termina com sucesso (onSuccess
 * só devolve o item.id — as contas em si a gente busca aqui, com as
 * credenciais do servidor). Uma conexão pode ter mais de uma conta (corrente
 * + poupança, por exemplo); salva todas.
 */
export async function saveConnection(itemId: string): Promise<{ accountsSaved: number }> {
  const [accounts, item] = await Promise.all([fetchAccounts(itemId), fetchItem(itemId)]);
  if (accounts.length === 0) throw new Error("Nenhuma conta encontrada para essa conexão.");

  const supabase = getSupabaseServerClient();
  const rows = accounts.map((a) => ({
    pluggy_item_id: itemId,
    pluggy_account_id: a.id,
    institution_name: item.connectorName ?? "Banco conectado",
    account_name: a.name,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("pluggy_connections")
    .upsert(rows, { onConflict: "pluggy_account_id" });
  if (error) throw new Error(`Falha ao salvar conexão bancária: ${error.message}`);

  return { accountsSaved: accounts.length };
}

export async function removeConnection(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("pluggy_connections").delete().eq("id", id);
  if (error) throw new Error(`Falha ao remover conexão: ${error.message}`);
}

/** Busca transações novas de uma conta específica — usado pelo "Sincronizar agora". */
async function syncOne(conn: PluggyConnectionRow): Promise<number> {
  const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const transactions = await fetchRecentTransactions(conn.pluggy_account_id, from);
  await upsertBankTransactions(transactions);

  const supabase = getSupabaseServerClient();
  await supabase
    .from("pluggy_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", conn.id);

  return transactions.length;
}

/**
 * Sincroniza todas as contas conectadas sob demanda, sem esperar o webhook.
 * Janela de 90 dias na primeira sincronização de cada conta pra trazer
 * histórico; depois disso o webhook cobre o dia a dia.
 */
export async function syncAllConnections(): Promise<{ accounts: number; transactions: number }> {
  const connections = await listConnections();
  let transactions = 0;
  for (const conn of connections) {
    transactions += await syncOne(conn);
  }
  return { accounts: connections.length, transactions };
}

export interface LiveBalance {
  connectionId: string;
  institutionName: string;
  accountName: string | null;
  balance: number;
  error?: string;
}

/**
 * Saldo de verdade, buscado na hora direto do banco — pra comparar com o
 * saldo calculado pelo controle interno (cash_balance). Uma conta falhar não
 * derruba as outras; o chamador decide o que fazer com cada erro.
 */
export async function getLiveBalances(): Promise<LiveBalance[]> {
  const connections = await listConnections();
  return Promise.all(
    connections.map(async (conn): Promise<LiveBalance> => {
      try {
        const accounts = await fetchAccounts(conn.pluggy_item_id);
        const account = accounts.find((a) => a.id === conn.pluggy_account_id);
        if (!account) throw new Error("Conta não encontrada na Pluggy.");
        const invested = account.bankData?.automaticallyInvestedBalance ?? 0;
        return {
          connectionId: conn.id,
          institutionName: conn.institution_name,
          accountName: conn.account_name,
          balance: Number(account.balance) + Number(invested),
        };
      } catch (err) {
        return {
          connectionId: conn.id,
          institutionName: conn.institution_name,
          accountName: conn.account_name,
          balance: 0,
          error: err instanceof Error ? err.message : "Falha ao buscar saldo.",
        };
      }
    })
  );
}
