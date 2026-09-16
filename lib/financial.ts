import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase";
import { recordMovement, reverseMovementsFor } from "@/lib/cash";

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
  nfe_path: string | null;
  comprovante_path: string | null;
  pix_link: string | null;
  email_sent_at: string | null;
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
  cnpj: string | null;
  email: string | null;
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
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao atualizar cliente financeiro "${id}": ${error.message}`);
  }
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

/** Uma cobrança "vazia" (sem nada preenchido pelo usuário) pode ser descartada com segurança na deduplicação. */
function hasUserData(b: {
  paid: boolean;
  revenue_amount: number;
  nfe_path: string | null;
  comprovante_path: string | null;
  pix_link: string | null;
  email_sent_at: string | null;
}): boolean {
  return (
    b.paid ||
    Number(b.revenue_amount) > 0 ||
    Boolean(b.nfe_path) ||
    Boolean(b.comprovante_path) ||
    Boolean(b.pix_link) ||
    Boolean(b.email_sent_at)
  );
}

/**
 * Geração preguiçosa: garante que existe exatamente uma cobrança pra cada
 * ciclo mensal entre `first_billing_date` e hoje, MAIS uma referência futura
 * (o próximo ciclo, ainda não vencido) — pra aparecer na lista com
 * antecedência e já dar pra anexar comprovante/NFe antes do vencimento
 * chegar. Chamada ao abrir a página de detalhe do cliente. Cadastrar um
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
 * UNIQUE(client_id, due_date) no banco é a trava definitiva (ver
 * supabase/migrations/006), mas esta função não depende dela pra se manter
 * consistente.
 *
 * A checagem de "já existe" é por MÊS (due_date.slice(0,7)), não pela data
 * exata — de propósito. Se o dia de vencimento do cliente mudar depois que o
 * ciclo do mês já foi gerado, a data-alvo recalculada cai num dia diferente
 * e deixaria de "casar" com a linha existente, criando uma segunda cobrança
 * pro mesmo mês (foi o que aconteceu quando um cliente teve o valor da
 * mensalidade ajustado). Por mês é o invariante certo: nunca deveria existir
 * mais de uma cobrança pro mesmo ciclo mensal.
 */
export async function ensureCurrentBilling(client: FinancialClientRow): Promise<void> {
  const supabase = getSupabaseServerClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  // 1. Ciclos que deveriam existir: do primeiro vencimento até o primeiro que
  //    ainda não venceu (inclusive).
  const targetDueDates: string[] = [];
  let cursor = client.first_billing_date;
  const overshootMonths = monthsBetween(cursor, todayIso) - (MAX_CYCLES - 1);
  if (overshootMonths > 0) {
    cursor = cycleDueDatePlusMonths(cursor, overshootMonths, client.due_day);
  }
  for (let i = 0; i < MAX_CYCLES; i++) {
    targetDueDates.push(cursor);
    if (cursor > todayIso) break;
    cursor = nextCycleDueDate(cursor, client.due_day);
  }

  // 2. O que já existe.
  const { data: existing, error: selectError } = await withRetry(async () =>
    supabase
      .from("financial_billings")
      .select("id, due_date, paid, revenue_amount, nfe_path, comprovante_path, pix_link, email_sent_at")
      .eq("client_id", client.id)
      .order("created_at", { ascending: true })
  );

  if (selectError) {
    throw new Error(`Falha ao verificar cobranças do cliente: ${selectError.message}`);
  }

  const existingRows = existing ?? [];
  const existingMonths = new Set(existingRows.map((r) => r.due_date.slice(0, 7)));

  // 3. Insere o que falta, tudo de uma vez (uma ida ao banco, não uma por ciclo).
  const missing = targetDueDates.filter((d) => !existingMonths.has(d.slice(0, 7)));
  if (missing.length > 0) {
    const { error: insertError } = await withRetry(async () =>
      supabase.from("financial_billings").insert(
        missing.map((due_date) => ({
          client_id: client.id,
          due_date,
          monthly_value: client.monthly_value,
          commission_pct: client.commission_pct,
          revenue_amount: 0,
        }))
      )
    );

    // 23505 = unique_violation: outra invocação concorrente criou os mesmos
    // ciclos primeiro. É o resultado esperado, não um erro.
    if (insertError && insertError.code !== "23505") {
      throw new Error(`Falha ao gerar cobranças do ciclo: ${insertError.message}`);
    }
  }

  // 4. Auto-cura: remove duplicatas do mesmo ciclo (mesmo mês, mesmo se a data
  //    exata difere — ver comentário acima) que tenham escapado, por corrida
  //    antes da constraint existir, dados legados, ou o due_day do cliente
  //    ter mudado. Só apaga linhas vazias — nunca uma com baixa, anexo, PIX
  //    ou e-mail enviado.
  const byMonth = new Map<string, typeof existingRows>();
  for (const row of existingRows) {
    const monthKey = row.due_date.slice(0, 7);
    byMonth.set(monthKey, [...(byMonth.get(monthKey) ?? []), row]);
  }

  const idsToDelete: string[] = [];
  for (const rows of byMonth.values()) {
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
 * existente (não da data de hoje), pra nunca pular um mês.
 */
export async function generateNextBilling(clientId: string): Promise<void> {
  const client = await getFinancialClient(clientId);
  if (!client) throw new Error("Cliente não encontrado.");

  const existing = await listBillingsForClient(clientId);
  const lastDueDate = existing.reduce(
    (latest, b) => (b.due_date > latest ? b.due_date : latest),
    client.first_billing_date
  );
  // Sem nenhuma cobrança ainda: o "próximo" ciclo é o primeiro mesmo.
  const nextDueDate =
    existing.length === 0 ? client.first_billing_date : nextCycleDueDate(lastDueDate, client.due_day);

  if (existing.some((b) => b.due_date.slice(0, 7) === nextDueDate.slice(0, 7))) {
    throw new Error("Esse ciclo já existe.");
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("financial_billings").insert({
    client_id: client.id,
    due_date: nextDueDate,
    monthly_value: client.monthly_value,
    commission_pct: client.commission_pct,
    revenue_amount: 0,
  });

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
    await recordMovement({
      direction: "in",
      amount: calcBillingTotal(billing).total_value,
      kind: "monthly",
      description: `Mensalidade ${reference} — ${client?.name ?? "cliente"}`,
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
