"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { parseDecimalInput } from "@/lib/financial";
import { setOpeningBalance } from "@/lib/cash";

export interface FormState {
  error?: string;
  ok?: boolean;
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
