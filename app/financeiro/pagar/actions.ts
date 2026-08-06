"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { parseDecimalInput } from "@/lib/financial";
import {
  createCategory,
  createSupplier,
  deletePayable,
  deletePayableAttachment,
  deleteSupplier,
  duplicatePayable,
  findOrCreateCategory,
  findOrCreateSupplier,
  mergeCategory,
  payPayable,
  setCategoryArchived,
  setPayableStatus,
  unpayPayable,
  updateCategory,
  updatePayable,
  updateSupplier,
  uploadPayableAttachment,
  createPayable,
  type Recurrence,
} from "@/lib/payables";

export interface FormState {
  error?: string;
}

const LIST = "/financeiro/pagar";

async function guard(): Promise<string | null> {
  return requireSession();
}

function refresh() {
  revalidatePath(LIST);
  revalidatePath("/financeiro/pagar/fornecedores");
  revalidatePath("/financeiro/pagar/categorias");
  revalidatePath("/financeiro/dashboard");
}

// ── Contas ─────────────────────────────────────────────────────────────

export async function createPayableAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const authError = await guard();
  if (authError) return { error: authError };

  const supplierName = String(formData.get("supplier") || "").trim();
  const categoryName = String(formData.get("category") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const amountRaw = String(formData.get("amount") || "").trim();
  const dueDate = String(formData.get("dueDate") || "").trim();

  if (!supplierName) return { error: "Informe o fornecedor." };
  if (!categoryName) return { error: "Informe a categoria." };
  if (!amountRaw) return { error: "Informe o valor." };
  if (!dueDate) return { error: "Informe a data de vencimento." };

  const amount = parseDecimalInput(amountRaw);
  if (amount === null || amount <= 0) return { error: "Valor inválido. Use números, ex: 1200 ou 1200,50." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { error: "Data de vencimento inválida." };

  const installments = Number(formData.get("installments") || 1);
  const recurrenceRaw = String(formData.get("recurrence") || "").trim();
  const recurrence = (["monthly", "weekly", "yearly"] as const).includes(recurrenceRaw as Recurrence)
    ? (recurrenceRaw as Recurrence)
    : null;
  const occurrences = Number(formData.get("occurrences") || 1);

  if (installments > 1 && recurrence) {
    return { error: "Use parcelamento OU recorrência, não os dois na mesma conta." };
  }
  if (!Number.isInteger(installments) || installments < 1 || installments > 60) {
    return { error: "Número de parcelas precisa ser entre 1 e 60." };
  }
  if (recurrence && (!Number.isInteger(occurrences) || occurrences < 1 || occurrences > 60)) {
    return { error: "Número de ocorrências precisa ser entre 1 e 60." };
  }

  try {
    const supplierId = await findOrCreateSupplier(supplierName);
    const categoryId = await findOrCreateCategory(categoryName);
    await createPayable(
      {
        supplier_id: supplierId,
        category_id: categoryId,
        title: title || categoryName,
        amount,
        due_date: dueDate,
        issue_date: String(formData.get("issueDate") || "").trim() || null,
        payment_method: String(formData.get("paymentMethod") || "").trim() || null,
        account_origin: String(formData.get("accountOrigin") || "").trim() || null,
        cost_center: String(formData.get("costCenter") || "").trim() || null,
        notes: String(formData.get("notes") || "").trim() || null,
      },
      { recurrence, occurrences, installments }
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao lançar a conta." };
  }

  redirect(LIST);
}

export async function updatePayableAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const authError = await guard();
  if (authError) return { error: authError };

  const id = String(formData.get("id") || "");
  const supplierName = String(formData.get("supplier") || "").trim();
  const categoryName = String(formData.get("category") || "").trim();
  const amountRaw = String(formData.get("amount") || "").trim();
  const dueDate = String(formData.get("dueDate") || "").trim();

  if (!id) return { error: "Conta inválida." };
  if (!supplierName || !categoryName || !amountRaw || !dueDate) {
    return { error: "Fornecedor, categoria, valor e vencimento são obrigatórios." };
  }
  const amount = parseDecimalInput(amountRaw);
  if (amount === null || amount <= 0) return { error: "Valor inválido." };

  try {
    await updatePayable(id, {
      supplier_id: await findOrCreateSupplier(supplierName),
      category_id: await findOrCreateCategory(categoryName),
      title: String(formData.get("title") || "").trim() || categoryName,
      amount,
      due_date: dueDate,
      issue_date: String(formData.get("issueDate") || "").trim() || null,
      payment_method: String(formData.get("paymentMethod") || "").trim() || null,
      account_origin: String(formData.get("accountOrigin") || "").trim() || null,
      cost_center: String(formData.get("costCenter") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao atualizar a conta." };
  }

  revalidatePath(`/financeiro/pagar/${id}`);
  refresh();
  return {};
}

/** Quita o restante. Usada pela ação rápida do card compacto. */
export async function quickPayAction(id: string): Promise<void> {
  const authError = await guard();
  if (authError) throw new Error(authError);
  await payPayable(id);
  refresh();
}

export async function partialPayAction(formData: FormData): Promise<void> {
  const authError = await guard();
  if (authError) throw new Error(authError);
  const id = String(formData.get("id") || "");
  const amount = parseDecimalInput(String(formData.get("amount") || ""));
  if (!id) throw new Error("Conta inválida.");
  if (amount === null || amount <= 0) throw new Error("Informe um valor de pagamento válido.");
  await payPayable(id, amount);
  revalidatePath(`/financeiro/pagar/${id}`);
  refresh();
}

export async function unpayAction(id: string): Promise<void> {
  const authError = await guard();
  if (authError) throw new Error(authError);
  await unpayPayable(id);
  refresh();
}

export async function cancelPayableAction(formData: FormData): Promise<void> {
  const authError = await guard();
  if (authError) throw new Error(authError);
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Conta inválida.");
  await setPayableStatus(id, "canceled");
  refresh();
}

export async function reopenPayableAction(formData: FormData): Promise<void> {
  const authError = await guard();
  if (authError) throw new Error(authError);
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Conta inválida.");
  await setPayableStatus(id, "pending");
  refresh();
}

export async function duplicatePayableAction(formData: FormData): Promise<void> {
  const authError = await guard();
  if (authError) throw new Error(authError);
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Conta inválida.");
  const { id: newId } = await duplicatePayable(id);
  refresh();
  redirect(`/financeiro/pagar/${newId}`);
}

export async function deletePayableAction(formData: FormData): Promise<void> {
  const authError = await guard();
  if (authError) throw new Error(authError);
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Conta inválida.");
  await deletePayable(id);
  refresh();
  redirect(LIST);
}

export async function uploadAttachmentAction(formData: FormData): Promise<void> {
  const authError = await guard();
  if (authError) throw new Error(authError);
  const id = String(formData.get("id") || "");
  const file = formData.get("file");
  if (!id) throw new Error("Conta inválida.");
  if (!(file instanceof File) || file.size === 0) throw new Error("Selecione um arquivo.");
  await uploadPayableAttachment(id, file);
  revalidatePath(`/financeiro/pagar/${id}`);
  refresh();
}

export async function deleteAttachmentAction(formData: FormData): Promise<void> {
  const authError = await guard();
  if (authError) throw new Error(authError);
  const id = String(formData.get("id") || "");
  const path = String(formData.get("path") || "");
  if (!id || !path) throw new Error("Anexo inválido.");
  await deletePayableAttachment(id, path);
  revalidatePath(`/financeiro/pagar/${id}`);
  refresh();
}

// ── Fornecedores ───────────────────────────────────────────────────────

function supplierInputFrom(formData: FormData) {
  return {
    name: String(formData.get("name") || "").trim(),
    document: String(formData.get("document") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    phone: String(formData.get("phone") || "").trim() || null,
    notes: String(formData.get("notes") || "").trim() || null,
  };
}

export async function saveSupplierAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const authError = await guard();
  if (authError) return { error: authError };

  const id = String(formData.get("id") || "");
  const input = supplierInputFrom(formData);
  if (!input.name) return { error: "Informe o nome do fornecedor." };

  try {
    if (id) await updateSupplier(id, input);
    else await createSupplier(input);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao salvar fornecedor." };
  }
  refresh();
  return {};
}

export async function deleteSupplierAction(formData: FormData): Promise<void> {
  const authError = await guard();
  if (authError) throw new Error(authError);
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Fornecedor inválido.");
  await deleteSupplier(id);
  refresh();
}

// ── Categorias ─────────────────────────────────────────────────────────

export async function saveCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const authError = await guard();
  if (authError) return { error: authError };

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const color = String(formData.get("color") || "#71717A").trim();
  if (!name) return { error: "Informe o nome da categoria." };
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { error: "Cor inválida." };

  try {
    if (id) await updateCategory(id, { name, color });
    else await createCategory({ name, color });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao salvar categoria." };
  }
  refresh();
  return {};
}

export async function archiveCategoryAction(formData: FormData): Promise<void> {
  const authError = await guard();
  if (authError) throw new Error(authError);
  const id = String(formData.get("id") || "");
  const archived = String(formData.get("archived") || "") === "true";
  if (!id) throw new Error("Categoria inválida.");
  await setCategoryArchived(id, archived);
  refresh();
}

export async function mergeCategoryAction(formData: FormData): Promise<void> {
  const authError = await guard();
  if (authError) throw new Error(authError);
  const fromId = String(formData.get("fromId") || "");
  const toId = String(formData.get("toId") || "");
  if (!fromId || !toId) throw new Error("Selecione as duas categorias.");
  await mergeCategory(fromId, toId);
  refresh();
}
