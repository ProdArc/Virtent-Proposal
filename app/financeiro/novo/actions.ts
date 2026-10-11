"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createFinancialClient, parseBillingMethodsForm, parseDecimalInput } from "@/lib/financial";

export interface NewFinancialClientState {
  error?: string;
}

export async function createFinancialClientAction(
  _prevState: NewFinancialClientState,
  formData: FormData
): Promise<NewFinancialClientState> {
  const authError = await requireSession();
  if (authError) {
    return { error: authError };
  }

  const name = String(formData.get("name") || "").trim();
  const cnpj = String(formData.get("cnpj") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const segment = String(formData.get("segment") || "").trim();
  const setupValueRaw = String(formData.get("setupValue") || "").trim();
  const setupDueDate = String(formData.get("setupDueDate") || "").trim();
  const dueDayRaw = String(formData.get("dueDay") || "").trim();
  const firstBillingDate = String(formData.get("firstBillingDate") || "").trim();

  if (!name || !setupValueRaw || !dueDayRaw || !firstBillingDate) {
    return { error: "Preencha todos os campos obrigatórios." };
  }

  const setupValue = parseDecimalInput(setupValueRaw);
  const dueDay = Number(dueDayRaw);

  if (setupValue === null) {
    return { error: "Valores inválidos. Use números, ex: 2200 ou 2200,00." };
  }

  const methods = parseBillingMethodsForm(formData);
  if ("error" in methods) return { error: methods.error };

  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
    return { error: "Dia de vencimento precisa ser um número entre 1 e 28." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstBillingDate)) {
    return { error: "Primeiro vencimento da mensalidade inválido." };
  }

  let clientId: string;
  try {
    const created = await createFinancialClient({
      name,
      cnpj: cnpj || null,
      email: email || null,
      setupValue,
      setupDueDate: setupDueDate || null,
      dueDay,
      firstBillingDate,
      segment: segment || null,
      ...methods.data,
    });
    clientId = created.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido ao criar cliente." };
  }

  redirect(`/financeiro/${clientId}`);
}
