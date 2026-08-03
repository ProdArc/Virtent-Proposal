"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isValidBasicAuth } from "@/lib/auth";
import {
  deleteBilling,
  deleteFinancialClient,
  parseDecimalInput,
  setBillingPaid,
  setSetupPaid,
  updateBillingRevenue,
  updateFinancialClient,
} from "@/lib/financial";

async function assertAuthorized(): Promise<string | null> {
  const authHeader = (await headers()).get("authorization");
  if (!isValidBasicAuth(authHeader)) return "Não autorizado.";
  return null;
}

export interface FormActionState {
  error?: string;
}

export async function updateClientAction(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const authError = await assertAuthorized();
  if (authError) return { error: authError };

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const setupValueRaw = String(formData.get("setupValue") || "").trim();
  const setupDueDate = String(formData.get("setupDueDate") || "").trim();
  const monthlyValueRaw = String(formData.get("monthlyValue") || "").trim();
  const dueDayRaw = String(formData.get("dueDay") || "").trim();
  const firstBillingDate = String(formData.get("firstBillingDate") || "").trim();
  const commissionPctRaw = String(formData.get("commissionPct") || "").trim();

  if (
    !id ||
    !name ||
    !setupValueRaw ||
    !monthlyValueRaw ||
    !dueDayRaw ||
    !firstBillingDate ||
    !commissionPctRaw
  ) {
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

  try {
    await updateFinancialClient(id, {
      name,
      setupValue,
      setupDueDate: setupDueDate || null,
      monthlyValue,
      dueDay,
      firstBillingDate,
      commissionPct,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao atualizar cliente." };
  }

  revalidatePath(`/financeiro/${id}`);
  return {};
}

export async function deleteClientAction(formData: FormData): Promise<void> {
  const authError = await assertAuthorized();
  if (authError) throw new Error(authError);

  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Cliente inválido.");

  await deleteFinancialClient(id);
  redirect("/financeiro");
}

export async function toggleSetupPaidAction(formData: FormData): Promise<void> {
  const authError = await assertAuthorized();
  if (authError) throw new Error(authError);

  const id = String(formData.get("id") || "");
  const paid = String(formData.get("paid") || "") === "true";
  if (!id) throw new Error("Cliente inválido.");

  await setSetupPaid(id, paid);
  revalidatePath(`/financeiro/${id}`);
}

export async function updateBillingRevenueAction(formData: FormData): Promise<void> {
  const authError = await assertAuthorized();
  if (authError) throw new Error(authError);

  const billingId = String(formData.get("billingId") || "");
  const clientId = String(formData.get("clientId") || "");
  const revenueRaw = String(formData.get("revenueAmount") || "").trim();
  if (!billingId || !clientId) throw new Error("Cobrança inválida.");

  const revenueAmount = parseDecimalInput(revenueRaw) ?? 0;
  await updateBillingRevenue(billingId, revenueAmount);
  revalidatePath(`/financeiro/${clientId}`);
}

export async function toggleBillingPaidAction(formData: FormData): Promise<void> {
  const authError = await assertAuthorized();
  if (authError) throw new Error(authError);

  const billingId = String(formData.get("billingId") || "");
  const clientId = String(formData.get("clientId") || "");
  const paid = String(formData.get("paid") || "") === "true";
  if (!billingId || !clientId) throw new Error("Cobrança inválida.");

  await setBillingPaid(billingId, paid);
  revalidatePath(`/financeiro/${clientId}`);
}

export async function deleteBillingAction(formData: FormData): Promise<void> {
  const authError = await assertAuthorized();
  if (authError) throw new Error(authError);

  const billingId = String(formData.get("billingId") || "");
  const clientId = String(formData.get("clientId") || "");
  if (!billingId || !clientId) throw new Error("Cobrança inválida.");

  await deleteBilling(billingId);
  revalidatePath(`/financeiro/${clientId}`);
}
