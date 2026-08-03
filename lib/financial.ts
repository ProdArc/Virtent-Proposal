import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase";

export interface FinancialClientRow {
  id: string;
  name: string;
  setup_value: number;
  setup_due_date: string | null;
  setup_paid: boolean;
  setup_paid_at: string | null;
  monthly_value: number;
  commission_pct: number;
  due_day: number;
  first_billing_date: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialBillingRow {
  id: string;
  client_id: string;
  due_date: string;
  monthly_value: number;
  commission_pct: number;
  revenue_amount: number;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingTotals {
  commission_value: number;
  total_value: number;
}

/** Calcula comissão e total a cobrar de uma cobrança mensal: mensalidade + (% comissão * valor arrecadado). */
export function calcBillingTotal(billing: {
  monthly_value: number;
  commission_pct: number;
  revenue_amount: number;
}): BillingTotals {
  const commission_value = round2((billing.commission_pct / 100) * billing.revenue_amount);
  const total_value = round2(billing.monthly_value + commission_value);
  return { commission_value, total_value };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Converte o valor mascarado pelo CurrencyInput ("2.200,00", pt-BR) de volta pra número. */
export function parseDecimalInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/**
 * Reexecuta `fn` uma vez após uma breve espera se a primeira tentativa lançar
 * uma exceção (falha de rede/timeout, ex. Supabase "acordando" de hibernação
 * em projetos free tier) — não mascara erros reais de query, que o
 * supabase-js retorna como `{ error }` em vez de lançar.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return fn();
  }
}

export interface NewFinancialClientInput {
  name: string;
  setupValue: number;
  setupDueDate: string | null;
  monthlyValue: number;
  dueDay: number;
  firstBillingDate: string;
  commissionPct: number;
}

export async function listFinancialClients(): Promise<FinancialClientRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("financial_clients")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar clientes financeiros: ${error.message}`);
  }

  return data ?? [];
}

export interface ClientBillingSummary {
  openCount: number;
  overdueCount: number;
  openTotal: number;
}

/** Resumo de cobranças em aberto por cliente (valor, quantidade, atrasadas), para a listagem principal. */
export async function getBillingSummaryByClient(): Promise<Record<string, ClientBillingSummary>> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("financial_billings")
    .select("client_id, due_date, monthly_value, commission_pct, revenue_amount")
    .eq("paid", false);

  if (error) {
    throw new Error(`Falha ao resumir cobranças em aberto: ${error.message}`);
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const summary: Record<string, ClientBillingSummary> = {};
  for (const row of data ?? []) {
    const current = summary[row.client_id] ?? { openCount: 0, overdueCount: 0, openTotal: 0 };
    current.openCount += 1;
    if (row.due_date < todayIso) current.overdueCount += 1;
    current.openTotal += calcBillingTotal(row).total_value;
    summary[row.client_id] = current;
  }
  return summary;
}

export async function getFinancialClient(id: string): Promise<FinancialClientRow | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("financial_clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar cliente financeiro "${id}": ${error.message}`);
  }

  return data as FinancialClientRow | null;
}

export async function listBillingsForClient(clientId: string): Promise<FinancialBillingRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("financial_billings")
    .select("*")
    .eq("client_id", clientId)
    .order("due_date", { ascending: false });

  if (error) {
    throw new Error(`Falha ao listar cobranças do cliente "${clientId}": ${error.message}`);
  }

  return data ?? [];
}

export async function createFinancialClient(input: NewFinancialClientInput): Promise<{ id: string }> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("financial_clients")
    .insert({
      name: input.name,
      setup_value: input.setupValue,
      setup_due_date: input.setupDueDate,
      monthly_value: input.monthlyValue,
      due_day: input.dueDay,
      first_billing_date: input.firstBillingDate,
      commission_pct: input.commissionPct,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Falha ao criar cliente financeiro: ${error.message}`);
  }

  return { id: data.id };
}

export async function updateFinancialClient(
  id: string,
  input: NewFinancialClientInput
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_clients")
    .update({
      name: input.name,
      setup_value: input.setupValue,
      setup_due_date: input.setupDueDate,
      monthly_value: input.monthlyValue,
      due_day: input.dueDay,
      first_billing_date: input.firstBillingDate,
      commission_pct: input.commissionPct,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao atualizar cliente financeiro "${id}": ${error.message}`);
  }
}

export async function deleteFinancialClient(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("financial_clients").delete().eq("id", id);

  if (error) {
    throw new Error(`Falha ao excluir cliente financeiro "${id}": ${error.message}`);
  }
}

export async function setSetupPaid(id: string, paid: boolean): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_clients")
    .update({
      setup_paid: paid,
      setup_paid_at: paid ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao atualizar status da implantação "${id}": ${error.message}`);
  }
}

/** Soma um mês a uma due_date (YYYY-MM-DD), fixando o dia em `dueDay` (clampado 1-28 pra evitar estouro de mês). */
function nextCycleDueDate(previousDueDateIso: string, dueDay: number): string {
  const [year, month] = previousDueDateIso.split("-").map(Number);
  const day = Math.min(Math.max(dueDay, 1), 28);
  // `month` já vem 1-indexado do split; passar ele (sem -1) pro Date.UTC (0-indexado) avança exatamente 1 mês.
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

/**
 * Geração preguiçosa: garante que existem cobranças para todos os ciclos já
 * vencidos e ainda não gerados. Chamada ao abrir a página de detalhe do
 * cliente — assim o usuário nunca precisa criar a cobrança manualmente, só
 * editar o valor arrecadado e dar baixa.
 *
 * Mensalidade é pós-paga: o 1º ciclo usa exatamente `first_billing_date`
 * (configurado no cadastro do cliente), não "mês atual + due_day" — senão um
 * cliente cadastrado hoje ganharia uma cobrança imediata sem ter usado o
 * serviço por um ciclo ainda. Os ciclos seguintes avançam 1 mês por vez a
 * partir da última cobrança já gerada, e nunca são antecipados: só materializa
 * um ciclo quando o vencimento dele já chegou.
 */
export async function ensureCurrentBilling(client: FinancialClientRow): Promise<void> {
  const supabase = getSupabaseServerClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: lastBilling, error: lastError } = await withRetry(async () =>
    supabase
      .from("financial_billings")
      .select("due_date")
      .eq("client_id", client.id)
      .order("due_date", { ascending: false })
      .limit(1)
      .maybeSingle()
  );

  if (lastError) {
    throw new Error(`Falha ao verificar cobrança do ciclo atual: ${lastError.message}`);
  }

  let nextDueDate = lastBilling
    ? nextCycleDueDate(lastBilling.due_date, client.due_day)
    : client.first_billing_date;

  while (nextDueDate <= todayIso) {
    const { error: insertError } = await withRetry(async () =>
      supabase.from("financial_billings").insert({
        client_id: client.id,
        due_date: nextDueDate,
        monthly_value: client.monthly_value,
        commission_pct: client.commission_pct,
        revenue_amount: 0,
      })
    );

    if (insertError) {
      throw new Error(`Falha ao gerar cobrança do ciclo: ${insertError.message}`);
    }

    nextDueDate = nextCycleDueDate(nextDueDate, client.due_day);
  }
}

export async function updateBillingRevenue(id: string, revenueAmount: number): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_billings")
    .update({ revenue_amount: revenueAmount, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao atualizar valor arrecadado da cobrança "${id}": ${error.message}`);
  }
}

export async function setBillingPaid(id: string, paid: boolean): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_billings")
    .update({
      paid,
      paid_at: paid ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao atualizar status da cobrança "${id}": ${error.message}`);
  }
}

export async function deleteBilling(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("financial_billings").delete().eq("id", id);

  if (error) {
    throw new Error(`Falha ao excluir cobrança "${id}": ${error.message}`);
  }
}
