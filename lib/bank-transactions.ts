import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase";
import { recordMovement } from "@/lib/cash";
import { createPaidPayable } from "@/lib/payables";
import type { PluggyTransaction } from "@/lib/pluggy";

/**
 * Fila de triagem do extrato bancário (Open Finance). Não é fonte de
 * verdade do dinheiro — é só a ponte até virar conta a pagar ou entrada de
 * caixa, que são as tabelas que já faziam isso antes dessa integração
 * existir. Ver supabase/migrations/011_bank_transactions.sql.
 */

export type BankTxStatus = "pending" | "linked" | "dismissed";
export type BankTxLinkedType = "payable" | "manual_income";

export interface BankTransactionRow {
  id: string;
  pluggy_transaction_id: string;
  pluggy_account_id: string;
  occurred_at: string;
  description: string;
  amount: number;
  direction: "in" | "out";
  category: string | null;
  note: string | null;
  status: BankTxStatus;
  linked_type: BankTxLinkedType | null;
  linked_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function listPendingBankTransactions(): Promise<BankTransactionRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("bank_transactions")
    .select(
      "id, pluggy_transaction_id, pluggy_account_id, occurred_at, description, amount, direction, category, note, status, linked_type, linked_id, created_at, updated_at"
    )
    .eq("status", "pending")
    .order("occurred_at", { ascending: false });

  if (error) throw new Error(`Falha ao listar extrato bancário: ${error.message}`);
  return data ?? [];
}

export async function getBankTransaction(id: string): Promise<BankTransactionRow | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("bank_transactions").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Falha ao buscar movimentação: ${error.message}`);
  return data as BankTransactionRow | null;
}

/**
 * Grava transações novas vindas da Pluggy. Idempotente: `pluggy_transaction_id`
 * é único, então reprocessar o mesmo webhook (ou a mesma janela de sync) não
 * duplica nem sobrescreve uma linha que o usuário já classificou.
 */
export async function upsertBankTransactions(transactions: PluggyTransaction[]): Promise<void> {
  if (transactions.length === 0) return;

  const supabase = getSupabaseServerClient();
  const rows = transactions.map((t) => ({
    pluggy_transaction_id: t.id,
    pluggy_account_id: t.accountId,
    occurred_at: t.date.slice(0, 10),
    description: t.description,
    amount: Math.abs(t.amount),
    direction: t.amount >= 0 ? "in" : "out",
    raw: t,
  }));

  const { error } = await supabase
    .from("bank_transactions")
    .upsert(rows, { onConflict: "pluggy_transaction_id", ignoreDuplicates: true });

  if (error) throw new Error(`Falha ao gravar extrato bancário: ${error.message}`);
}

async function markLinked(
  bankTxId: string,
  linkedType: BankTxLinkedType,
  linkedId: string | null
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("bank_transactions")
    .update({
      status: "linked",
      linked_type: linkedType,
      linked_id: linkedId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bankTxId);
  if (error) throw new Error(`Falha ao marcar movimentação como lançada: ${error.message}`);
}

async function saveClassification(bankTxId: string, category: string, note: string | null): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("bank_transactions")
    .update({ category, note, updated_at: new Date().toISOString() })
    .eq("id", bankTxId);
  if (error) throw new Error(`Falha ao salvar classificação: ${error.message}`);
}

/**
 * Lança a saída do extrato como conta a pagar já quitada. Valor e data vêm
 * da própria transação bancária (fonte da verdade), não do formulário — só
 * fornecedor, categoria, título e observação são editáveis pelo usuário.
 */
export async function linkBankTransactionAsPayable(
  bankTxId: string,
  input: { supplierId: string; categoryId: string; categoryLabel: string; title: string; note: string | null }
): Promise<{ payableId: string }> {
  const tx = await getBankTransaction(bankTxId);
  if (!tx) throw new Error("Movimentação não encontrada.");
  if (tx.status !== "pending") throw new Error("Essa movimentação já foi tratada.");
  if (tx.direction !== "out") throw new Error("Essa movimentação é uma entrada, não uma saída.");

  await saveClassification(bankTxId, input.categoryLabel, input.note);
  const { id: payableId } = await createPaidPayable({
    supplierId: input.supplierId,
    categoryId: input.categoryId,
    title: input.title || input.categoryLabel,
    amount: Number(tx.amount),
    occurredAt: tx.occurred_at,
    notes: input.note,
  });
  await markLinked(bankTxId, "payable", payableId);
  return { payableId };
}

/** Lança a entrada do extrato como entrada manual de caixa — mesma convenção da aba Caixa. */
export async function linkBankTransactionAsManualIncome(
  bankTxId: string,
  input: { description: string; counterpart: string | null; category: string; note: string | null }
): Promise<void> {
  const tx = await getBankTransaction(bankTxId);
  if (!tx) throw new Error("Movimentação não encontrada.");
  if (tx.status !== "pending") throw new Error("Essa movimentação já foi tratada.");
  if (tx.direction !== "in") throw new Error("Essa movimentação é uma saída, não uma entrada.");

  await saveClassification(bankTxId, input.category, input.note);
  await recordMovement({
    direction: "in",
    amount: Number(tx.amount),
    kind: "manual",
    description: input.description,
    counterpart: input.counterpart,
    sourceType: null,
    sourceId: null,
    occurredAt: new Date(`${tx.occurred_at}T12:00:00`).toISOString(),
  });
  await markLinked(bankTxId, "manual_income", null);
}

/** Pra quando a movimentação já está contabilizada por outro caminho (ex: PIX de mensalidade). */
export async function dismissBankTransaction(bankTxId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("bank_transactions")
    .update({ status: "dismissed", updated_at: new Date().toISOString() })
    .eq("id", bankTxId);
  if (error) throw new Error(`Falha ao ignorar movimentação: ${error.message}`);
}
