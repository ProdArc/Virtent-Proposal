import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase";
import { recordMovement, reverseMovementsFor } from "@/lib/cash";
import {
  billingKindOf,
  hasMonthlyBilling,
  parsePlainDecimal,
  type BillingKind,
} from "@/lib/billing-methods";

export interface FinancialClientRow {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  setup_value: number;
  setup_due_date: string | null;
  setup_paid: boolean;
  setup_paid_at: string | null;
  setup_comprovante_path: string | null;
  setup_nfe_path: string | null;
  setup_pix_link: string | null;
  setup_email_sent_at: string | null;
  monthly_value: number;
  commission_pct: number;
  due_day: number;
  first_billing_date: string;
  segment: string | null;
  canceled_at: string | null;
  bill_fixed: boolean;
  bill_commission: boolean;
  bill_meta: boolean;
  meta_fee_per_dispatch: number;
  meta_first_billing_date: string | null;
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
  kind: BillingKind;
  meta_dispatches: number;
  meta_cost: number;
  meta_fee_per_dispatch: number;
  paid: boolean;
  paid_at: string | null;
  nfe_path: string | null;
  comprovante_path: string | null;
  pix_link: string | null;
  email_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingTotals {
  commission_value: number;
  /** Repasse Meta: adicional da Virtent (disparos * valor por disparo). */
  meta_fee_value: number;
  /** Repasse Meta: custo da Meta só repassado — entra no caixa, mas não é receita da Virtent. */
  pass_through_value: number;
  /** O que é faturamento da Virtent: total sem o custo repassado. */
  revenue_value: number;
  /** Valor do boleto. */
  total_value: number;
}

/**
 * Total a cobrar de uma cobrança:
 * - mensalidade: mensalidade fixa + (% comissão * valor arrecadado)
 * - repasse Meta: custo da Meta + (disparos * adicional por disparo)
 */
export function calcBillingTotal(billing: {
  kind?: BillingKind | null;
  monthly_value: number;
  commission_pct: number;
  revenue_amount: number;
  meta_dispatches?: number | null;
  meta_cost?: number | null;
  meta_fee_per_dispatch?: number | null;
}): BillingTotals {
  if (billingKindOf(billing) === "meta") {
    const meta_fee_value = round2(
      Number(billing.meta_dispatches ?? 0) * Number(billing.meta_fee_per_dispatch ?? 0)
    );
    const pass_through_value = round2(Number(billing.meta_cost ?? 0));
    return {
      commission_value: 0,
      meta_fee_value,
      pass_through_value,
      revenue_value: meta_fee_value,
      total_value: round2(pass_through_value + meta_fee_value),
    };
  }
  const commission_value = round2((billing.commission_pct / 100) * billing.revenue_amount);
  const total_value = round2(billing.monthly_value + commission_value);
  return {
    commission_value,
    meta_fee_value: 0,
    pass_through_value: 0,
    revenue_value: total_value,
    total_value,
  };
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
  cnpj: string | null;
  email: string | null;
  setupValue: number;
  setupDueDate: string | null;
  monthlyValue: number;
  dueDay: number;
  firstBillingDate: string;
  commissionPct: number;
  segment: string | null;
  billFixed: boolean;
  billCommission: boolean;
  billMeta: boolean;
  metaFeePerDispatch: number;
  metaFirstBillingDate: string | null;
}

export type BillingMethodsInput = Pick<
  NewFinancialClientInput,
  | "monthlyValue"
  | "commissionPct"
  | "billFixed"
  | "billCommission"
  | "billMeta"
  | "metaFeePerDispatch"
  | "metaFirstBillingDate"
>;

/**
 * Lê os campos de forma de cobrança dos formulários de cadastro e edição
 * (ver components/financeiro/BillingMethodsFields.tsx). Valor de forma
 * desmarcada continua salvo — remarcar a forma traz o valor de volta.
 */
export function parseBillingMethodsForm(
  formData: FormData
): { data: BillingMethodsInput } | { error: string } {
  const billFixed = formData.get("billFixed") === "on";
  const billCommission = formData.get("billCommission") === "on";
  const billMeta = formData.get("billMeta") === "on";

  if (!billFixed && !billCommission && !billMeta) {
    return { error: "Marque ao menos uma forma de cobrança." };
  }

  const monthlyValue = parseDecimalInput(String(formData.get("monthlyValue") || "")) ?? 0;
  const commissionPct = parsePlainDecimal(String(formData.get("commissionPct") || "")) ?? 0;
  const metaFeePerDispatch = parsePlainDecimal(String(formData.get("metaFeePerDispatch") || "")) ?? 0;
  const metaFirstRaw = String(formData.get("metaFirstBillingDate") || "").trim();

  if (billFixed && monthlyValue <= 0) {
    return { error: "Informe o valor da mensalidade fixa." };
  }
  if (billCommission && (commissionPct <= 0 || commissionPct > 100)) {
    return { error: "Informe o % sobre a arrecadação (entre 0 e 100)." };
  }
  if (billMeta && metaFeePerDispatch < 0) {
    return { error: "O adicional por disparo não pode ser negativo." };
  }
  if (metaFirstRaw && !/^\d{4}-\d{2}-\d{2}$/.test(metaFirstRaw)) {
    return { error: "Primeiro vencimento do repasse Meta inválido." };
  }

  return {
    data: {
      monthlyValue,
      commissionPct,
      billFixed,
      billCommission,
      billMeta,
      metaFeePerDispatch,
      metaFirstBillingDate: metaFirstRaw || null,
    },
  };
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
    .select(
      "client_id, due_date, kind, monthly_value, commission_pct, revenue_amount, meta_dispatches, meta_cost, meta_fee_per_dispatch"
    )
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
    .order("due_date", { ascending: false })
    // "monthly" > "meta": no mesmo ciclo, a mensalidade aparece antes do repasse.
    .order("kind", { ascending: false });

  if (error) {
    throw new Error(`Falha ao listar cobranças do cliente "${clientId}": ${error.message}`);
  }

  return data ?? [];
}

/** Todas as cobranças de todos os clientes — base de agregação do dashboard (/financeiro/dashboard). */
export async function listAllBillings(): Promise<FinancialBillingRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("financial_billings")
    .select("*")
    .order("due_date", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar cobranças: ${error.message}`);
  }

  return data ?? [];
}

export async function getBillingById(id: string): Promise<FinancialBillingRow | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("financial_billings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar cobrança "${id}": ${error.message}`);
  }

  return data as FinancialBillingRow | null;
}

export async function createFinancialClient(input: NewFinancialClientInput): Promise<{ id: string }> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("financial_clients")
    .insert({
      name: input.name,
      cnpj: input.cnpj,
      email: input.email,
      setup_value: input.setupValue,
      setup_due_date: input.setupDueDate,
      monthly_value: input.monthlyValue,
      due_day: input.dueDay,
      first_billing_date: input.firstBillingDate,
      commission_pct: input.commissionPct,
      segment: input.segment,
      bill_fixed: input.billFixed,
      bill_commission: input.billCommission,
      bill_meta: input.billMeta,
      meta_fee_per_dispatch: input.metaFeePerDispatch,
      // Cliente novo com repasse: sem data própria, começa junto da mensalidade.
      meta_first_billing_date:
        input.metaFirstBillingDate ?? (input.billMeta ? input.firstBillingDate : null),
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
      cnpj: input.cnpj,
      email: input.email,
      setup_value: input.setupValue,
      setup_due_date: input.setupDueDate,
      monthly_value: input.monthlyValue,
      due_day: input.dueDay,
      first_billing_date: input.firstBillingDate,
      commission_pct: input.commissionPct,
      segment: input.segment,
      bill_fixed: input.billFixed,
      bill_commission: input.billCommission,
      bill_meta: input.billMeta,
      meta_fee_per_dispatch: input.metaFeePerDispatch,
      meta_first_billing_date: input.metaFirstBillingDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao atualizar cliente financeiro "${id}": ${error.message}`);
  }

  // Forma de cobrança desligada: some com os ciclos FUTUROS dela que ainda
  // estão vazios (gerados com antecedência por ensureCurrentBilling) — senão
  // ficariam como valor a receber fantasma. Ciclo já vencido ou com qualquer
  // dado do usuário fica: pode ser dívida real.
  const disabledKinds: BillingKind[] = [];
  if (!hasMonthlyBilling({ bill_fixed: input.billFixed, bill_commission: input.billCommission })) {
    disabledKinds.push("monthly");
  }
  if (!input.billMeta) disabledKinds.push("meta");
  if (disabledKinds.length === 0) return;

  const todayIso = new Date().toISOString().slice(0, 10);
  const { data: futureRows, error: selectError } = await supabase
    .from("financial_billings")
    .select(
      "id, paid, revenue_amount, meta_dispatches, meta_cost, nfe_path, comprovante_path, pix_link, email_sent_at"
    )
    .eq("client_id", id)
    .in("kind", disabledKinds)
    .gt("due_date", todayIso);

  if (selectError) {
    throw new Error(`Falha ao revisar cobranças futuras: ${selectError.message}`);
  }

  const idsToDelete = (futureRows ?? []).filter((r) => !hasUserData(r)).map((r) => r.id);
  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("financial_billings")
      .delete()
      .in("id", idsToDelete);
    if (deleteError) {
      throw new Error(`Falha ao remover cobranças futuras: ${deleteError.message}`);
    }
  }
}

/**
 * Cancela (ou reativa) um cliente. Diferente de excluir: o histórico de
 * cobranças e o saldo de caixa continuam intactos, e cobranças já em aberto
 * seguem cobráveis normalmente — só para a geração automática (e a manual,
 * ver `generateNextBilling`) de ciclos novos daqui pra frente.
 */
export async function setClientCanceled(id: string, canceled: boolean): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_clients")
    .update({
      canceled_at: canceled ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao atualizar status do cliente "${id}": ${error.message}`);
  }
}

/** Classifica vários clientes de uma vez — pra quando dá pra agrupar por segmento em lote, em vez de um a um. */
export async function bulkSetSegment(clientIds: string[], segment: string | null): Promise<void> {
  if (clientIds.length === 0) return;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_clients")
    .update({ segment, updated_at: new Date().toISOString() })
    .in("id", clientIds);

  if (error) {
    throw new Error(`Falha ao atualizar segmento em massa: ${error.message}`);
  }
}

/** Segmentos já usados, sem repetição e em ordem alfabética — sugestão pro campo de texto livre. */
export function distinctSegments(clients: { segment: string | null }[]): string[] {
  return [...new Set(clients.map((c) => c.segment).filter((s): s is string => Boolean(s)))].sort(
    (a, b) => a.localeCompare(b, "pt-BR")
  );
}

export async function deleteFinancialClient(id: string): Promise<void> {
  // O delete em cascata leva as cobranças junto, então os estornos precisam
  // acontecer antes — inclusive os das cobranças filhas.
  for (const b of await listBillingsForClient(id)) {
    await reverseMovementsFor("billing", b.id, "Cliente excluído");
  }
  await reverseMovementsFor("client_setup", id, "Cliente excluído");

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("financial_clients").delete().eq("id", id);

  if (error) {
    throw new Error(`Falha ao excluir cliente financeiro "${id}": ${error.message}`);
  }
}

export async function setSetupPaid(id: string, paid: boolean): Promise<void> {
  const client = await getFinancialClient(id);
  if (!client) throw new Error("Cliente não encontrado.");

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

  // Caixa: a baixa é o evento que move o dinheiro. Desfazer estorna em vez de
  // apagar, pra não sumir com o histórico.
  if (paid) {
    await recordMovement({
      direction: "in",
      amount: client.setup_value,
      kind: "setup",
      description: `Implantação — ${client.name}`,
      counterpart: client.name,
      sourceType: "client_setup",
      sourceId: client.id,
    });
  } else {
    await reverseMovementsFor("client_setup", client.id, "Baixa desfeita");
  }
}

export async function updateSetupPixLink(id: string, pixLink: string | null): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_clients")
    .update({ setup_pix_link: pixLink, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao atualizar link PIX da implantação "${id}": ${error.message}`);
  }
}

/** Soma `monthsToAdd` meses a uma due_date (YYYY-MM-DD), fixando o dia em `dueDay` (clampado 1-28 pra evitar estouro de mês). */
function cycleDueDatePlusMonths(baseDueDateIso: string, monthsToAdd: number, dueDay: number): string {
  const [year, month] = baseDueDateIso.split("-").map(Number);
  const day = Math.min(Math.max(dueDay, 1), 28);
  // `month` já vem 1-indexado do split; month-1+monthsToAdd no Date.UTC (0-indexado) avança monthsToAdd meses.
  return new Date(Date.UTC(year, month - 1 + monthsToAdd, day)).toISOString().slice(0, 10);
}

export function nextCycleDueDate(previousDueDateIso: string, dueDay: number): string {
  return cycleDueDatePlusMonths(previousDueDateIso, 1, dueDay);
}

/** Diferença aproximada em meses (só ano/mês, ignora o dia) entre duas due_date. */
function monthsBetween(fromIso: string, toIso: string): number {
  const [fy, fm] = fromIso.split("-").map(Number);
  const [ty, tm] = toIso.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

// Teto de ciclos mantidos por cliente. Serve só como proteção contra uma
// `first_billing_date` digitada errada (ex: ano 1900) virar milhares de
// linhas — 3 anos cobre com folga o caso real de cadastrar um cliente antigo
// com histórico. Se a data for mais antiga que isso, os ciclos anteriores a
// essa janela simplesmente não são gerados.
const MAX_CYCLES = 36;

// Quantos ciclos futuros (ainda não vencidos) ficam visíveis com antecedência
// na matriz de "A receber" — não é pré-pagamento nem nada parecido, só a
// linha em aberto aparecendo antes do vencimento pra já dar pra acompanhar.
const FUTURE_CYCLES = 2;

/** Uma cobrança "vazia" (sem nada preenchido pelo usuário) pode ser descartada com segurança na deduplicação. */
function hasUserData(b: {
  paid: boolean;
  revenue_amount: number;
  meta_dispatches?: number | null;
  meta_cost?: number | null;
  nfe_path: string | null;
  comprovante_path: string | null;
  pix_link: string | null;
  email_sent_at: string | null;
}): boolean {
  return (
    b.paid ||
    Number(b.revenue_amount) > 0 ||
    Number(b.meta_dispatches ?? 0) > 0 ||
    Number(b.meta_cost ?? 0) > 0 ||
    Boolean(b.nfe_path) ||
    Boolean(b.comprovante_path) ||
    Boolean(b.pix_link) ||
    Boolean(b.email_sent_at)
  );
}

/**
 * Geração preguiçosa: garante que existe exatamente uma cobrança pra cada
 * ciclo mensal entre `first_billing_date` e hoje, MAIS `FUTURE_CYCLES`
 * referências futuras (ciclos ainda não vencidos) — pra aparecer na lista com
 * antecedência e já dar pra acompanhar/anexar comprovante/NFe antes do
 * vencimento chegar. Chamada ao abrir a página de detalhe do cliente. Cadastrar um
 * cliente antigo (com `first_billing_date` meses atrás) gera todo o histórico
 * de uma vez, pra poder dar baixa nos meses já pagos.
 *
 * Mensalidade é pós-paga: o 1º ciclo usa exatamente `first_billing_date`
 * (configurado no cadastro do cliente), não "mês atual + due_day" — senão um
 * cliente cadastrado hoje ganharia uma cobrança imediata sem ter usado o
 * serviço por um ciclo ainda.
 *
 * Idempotente e seguro sob concorrência: calcula todos os ciclos alvo de uma
 * vez, insere só os que faltam num único INSERT em lote, e no fim remove
 * duplicatas. Isso importa porque em serverless várias invocações rodam em
 * paralelo (prefetch do Next.js, abas duplicadas, F5 rápido) e um
 * "SELECT, se não existe INSERT" ingênuo deixa todas decidirem "não existe"
 * ao mesmo tempo — foi o que gerou milhares de linhas repetidas. A constraint
 * UNIQUE(client_id, due_date, kind) no banco é a trava definitiva (ver
 * supabase/migrations/006 e 011), mas esta função não depende dela pra se
 * manter consistente.
 *
 * A checagem de "já existe" é por MÊS (due_date.slice(0,7)), não pela data
 * exata — de propósito. Se o dia de vencimento do cliente mudar depois que o
 * ciclo do mês já foi gerado, a data-alvo recalculada cai num dia diferente
 * e deixaria de "casar" com a linha existente, criando uma segunda cobrança
 * pro mesmo mês (foi o que aconteceu quando um cliente teve o valor da
 * mensalidade ajustado). Por mês E tipo é o invariante certo: nunca deveria
 * existir mais de uma mensalidade, nem mais de um repasse Meta, pro mesmo
 * ciclo mensal.
 *
 * Cada forma de cobrança ligada no cliente é uma série própria (ver
 * `billingSeries`): a mensalidade (fixo e/ou %) começa em
 * `first_billing_date`, o repasse Meta em `meta_first_billing_date`.
 */
interface BillingSeries {
  kind: BillingKind;
  firstDueDate: string;
}

/** Séries de cobrança que o cliente tem hoje, conforme as formas de cobrança marcadas. */
function billingSeries(client: FinancialClientRow): BillingSeries[] {
  const series: BillingSeries[] = [];
  if (hasMonthlyBilling(client)) {
    series.push({ kind: "monthly", firstDueDate: client.first_billing_date });
  }
  if (client.bill_meta) {
    series.push({
      kind: "meta",
      firstDueDate: client.meta_first_billing_date ?? client.first_billing_date,
    });
  }
  return series;
}

/** Linha nova de cobrança com o snapshot dos valores do cliente no momento da geração. */
function newBillingRow(client: FinancialClientRow, kind: BillingKind, due_date: string) {
  if (kind === "meta") {
    return {
      client_id: client.id,
      due_date,
      kind,
      monthly_value: 0,
      commission_pct: 0,
      revenue_amount: 0,
      meta_fee_per_dispatch: client.meta_fee_per_dispatch,
    };
  }
  return {
    client_id: client.id,
    due_date,
    kind,
    monthly_value: client.bill_fixed ? client.monthly_value : 0,
    commission_pct: client.bill_commission ? client.commission_pct : 0,
    revenue_amount: 0,
  };
}

const cycleKey = (kind: BillingKind, dueDate: string) => `${kind}:${dueDate.slice(0, 7)}`;

export async function ensureCurrentBilling(client: FinancialClientRow): Promise<void> {
  // Cliente cancelado: não gera ciclo novo nenhum, automático ou não — é
  // exatamente o que "cancelar" significa. O histórico e o que já está em
  // aberto continuam intactos.
  if (client.canceled_at) return;

  const supabase = getSupabaseServerClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  // 1. Ciclos que deveriam existir, por série: do primeiro vencimento até o
  //    primeiro que ainda não venceu (inclusive).
  const targets: { kind: BillingKind; dueDate: string }[] = [];
  for (const { kind, firstDueDate } of billingSeries(client)) {
    let cursor = firstDueDate;
    const overshootMonths = monthsBetween(cursor, todayIso) - (MAX_CYCLES - FUTURE_CYCLES);
    if (overshootMonths > 0) {
      cursor = cycleDueDatePlusMonths(cursor, overshootMonths, client.due_day);
    }
    let futurePushed = 0;
    for (let i = 0; i < MAX_CYCLES; i++) {
      targets.push({ kind, dueDate: cursor });
      if (cursor > todayIso && ++futurePushed >= FUTURE_CYCLES) break;
      cursor = nextCycleDueDate(cursor, client.due_day);
    }
  }

  // 2. O que já existe.
  const { data: existing, error: selectError } = await withRetry(async () =>
    supabase
      .from("financial_billings")
      .select(
        "id, due_date, kind, paid, revenue_amount, meta_dispatches, meta_cost, nfe_path, comprovante_path, pix_link, email_sent_at"
      )
      .eq("client_id", client.id)
      .order("created_at", { ascending: true })
  );

  if (selectError) {
    throw new Error(`Falha ao verificar cobranças do cliente: ${selectError.message}`);
  }

  const existingRows = existing ?? [];
  const existingKeys = new Set(existingRows.map((r) => cycleKey(billingKindOf(r), r.due_date)));

  // 3. Insere o que falta, tudo de uma vez (uma ida ao banco, não uma por ciclo).
  const missing = targets.filter((t) => !existingKeys.has(cycleKey(t.kind, t.dueDate)));
  if (missing.length > 0) {
    const { error: insertError } = await withRetry(async () =>
      supabase
        .from("financial_billings")
        .insert(missing.map((t) => newBillingRow(client, t.kind, t.dueDate)))
    );

    // 23505 = unique_violation: outra invocação concorrente criou os mesmos
    // ciclos primeiro. É o resultado esperado, não um erro.
    if (insertError && insertError.code !== "23505") {
      throw new Error(`Falha ao gerar cobranças do ciclo: ${insertError.message}`);
    }
  }

  // 4. Auto-cura: remove duplicatas do mesmo ciclo e tipo (mesmo mês, mesmo
  //    se a data exata difere — ver comentário acima) que tenham escapado,
  //    por corrida antes da constraint existir, dados legados, ou o due_day
  //    do cliente ter mudado. Só apaga linhas vazias — nunca uma com baixa,
  //    anexo, PIX ou e-mail enviado.
  const byCycle = new Map<string, typeof existingRows>();
  for (const row of existingRows) {
    const key = cycleKey(billingKindOf(row), row.due_date);
    byCycle.set(key, [...(byCycle.get(key) ?? []), row]);
  }

  const idsToDelete: string[] = [];
  for (const rows of byCycle.values()) {
    if (rows.length < 2) continue;
    // Mantém a que tem dado do usuário; se nenhuma tiver, mantém a mais antiga.
    const keeper = rows.find(hasUserData) ?? rows[0];
    idsToDelete.push(...rows.filter((r) => r.id !== keeper.id && !hasUserData(r)).map((r) => r.id));
  }

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await withRetry(async () =>
      supabase.from("financial_billings").delete().in("id", idsToDelete)
    );

    if (deleteError) {
      throw new Error(`Falha ao remover cobranças duplicadas: ${deleteError.message}`);
    }
  }
}

/**
 * Gera manualmente o próximo ciclo, além do que `ensureCurrentBilling` já
 * cria automaticamente — pra quando o usuário quer adiantar (ex: já quer
 * anexar NFe do mês seguinte) ou precisa recriar um ciclo que foi excluído
 * de propósito. O "próximo" é sempre a partir da última cobrança já
 * existente (não da data de hoje), pra nunca pular um mês. Gera o próximo
 * ciclo de cada forma de cobrança ligada (mensalidade e/ou repasse Meta).
 */
export async function generateNextBilling(clientId: string): Promise<void> {
  const client = await getFinancialClient(clientId);
  if (!client) throw new Error("Cliente não encontrado.");
  if (client.canceled_at) throw new Error("Cliente cancelado não gera cobrança nova.");

  const existing = await listBillingsForClient(clientId);
  const lastDueDate = existing.reduce(
    (latest, b) => (b.due_date > latest ? b.due_date : latest),
    client.first_billing_date
  );
  // Sem nenhuma cobrança ainda: o "próximo" ciclo é o primeiro mesmo.
  const nextDueDate =
    existing.length === 0 ? client.first_billing_date : nextCycleDueDate(lastDueDate, client.due_day);

  const existingKeys = new Set(existing.map((b) => cycleKey(billingKindOf(b), b.due_date)));
  const rows = billingSeries(client)
    // Série que ainda nem começou (repasse Meta com 1º vencimento mais pra frente) não é adiantada.
    .filter((series) => series.firstDueDate.slice(0, 7) <= nextDueDate.slice(0, 7))
    .filter((series) => !existingKeys.has(cycleKey(series.kind, nextDueDate)))
    .map((series) => newBillingRow(client, series.kind, nextDueDate));

  if (rows.length === 0) throw new Error("Esse ciclo já existe.");

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("financial_billings").insert(rows);

  if (error) {
    if (error.code === "23505") throw new Error("Esse ciclo já existe.");
    throw new Error(`Falha ao gerar próxima mensalidade: ${error.message}`);
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

/** Lança os números do repasse Meta de um ciclo: contatos disparados e custo cobrado pela Meta. */
export async function updateBillingMeta(
  id: string,
  dispatches: number,
  metaCost: number
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_billings")
    .update({
      meta_dispatches: dispatches,
      meta_cost: metaCost,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao atualizar repasse Meta da cobrança "${id}": ${error.message}`);
  }
}

/**
 * Corrige a mensalidade de UM ciclo específico, sem tocar no cadastro do
 * cliente nem nos demais ciclos — cada cobrança guarda seu próprio valor
 * congelado (ver `ensureCurrentBilling`), então mudar o valor no cliente não
 * alcança um ciclo que já foi gerado com o valor antigo. É pra esse caso.
 */
export async function updateBillingMonthlyValue(id: string, monthlyValue: number): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_billings")
    .update({ monthly_value: monthlyValue, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao atualizar mensalidade da cobrança "${id}": ${error.message}`);
  }
}

export async function updateBillingPixLink(id: string, pixLink: string | null): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_billings")
    .update({ pix_link: pixLink, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao atualizar link PIX da cobrança "${id}": ${error.message}`);
  }
}

export async function setBillingPaid(id: string, paid: boolean): Promise<void> {
  const billing = await getBillingById(id);
  if (!billing) throw new Error("Cobrança não encontrada.");
  const client = await getFinancialClient(billing.client_id);

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

  if (paid) {
    const reference = new Date(`${billing.due_date}T00:00:00`).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    const what = billingKindOf(billing) === "meta" ? "Repasse Meta" : "Mensalidade";
    await recordMovement({
      direction: "in",
      amount: calcBillingTotal(billing).total_value,
      kind: "monthly",
      description: `${what} ${reference} — ${client?.name ?? "cliente"}`,
      counterpart: client?.name ?? null,
      sourceType: "billing",
      sourceId: billing.id,
    });
  } else {
    await reverseMovementsFor("billing", billing.id, "Baixa desfeita");
  }
}

export async function deleteBilling(id: string): Promise<void> {
  // Estorna antes de apagar: sem isso, a entrada dessa cobrança ficaria no
  // saldo sem nenhuma cobrança correspondente (saldo fantasma).
  await reverseMovementsFor("billing", id, "Cobrança excluída");

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("financial_billings").delete().eq("id", id);

  if (error) {
    throw new Error(`Falha ao excluir cobrança "${id}": ${error.message}`);
  }
}

const NFE_BUCKET = "nfes";
const COMPROVANTE_BUCKET = "comprovantes";

function sanitizeFilename(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9.\-_]+/g, "-");
}

async function uploadToBucket(bucket: string, path: string, file: File): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });

  if (error) {
    throw new Error(`Falha ao enviar arquivo: ${error.message}`);
  }
}

async function removeFromBucket(bucket: string, path: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(`Falha ao excluir arquivo: ${error.message}`);
  }
}

/** URL assinada temporária (1h) pra visualizar/baixar um anexo — os buckets são privados. */
export async function getFileSignedUrl(bucket: string, path: string): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}

export function getNfeSignedUrl(path: string): Promise<string | null> {
  return getFileSignedUrl(NFE_BUCKET, path);
}

export function getComprovanteSignedUrl(path: string): Promise<string | null> {
  return getFileSignedUrl(COMPROVANTE_BUCKET, path);
}

/**
 * Envia o arquivo de NFe (PDF/XML) de uma cobrança pro bucket privado
 * "nfes". Só chamada pela UI quando a cobrança ainda não tem `nfe_path` —
 * pra substituir um arquivo já enviado, o fluxo é excluir e enviar de novo
 * (ver `deleteBillingNfe`), evitando arquivo órfão no storage.
 */
export async function uploadBillingNfe(
  billingId: string,
  clientId: string,
  file: File
): Promise<void> {
  const path = `${clientId}/${billingId}/${Date.now()}-${sanitizeFilename(file.name)}`;
  await uploadToBucket(NFE_BUCKET, path, file);

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_billings")
    .update({ nfe_path: path, updated_at: new Date().toISOString() })
    .eq("id", billingId);

  if (error) {
    throw new Error(`Falha ao vincular NFe à cobrança: ${error.message}`);
  }
}

export async function deleteBillingNfe(billingId: string, path: string): Promise<void> {
  await removeFromBucket(NFE_BUCKET, path);

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_billings")
    .update({ nfe_path: null, updated_at: new Date().toISOString() })
    .eq("id", billingId);

  if (error) {
    throw new Error(`Falha ao desvincular NFe da cobrança: ${error.message}`);
  }
}

/** Mesma lógica de uploadBillingNfe, mas pro comprovante de pagamento da cobrança mensal (bucket "comprovantes"). */
export async function uploadBillingComprovante(
  billingId: string,
  clientId: string,
  file: File
): Promise<void> {
  const path = `${clientId}/${billingId}/${Date.now()}-${sanitizeFilename(file.name)}`;
  await uploadToBucket(COMPROVANTE_BUCKET, path, file);

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_billings")
    .update({ comprovante_path: path, updated_at: new Date().toISOString() })
    .eq("id", billingId);

  if (error) {
    throw new Error(`Falha ao vincular comprovante à cobrança: ${error.message}`);
  }
}

export async function deleteBillingComprovante(billingId: string, path: string): Promise<void> {
  await removeFromBucket(COMPROVANTE_BUCKET, path);

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_billings")
    .update({ comprovante_path: null, updated_at: new Date().toISOString() })
    .eq("id", billingId);

  if (error) {
    throw new Error(`Falha ao desvincular comprovante da cobrança: ${error.message}`);
  }
}

/** Comprovante de pagamento da implantação (taxa única) — um por cliente, mesmo bucket "comprovantes". */
export async function uploadSetupComprovante(clientId: string, file: File): Promise<void> {
  const path = `${clientId}/implantacao/${Date.now()}-${sanitizeFilename(file.name)}`;
  await uploadToBucket(COMPROVANTE_BUCKET, path, file);

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_clients")
    .update({ setup_comprovante_path: path, updated_at: new Date().toISOString() })
    .eq("id", clientId);

  if (error) {
    throw new Error(`Falha ao vincular comprovante à implantação: ${error.message}`);
  }
}

export async function deleteSetupComprovante(clientId: string, path: string): Promise<void> {
  await removeFromBucket(COMPROVANTE_BUCKET, path);

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_clients")
    .update({ setup_comprovante_path: null, updated_at: new Date().toISOString() })
    .eq("id", clientId);

  if (error) {
    throw new Error(`Falha ao desvincular comprovante da implantação: ${error.message}`);
  }
}

/** NFe da implantação (taxa única) — mesmo bucket "nfes" das mensalidades, path próprio. */
export async function uploadSetupNfe(clientId: string, file: File): Promise<void> {
  const path = `${clientId}/implantacao/${Date.now()}-${sanitizeFilename(file.name)}`;
  await uploadToBucket(NFE_BUCKET, path, file);

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_clients")
    .update({ setup_nfe_path: path, updated_at: new Date().toISOString() })
    .eq("id", clientId);

  if (error) {
    throw new Error(`Falha ao vincular NFe à implantação: ${error.message}`);
  }
}

export async function deleteSetupNfe(clientId: string, path: string): Promise<void> {
  await removeFromBucket(NFE_BUCKET, path);

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_clients")
    .update({ setup_nfe_path: null, updated_at: new Date().toISOString() })
    .eq("id", clientId);

  if (error) {
    throw new Error(`Falha ao desvincular NFe da implantação: ${error.message}`);
  }
}

interface DownloadedFile {
  filename: string;
  content: Buffer;
}

async function downloadFromBucket(bucket: string, path: string): Promise<DownloadedFile> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error || !data) {
    throw new Error(`Falha ao baixar anexo: ${error?.message ?? "arquivo não encontrado"}`);
  }

  const content = Buffer.from(await data.arrayBuffer());
  const filename = path.split("/").pop() ?? "arquivo";
  return { filename, content };
}

/** Baixa o conteúdo de uma NFe (implantação ou mensalidade) pra anexar no e-mail de cobrança. */
export function downloadNfe(path: string): Promise<DownloadedFile> {
  return downloadFromBucket(NFE_BUCKET, path);
}

export async function markSetupEmailSent(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_clients")
    .update({ setup_email_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao registrar envio do e-mail de implantação: ${error.message}`);
  }
}

export async function markBillingEmailSent(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_billings")
    .update({ email_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao registrar envio do e-mail de cobrança: ${error.message}`);
  }
}
