import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase";
import { recordMovement, reverseMovementsFor } from "@/lib/cash";

/**
 * Contas avulsas a receber: cobrança pontual que não vem de mensalidade,
 * implantação nem repasse Meta (ex: serviço avulso, reembolso). Espelha
 * lib/payables.ts em espírito — nasce pendente e só vira caixa quando
 * marcada como recebida — mas sem fornecedor/categoria, porque aqui o volume
 * é baixo e o que importa é só "o que falta cobrar".
 */

export type ManualReceivableStatus = "pending" | "received" | "canceled";

export interface ManualReceivableRow {
  id: string;
  description: string;
  counterpart: string | null;
  amount: number;
  due_date: string;
  status: ManualReceivableStatus;
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

function nowIso() {
  return new Date().toISOString();
}

/** Tabela ainda não existe (migração 016 não rodou) — vira lista vazia, não erro. */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    Boolean(error.message?.includes("manual_receivables"))
  );
}

export async function listManualReceivables(): Promise<ManualReceivableRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("manual_receivables")
    .select("*")
    .order("due_date", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(`Falha ao listar contas avulsas a receber: ${error.message}`);
  }
  return (data ?? []) as ManualReceivableRow[];
}

export async function getManualReceivable(id: string): Promise<ManualReceivableRow | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("manual_receivables")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Falha ao buscar conta a receber: ${error.message}`);
  return data as ManualReceivableRow | null;
}

export interface ManualReceivableInput {
  description: string;
  counterpart: string | null;
  amount: number;
  due_date: string;
}

/** Cria já como "pending" — nada entra no caixa até ser marcada como recebida. */
export async function createManualReceivable(input: ManualReceivableInput): Promise<{ id: string }> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("manual_receivables")
    .insert({ ...input, status: "pending" })
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao lançar conta a receber: ${error.message}`);
  return { id: data.id };
}

export async function deleteManualReceivable(id: string): Promise<void> {
  await reverseMovementsFor("manual_receivable", id, "Conta a receber excluída");
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("manual_receivables").delete().eq("id", id);
  if (error) throw new Error(`Falha ao excluir conta a receber: ${error.message}`);
}

/** Marca como recebida: registra a entrada no caixa com a data informada (default hoje). */
export async function receiveManualReceivable(id: string, occurredAtDate?: string): Promise<void> {
  const receivable = await getManualReceivable(id);
  if (!receivable) throw new Error("Conta a receber não encontrada.");
  if (receivable.status === "received") throw new Error("Essa conta já foi recebida.");

  const occurredAt = occurredAtDate
    ? new Date(`${occurredAtDate}T12:00:00`).toISOString()
    : nowIso();

  await recordMovement({
    direction: "in",
    amount: Number(receivable.amount),
    kind: "manual",
    description: receivable.description,
    counterpart: receivable.counterpart,
    sourceType: "manual_receivable",
    sourceId: receivable.id,
    occurredAt,
  });

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("manual_receivables")
    .update({ status: "received", received_at: occurredAt, updated_at: nowIso() })
    .eq("id", id);
  if (error) throw new Error(`Falha ao marcar como recebida: ${error.message}`);
}

/** Desfaz o recebimento — estorna a movimentação e volta pra pendente. */
export async function unreceiveManualReceivable(id: string): Promise<void> {
  await reverseMovementsFor("manual_receivable", id, "Recebimento desfeito");
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("manual_receivables")
    .update({ status: "pending", received_at: null, updated_at: nowIso() })
    .eq("id", id);
  if (error) throw new Error(`Falha ao desfazer recebimento: ${error.message}`);
}

/** Cancela — se já tinha sido recebida, estorna o caixa também. */
export async function cancelManualReceivable(id: string): Promise<void> {
  await reverseMovementsFor("manual_receivable", id, "Conta a receber cancelada");
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("manual_receivables")
    .update({ status: "canceled", updated_at: nowIso() })
    .eq("id", id);
  if (error) throw new Error(`Falha ao cancelar conta a receber: ${error.message}`);
}
