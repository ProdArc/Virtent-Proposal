import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase";
import { recordMovement, reverseMovementsFor } from "@/lib/cash";

// Camada de dados de contas a pagar. Espelha lib/financial.ts em estilo:
// funções finas por operação, erro com mensagem em português, sem ORM.

export interface SupplierRow {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  color: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export type PayableStatus = "pending" | "paid" | "canceled";
export type Recurrence = "monthly" | "weekly" | "yearly";

export interface PayableRow {
  id: string;
  supplier_id: string;
  category_id: string;
  title: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  issue_date: string | null;
  status: PayableStatus;
  payment_method: string | null;
  account_origin: string | null;
  cost_center: string | null;
  notes: string | null;
  attachment_path: string | null;
  recurrence: Recurrence | null;
  recurrence_group_id: string | null;
  installment_number: number | null;
  installment_total: number | null;
  paid_at: string | null;
  status_changed_at: string | null;
  created_at: string;
  updated_at: string;
}

const PAYABLE_BUCKET = "comprovantes";

function nowIso() {
  return new Date().toISOString();
}

/** Compara nomes ignorando acento, caixa e espaço — evita "Google" e "google llc " virarem dois cadastros. */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ── Fornecedores ───────────────────────────────────────────────────────

export async function listSuppliers(): Promise<SupplierRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("payable_suppliers")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(`Falha ao listar fornecedores: ${error.message}`);
  return data ?? [];
}

export async function getSupplier(id: string): Promise<SupplierRow | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("payable_suppliers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Falha ao buscar fornecedor: ${error.message}`);
  return data as SupplierRow | null;
}

export interface SupplierInput {
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export async function createSupplier(input: SupplierInput): Promise<{ id: string }> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("payable_suppliers")
    .insert(input)
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao criar fornecedor: ${error.message}`);
  return { id: data.id };
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("payable_suppliers")
    .update({ ...input, updated_at: nowIso() })
    .eq("id", id);
  if (error) throw new Error(`Falha ao atualizar fornecedor: ${error.message}`);
}

export async function deleteSupplier(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("payable_suppliers").delete().eq("id", id);
  if (error) {
    // 23503 = foreign_key_violation: existe conta lançada apontando pra ele.
    if (error.code === "23503") {
      throw new Error(
        "Não é possível excluir: este fornecedor tem contas lançadas. Exclua ou reclassifique as contas antes."
      );
    }
    throw new Error(`Falha ao excluir fornecedor: ${error.message}`);
  }
}

/** Acha pelo nome normalizado ou cria — é o que faz o autocomplete não duplicar cadastro. */
export async function findOrCreateSupplier(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Informe o fornecedor.");
  const existing = (await listSuppliers()).find(
    (s) => normalizeName(s.name) === normalizeName(trimmed)
  );
  if (existing) return existing.id;
  const { id } = await createSupplier({
    name: trimmed,
    document: null,
    email: null,
    phone: null,
    notes: null,
  });
  return id;
}

// ── Categorias ─────────────────────────────────────────────────────────

export async function listCategories(includeArchived = false): Promise<CategoryRow[]> {
  const supabase = getSupabaseServerClient();
  let query = supabase.from("payable_categories").select("*").order("name", { ascending: true });
  if (!includeArchived) query = query.eq("archived", false);
  const { data, error } = await query;
  if (error) throw new Error(`Falha ao listar categorias: ${error.message}`);
  return data ?? [];
}

export interface CategoryInput {
  name: string;
  color: string;
}

export async function createCategory(input: CategoryInput): Promise<{ id: string }> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("payable_categories")
    .insert(input)
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao criar categoria: ${error.message}`);
  return { id: data.id };
}

export async function updateCategory(id: string, input: CategoryInput): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("payable_categories")
    .update({ ...input, updated_at: nowIso() })
    .eq("id", id);
  if (error) throw new Error(`Falha ao atualizar categoria: ${error.message}`);
}

/** Arquiva em vez de excluir — as contas já lançadas mantêm a categoria no histórico. */
export async function setCategoryArchived(id: string, archived: boolean): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("payable_categories")
    .update({ archived, updated_at: nowIso() })
    .eq("id", id);
  if (error) throw new Error(`Falha ao arquivar categoria: ${error.message}`);
}

/** Move todas as contas de uma categoria pra outra e arquiva a origem. */
export async function mergeCategory(fromId: string, toId: string): Promise<void> {
  if (fromId === toId) throw new Error("Escolha uma categoria de destino diferente.");
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("payables")
    .update({ category_id: toId, updated_at: nowIso() })
    .eq("category_id", fromId);
  if (error) throw new Error(`Falha ao mesclar categorias: ${error.message}`);
  await setCategoryArchived(fromId, true);
}

export async function findOrCreateCategory(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Informe a categoria.");
  const existing = (await listCategories(true)).find(
    (c) => normalizeName(c.name) === normalizeName(trimmed)
  );
  if (existing) return existing.id;
  const { id } = await createCategory({ name: trimmed, color: "#71717A" });
  return id;
}

// ── Contas ─────────────────────────────────────────────────────────────

export async function listPayables(): Promise<PayableRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("payables")
    .select("*")
    .order("due_date", { ascending: true });
  if (error) throw new Error(`Falha ao listar contas a pagar: ${error.message}`);
  return data ?? [];
}

export async function getPayable(id: string): Promise<PayableRow | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("payables").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Falha ao buscar conta: ${error.message}`);
  return data as PayableRow | null;
}

export interface PayableInput {
  supplier_id: string;
  category_id: string;
  title: string;
  amount: number;
  due_date: string;
  issue_date: string | null;
  payment_method: string | null;
  account_origin: string | null;
  cost_center: string | null;
  notes: string | null;
}

/** Soma meses/semanas/anos a uma data ISO, com o dia clampado pra não estourar o mês. */
export function addRecurrence(dueDateIso: string, recurrence: Recurrence, times: number): string {
  const [year, month, day] = dueDateIso.split("-").map(Number);
  if (recurrence === "weekly") {
    const d = new Date(Date.UTC(year, month - 1, day));
    d.setUTCDate(d.getUTCDate() + 7 * times);
    return d.toISOString().slice(0, 10);
  }
  const monthsToAdd = recurrence === "monthly" ? times : times * 12;
  const target = new Date(Date.UTC(year, month - 1 + monthsToAdd, 1));
  // Dia 31 em mês de 30 vira o último dia daquele mês, não escorrega pro seguinte.
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

/**
 * Cria a conta. Recorrência e parcelamento geram uma LINHA POR OCORRÊNCIA
 * (não um molde), justamente pra dar pra editar o valor de um mês — conta de
 * luz varia — sem mexer nos outros.
 */
export async function createPayable(
  input: PayableInput,
  options: {
    recurrence?: Recurrence | null;
    occurrences?: number;
    installments?: number;
  } = {}
): Promise<{ id: string; created: number }> {
  const supabase = getSupabaseServerClient();
  const { recurrence = null, occurrences = 1, installments = 1 } = options;

  const rows: Record<string, unknown>[] = [];

  if (installments > 1) {
    // Divide o valor e joga a sobra de centavos na primeira parcela.
    const cents = Math.round(input.amount * 100);
    const base = Math.floor(cents / installments);
    const remainder = cents - base * installments;
    for (let i = 0; i < installments; i++) {
      rows.push({
        ...input,
        amount: (base + (i === 0 ? remainder : 0)) / 100,
        due_date: addRecurrence(input.due_date, "monthly", i),
        installment_number: i + 1,
        installment_total: installments,
        title: `${input.title} (${i + 1}/${installments})`,
      });
    }
  } else if (recurrence && occurrences > 1) {
    const groupId = crypto.randomUUID();
    for (let i = 0; i < occurrences; i++) {
      rows.push({
        ...input,
        due_date: addRecurrence(input.due_date, recurrence, i),
        recurrence,
        recurrence_group_id: groupId,
      });
    }
  } else {
    rows.push({ ...input, recurrence });
  }

  const { data, error } = await supabase.from("payables").insert(rows).select("id");
  if (error) throw new Error(`Falha ao lançar conta: ${error.message}`);
  return { id: data[0].id, created: data.length };
}

export async function updatePayable(id: string, input: PayableInput): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("payables")
    .update({ ...input, updated_at: nowIso() })
    .eq("id", id);
  if (error) throw new Error(`Falha ao atualizar conta: ${error.message}`);
}

export async function deletePayable(id: string): Promise<void> {
  await reverseMovementsFor("payable", id, "Conta excluída");

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("payables").delete().eq("id", id);
  if (error) throw new Error(`Falha ao excluir conta: ${error.message}`);
}

/** Duplica a conta como nova, sempre pendente e sem comprovante/pagamento herdado. */
export async function duplicatePayable(id: string): Promise<{ id: string }> {
  const source = await getPayable(id);
  if (!source) throw new Error("Conta não encontrada.");
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("payables")
    .insert({
      supplier_id: source.supplier_id,
      category_id: source.category_id,
      title: source.title,
      amount: source.amount,
      due_date: source.due_date,
      issue_date: source.issue_date,
      payment_method: source.payment_method,
      account_origin: source.account_origin,
      cost_center: source.cost_center,
      notes: source.notes,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao duplicar conta: ${error.message}`);
  return { id: data.id };
}

/**
 * Registra pagamento. `amount` ausente = quita o restante. Pagamento parcial
 * mantém a conta pendente com paid_amount acumulado.
 */
export async function payPayable(id: string, amount?: number): Promise<void> {
  const payable = await getPayable(id);
  if (!payable) throw new Error("Conta não encontrada.");

  const alreadyPaid = Number(payable.paid_amount);
  const total = Number(payable.amount);
  const increment = amount === undefined ? total - alreadyPaid : amount;
  if (increment <= 0) throw new Error("Informe um valor de pagamento maior que zero.");

  const newPaid = Math.min(Math.round((alreadyPaid + increment) * 100) / 100, total);
  const fullyPaid = newPaid >= total;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("payables")
    .update({
      paid_amount: newPaid,
      status: fullyPaid ? "paid" : "pending",
      paid_at: fullyPaid ? nowIso() : payable.paid_at,
      status_changed_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq("id", id);
  if (error) throw new Error(`Falha ao registrar pagamento: ${error.message}`);

  // Caixa: sai só o que foi pago AGORA. Pagamento parcial gera uma
  // movimentação por parcela paga, cada uma com sua data.
  const supplier = await getSupplier(payable.supplier_id);
  await recordMovement({
    direction: "out",
    amount: newPaid - alreadyPaid,
    kind: "payable",
    description: `${payable.title} — ${supplier?.name ?? "fornecedor"}`,
    counterpart: supplier?.name ?? null,
    sourceType: "payable",
    sourceId: payable.id,
  });
}

/**
 * Lança uma conta já paga, direto do extrato bancário — o dinheiro já saiu
 * de verdade, então não faz sentido nascer pendente. Mantém a data real da
 * saída (não "agora"), igual a `payPayable`, mas essa recebe a data de fora
 * em vez de assumir o momento do clique.
 */
export async function createPaidPayable(input: {
  supplierId: string;
  categoryId: string;
  title: string;
  amount: number;
  occurredAt: string; // YYYY-MM-DD
  notes: string | null;
}): Promise<{ id: string; cashMovementId: string | null }> {
  const supabase = getSupabaseServerClient();
  const paidAtIso = new Date(`${input.occurredAt}T12:00:00`).toISOString();

  const { data, error } = await supabase
    .from("payables")
    .insert({
      supplier_id: input.supplierId,
      category_id: input.categoryId,
      title: input.title,
      amount: input.amount,
      paid_amount: input.amount,
      due_date: input.occurredAt,
      status: "paid",
      paid_at: paidAtIso,
      status_changed_at: nowIso(),
      notes: input.notes,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao lançar conta a partir do extrato: ${error.message}`);

  const supplier = await getSupplier(input.supplierId);
  const cashMovementId = await recordMovement({
    direction: "out",
    amount: input.amount,
    kind: "payable",
    description: `${input.title} — ${supplier?.name ?? "fornecedor"}`,
    counterpart: supplier?.name ?? null,
    sourceType: "payable",
    sourceId: data.id,
    occurredAt: paidAtIso,
  });

  return { id: data.id, cashMovementId };
}

/** Desfaz o pagamento por inteiro — volta a conta para pendente e zera o valor pago. */
export async function unpayPayable(id: string): Promise<void> {
  // Estorna TODOS os pagamentos vivos desta conta — inclusive os parciais.
  await reverseMovementsFor("payable", id, "Pagamento desfeito");

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("payables")
    .update({
      paid_amount: 0,
      status: "pending",
      paid_at: null,
      status_changed_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq("id", id);
  if (error) throw new Error(`Falha ao desfazer pagamento: ${error.message}`);
}

export async function setPayableStatus(id: string, status: PayableStatus): Promise<void> {
  // Cancelar uma conta já paga devolve o dinheiro ao caixa.
  if (status === "canceled") {
    await reverseMovementsFor("payable", id, "Conta cancelada");
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("payables")
    .update({ status, status_changed_at: nowIso(), updated_at: nowIso() })
    .eq("id", id);
  if (error) throw new Error(`Falha ao atualizar status: ${error.message}`);
}

// ── Anexo ──────────────────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9.\-_]+/g, "-");
}

export async function uploadPayableAttachment(id: string, file: File): Promise<void> {
  const supabase = getSupabaseServerClient();
  const path = `pagar/${id}/${Date.now()}-${sanitizeFilename(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(PAYABLE_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (uploadError) throw new Error(`Falha ao enviar anexo: ${uploadError.message}`);

  const { error } = await supabase
    .from("payables")
    .update({ attachment_path: path, updated_at: nowIso() })
    .eq("id", id);
  if (error) throw new Error(`Falha ao vincular anexo: ${error.message}`);
}

export async function deletePayableAttachment(id: string, path: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error: removeError } = await supabase.storage.from(PAYABLE_BUCKET).remove([path]);
  if (removeError) throw new Error(`Falha ao excluir anexo: ${removeError.message}`);

  const { error } = await supabase
    .from("payables")
    .update({ attachment_path: null, updated_at: nowIso() })
    .eq("id", id);
  if (error) throw new Error(`Falha ao desvincular anexo: ${error.message}`);
}

export async function getPayableAttachmentUrl(path: string): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(PAYABLE_BUCKET)
    .createSignedUrl(path, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}
