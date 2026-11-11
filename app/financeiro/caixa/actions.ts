"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { parseDecimalInput } from "@/lib/financial";
import { recordMovement, reverseManualMovement, setOpeningBalance } from "@/lib/cash";
import {
  cancelManualReceivable,
  createManualReceivable,
  receiveManualReceivable,
} from "@/lib/manual-receivables";

export interface FormState {
  error?: string;
  ok?: boolean;
  savedAs?: "received" | "pending";
}

/**
 * Única movimentação que o usuário cria à mão. Todas as outras nascem das
 * baixas e pagamentos — é o que garante que nada é digitado duas vezes.
 */
export async function saveOpeningBalanceAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const authError = await requireSession();
  if (authError) return { error: authError };

  const raw = String(formData.get("amount") || "").trim();
  const date = String(formData.get("date") || "").trim();
  const negative = formData.get("negative") === "on";

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Informe a data de referência do saldo inicial." };
  }

  const parsed = parseDecimalInput(raw);
  if (parsed === null) return { error: "Informe um valor válido. Ex: 5000 ou 5.000,00." };

  try {
    await setOpeningBalance(negative ? -Math.abs(parsed) : Math.abs(parsed), date);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao salvar o saldo inicial." };
  }

  revalidatePath("/financeiro/caixa");
  revalidatePath("/financeiro/caixa/extrato");
  return { ok: true };
}

/**
 * Entrada manual: dinheiro que não veio de uma baixa de cliente (aporte,
 * devolução, cobrança avulsa...). "Já recebido" lança direto no caixa, como
 * sempre; "Ainda vou receber" só registra a pendência (lib/manual-receivables)
 * — nada entra no caixa até ela ser marcada como recebida. Diferente do saldo
 * inicial, pode ser lançada quantas vezes for preciso — não é upsert de linha
 * única.
 */
export async function addManualEntryAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const authError = await requireSession();
  if (authError) return { error: authError };

  const status = formData.get("status") === "pending" ? "pending" : "received";
  const raw = String(formData.get("amount") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const counterpart = String(formData.get("counterpart") || "").trim();
  const date = String(formData.get("date") || "").trim();

  const parsed = parseDecimalInput(raw);
  if (parsed === null || parsed <= 0) {
    return { error: "Informe um valor válido. Ex: 500 ou 1.500,00." };
  }
  if (!description) return { error: "Descreva a origem da entrada." };
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Data inválida." };

  try {
    if (status === "pending") {
      await createManualReceivable({
        description,
        counterpart: counterpart || null,
        amount: parsed,
        due_date: date || new Date().toISOString().slice(0, 10),
      });
    } else {
      await recordMovement({
        direction: "in",
        amount: parsed,
        kind: "manual",
        description,
        counterpart: counterpart || null,
        sourceType: null,
        sourceId: null,
        occurredAt: date ? new Date(`${date}T12:00:00`).toISOString() : undefined,
      });
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao registrar a entrada." };
  }

  revalidatePath("/financeiro/caixa");
  revalidatePath("/financeiro/caixa/extrato");
  return { ok: true, savedAs: status };
}

/** Marca uma pendência avulsa como recebida — só então ela entra no caixa. */
export async function receiveManualReceivableAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const authError = await requireSession();
  if (authError) return { error: authError };

  const id = String(formData.get("id") || "").trim();
  if (!id) return { error: "Pendência inválida." };
  const date = String(formData.get("date") || "").trim();
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Data inválida." };

  try {
    await receiveManualReceivable(id, date || undefined);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao marcar como recebida." };
  }

  revalidatePath("/financeiro/caixa");
  revalidatePath("/financeiro/caixa/extrato");
  return { ok: true };
}

/** Cancela uma pendência avulsa — se já tinha sido recebida, estorna o caixa também. */
export async function cancelManualReceivableAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const authError = await requireSession();
  if (authError) return { error: authError };

  const id = String(formData.get("id") || "").trim();
  if (!id) return { error: "Pendência inválida." };

  try {
    await cancelManualReceivable(id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao cancelar pendência." };
  }

  revalidatePath("/financeiro/caixa");
  revalidatePath("/financeiro/caixa/extrato");
  return { ok: true };
}

/** Estorna uma entrada manual — a única correção que o extrato oferece direto. */
export async function reverseManualMovementAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const authError = await requireSession();
  if (authError) return { error: authError };

  const id = String(formData.get("id") || "").trim();
  if (!id) return { error: "Movimentação inválida." };

  try {
    await reverseManualMovement(id, "Estornado manualmente");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao estornar a entrada." };
  }

  revalidatePath("/financeiro/caixa");
  revalidatePath("/financeiro/caixa/extrato");
  return { ok: true };
}
