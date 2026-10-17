"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { findOrCreateCategory, findOrCreateSupplier } from "@/lib/payables";
import {
  dismissBankTransaction,
  linkBankTransactionAsManualIncome,
  linkBankTransactionAsPayable,
} from "@/lib/bank-transactions";

async function assertAuthorized(): Promise<string | null> {
  return requireSession();
}

function revalidateAll() {
  revalidatePath("/financeiro/caixa/banco");
  revalidatePath("/financeiro/caixa");
  revalidatePath("/financeiro/pagar");
}

export async function linkAsPayableAction(formData: FormData): Promise<void> {
  const authError = await assertAuthorized();
  if (authError) throw new Error(authError);

  const bankTxId = String(formData.get("bankTxId") || "");
  const supplierName = String(formData.get("supplier") || "").trim();
  const categoryName = String(formData.get("category") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!bankTxId || !supplierName || !categoryName) {
    throw new Error("Informe fornecedor e categoria.");
  }

  const supplierId = await findOrCreateSupplier(supplierName);
  const categoryId = await findOrCreateCategory(categoryName);

  await linkBankTransactionAsPayable(bankTxId, {
    supplierId,
    categoryId,
    categoryLabel: categoryName,
    title,
    note: note || null,
  });

  revalidateAll();
}

export async function linkAsIncomeAction(formData: FormData): Promise<void> {
  const authError = await assertAuthorized();
  if (authError) throw new Error(authError);

  const bankTxId = String(formData.get("bankTxId") || "");
  const description = String(formData.get("description") || "").trim();
  const counterpart = String(formData.get("counterpart") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!bankTxId || !description) {
    throw new Error("Informe a descrição.");
  }

  await linkBankTransactionAsManualIncome(bankTxId, {
    description,
    counterpart: counterpart || null,
    category: category || "Entrada avulsa",
    note: note || null,
  });

  revalidateAll();
}

export async function dismissBankTransactionAction(formData: FormData): Promise<void> {
  const authError = await assertAuthorized();
  if (authError) throw new Error(authError);

  const bankTxId = String(formData.get("bankTxId") || "");
  if (!bankTxId) throw new Error("Movimentação inválida.");

  await dismissBankTransaction(bankTxId);
  revalidatePath("/financeiro/caixa/banco");
}
