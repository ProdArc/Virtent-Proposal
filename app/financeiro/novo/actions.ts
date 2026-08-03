"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isValidBasicAuth } from "@/lib/auth";
import { createFinancialClient, parseDecimalInput } from "@/lib/financial";

export interface NewFinancialClientState {
  error?: string;
}

export async function createFinancialClientAction(
  _prevState: NewFinancialClientState,
  formData: FormData
): Promise<NewFinancialClientState> {
  const authHeader = (await headers()).get("authorization");
  if (!isValidBasicAuth(authHeader)) {
    return { error: "Não autorizado." };
  }

  const name = String(formData.get("name") || "").trim();
  const cnpj = String(formData.get("cnpj") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const setupValueRaw = String(formData.get("setupValue") || "").trim();
  const setupDueDate = String(formData.get("setupDueDate") || "").trim();
  const monthlyValueRaw = String(formData.get("monthlyValue") || "").trim();
  const dueDayRaw = String(formData.get("dueDay") || "").trim();
  const firstBillingDate = String(formData.get("firstBillingDate") || "").trim();
  const commissionPctRaw = String(formData.get("commissionPct") || "").trim();

  if (!name || !setupValueRaw || !monthlyValueRaw || !dueDayRaw || !firstBillingDate || !commissionPctRaw) {
    return { error: "Preencha todos os campos obrigatórios." };
  }

  const setupValue = parseDecimalInput(setupValueRaw);
  const monthlyValue = parseDecimalInput(monthlyValueRaw);
  const commissionPct = parseDecimalInput(commissionPctRaw);
  const dueDay = Number(dueDayRaw);

  if (setupValue === null || monthlyValue === null || commissionPct === null) {
    return { error: "Valores inválidos. Use números, ex: 2200 ou 2200,00." };
  }

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
      monthlyValue,
      dueDay,
      firstBillingDate,
      commissionPct,
    });
    clientId = created.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido ao criar cliente." };
  }

  redirect(`/financeiro/${clientId}`);
}
