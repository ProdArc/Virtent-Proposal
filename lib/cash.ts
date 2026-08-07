import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase";

/**
 * Livro de caixa. Quase ninguém lança movimentação à mão: elas nascem das
 * ações que já existem — dar baixa num recebível e pagar uma conta. Isso é o
 * que impede o mesmo dinheiro de ser digitado duas vezes. As exceções são o
 * saldo inicial e a entrada manual avulsa (aporte, devolução...), que não têm
 * uma "conta de origem" pra nascer sozinhas.
 *
 * Correção é sempre na origem. Desfazer uma baixa não apaga a movimentação:
 * lança um ESTORNO apontando para ela, então o extrato continua auditável e o
 * saldo se ajusta sozinho. Entrada manual segue a mesma regra, só que como
 * ela É a origem, o estorno é disparado direto do extrato (reverseManualMovement).
 */

export type Direction = "in" | "out";
export type MovementKind = "opening" | "setup" | "monthly" | "payable" | "manual";
export type SourceType = "client_setup" | "billing" | "payable";

export interface CashMovementRow {
  id: string;
  occurred_at: string;
  direction: Direction;
  amount: number;
  kind: MovementKind;
  description: string;
  counterpart: string | null;
  source_type: SourceType | null;
  source_id: string | null;
  reverses_id: string | null;
  created_at: string;
}

export const KIND_LABEL: Record<MovementKind, string> = {
  opening: "Saldo inicial",
  setup: "Implantação",
  monthly: "Mensalidade",
  payable: "Conta a pagar",
  manual: "Entrada manual",
};

export interface NewMovement {
  direction: Direction;
  amount: number;
  kind: MovementKind;
  description: string;
  counterpart?: string | null;
  sourceType?: SourceType | null;
  sourceId?: string | null;
  occurredAt?: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * O livro de caixa ainda não foi criado no banco (migração 008 não rodou).
 *
 * Nesse caso o registro vira no-op em vez de erro: o caixa é uma camada
 * ADITIVA sobre módulos que já funcionavam, e não pode impedir alguém de dar
 * baixa numa cobrança só porque a tabela nova não existe.
 */
function isMissingLedger(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" || // PostgREST: tabela fora do schema cache
    error.code === "42P01" || // Postgres: undefined_table
    Boolean(error.message?.includes("cash_movements"))
  );
}

/**
 * Registra uma movimentação. Ignora silenciosamente valor zero (uma baixa de
 * R$ 0 não é dinheiro se movendo) e violação da trava de duplicidade — que
 * significa "essa baixa já foi lançada", não um erro a propagar para a UI.
 */
export async function recordMovement(m: NewMovement): Promise<void> {
  const amount = round2(Math.abs(m.amount));
  if (amount <= 0) return;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("cash_movements").insert({
    direction: m.direction,
    amount,
    kind: m.kind,
    description: m.description,
    counterpart: m.counterpart ?? null,
    source_type: m.sourceType ?? null,
    source_id: m.sourceId ?? null,
    occurred_at: m.occurredAt ?? new Date().toISOString(),
  });

  // 23505 = unique_violation: a movimentação dessa baixa já existe.
  if (error && error.code !== "23505" && !isMissingLedger(error)) {
    throw new Error(`Falha ao registrar movimentação de caixa: ${error.message}`);
  }
}

/** Movimentações vivas (não estornadas) de uma origem. */
async function activeMovementsFor(
  sourceType: SourceType,
  sourceId: string
): Promise<CashMovementRow[]> {
  const supabase = getSupabaseServerClient();

  const { data: all, error } = await supabase
    .from("cash_movements")
    .select("*")
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);
  if (error) {
    if (isMissingLedger(error)) return [];
    throw new Error(`Falha ao consultar movimentações: ${error.message}`);
  }

  const rows = (all ?? []) as CashMovementRow[];
  const reversed = new Set(rows.map((r) => r.reverses_id).filter(Boolean) as string[]);
  return rows.filter((r) => !r.reverses_id && !reversed.has(r.id));
}

/**
 * Estorna tudo que ainda está valendo para uma origem. Usado quando a baixa é
 * desfeita, a conta é cancelada ou o registro de origem é excluído — em todos
 * os casos o dinheiro "volta", e sem isso ficaria saldo fantasma.
 */
export async function reverseMovementsFor(
  sourceType: SourceType,
  sourceId: string,
  reason: string
): Promise<void> {
  const active = await activeMovementsFor(sourceType, sourceId);
  if (active.length === 0) return;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("cash_movements").insert(
    active.map((m) => ({
      direction: m.direction === "in" ? "out" : "in",
      amount: m.amount,
      kind: m.kind,
      description: `${reason}: ${m.description}`,
      counterpart: m.counterpart,
      source_type: m.source_type,
      source_id: m.source_id,
      reverses_id: m.id,
      occurred_at: new Date().toISOString(),
    }))
  );
  if (error && !isMissingLedger(error)) {
    throw new Error(`Falha ao estornar movimentação: ${error.message}`);
  }
}

/**
 * Estorna uma entrada manual específica (aporte, devolução...) pelo próprio
 * id. Só serve pra `kind: "manual"` — as demais origens (setup, mensalidade,
 * conta a pagar) têm um cadastro próprio e devem ser corrigidas por lá, que
 * aciona `reverseMovementsFor`. Entrada manual não tem esse cadastro: ela
 * mesma é a origem, então o estorno acontece direto no extrato.
 */
export async function reverseManualMovement(id: string, reason: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("cash_movements").select("*").eq("id", id).maybeSingle();
  if (error) {
    if (isMissingLedger(error)) return;
    throw new Error(`Falha ao buscar movimentação: ${error.message}`);
  }

  const movement = data as CashMovementRow | null;
  if (!movement) throw new Error("Movimentação não encontrada.");
  if (movement.kind !== "manual") {
    throw new Error("Só entradas manuais podem ser estornadas por aqui.");
  }
  if (movement.reverses_id) throw new Error("Isso já é um estorno.");

  const { data: existingReversal, error: checkError } = await supabase
    .from("cash_movements")
    .select("id")
    .eq("reverses_id", id)
    .maybeSingle();
  if (checkError) throw new Error(`Falha ao verificar estorno: ${checkError.message}`);
  if (existingReversal) throw new Error("Essa entrada já foi estornada.");

  const { error: insertError } = await supabase.from("cash_movements").insert({
    direction: movement.direction === "in" ? "out" : "in",
    amount: movement.amount,
    kind: movement.kind,
    description: `${reason}: ${movement.description}`,
    counterpart: movement.counterpart,
    source_type: movement.source_type,
    source_id: movement.source_id,
    reverses_id: movement.id,
    occurred_at: new Date().toISOString(),
  });
  if (insertError && !isMissingLedger(insertError)) {
    throw new Error(`Falha ao estornar entrada: ${insertError.message}`);
  }
}

export interface CashBalance {
  balance: number;
  total_in: number;
  total_out: number;
  movements: number;
}

/** Saldo agregado pela view — não traz o extrato inteiro só pra somar. */
export async function getCashBalance(): Promise<CashBalance> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("cash_balance")
    .select("balance,total_in,total_out,movements")
    .maybeSingle();
  if (error) throw new Error(`Falha ao calcular saldo de caixa: ${error.message}`);
  return {
    balance: Number(data?.balance ?? 0),
    total_in: Number(data?.total_in ?? 0),
    total_out: Number(data?.total_out ?? 0),
    movements: Number(data?.movements ?? 0),
  };
}

export async function listMovements(): Promise<CashMovementRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("cash_movements")
    .select("*")
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(`Falha ao listar movimentações: ${error.message}`);
  return (data ?? []) as CashMovementRow[];
}

// ── Saldo inicial ──────────────────────────────────────────────────────

export async function getOpeningMovement(): Promise<CashMovementRow | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("cash_movements")
    .select("*")
    .eq("kind", "opening")
    .maybeSingle();
  if (error) throw new Error(`Falha ao buscar saldo inicial: ${error.message}`);
  return data as CashMovementRow | null;
}

/**
 * Define (ou corrige) o saldo inicial. Valor negativo é aceito — quem começa
 * no vermelho precisa conseguir registrar isso; vira uma saída.
 */
export async function setOpeningBalance(amount: number, dateIso: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const existing = await getOpeningMovement();

  const payload = {
    direction: (amount >= 0 ? "in" : "out") as Direction,
    amount: round2(Math.abs(amount)),
    kind: "opening" as const,
    description: "Saldo inicial de caixa",
    counterpart: null,
    source_type: null,
    source_id: null,
    occurred_at: new Date(`${dateIso}T12:00:00`).toISOString(),
  };

  if (round2(Math.abs(amount)) === 0) {
    // Saldo inicial zero: não faz sentido manter uma linha de R$ 0 no extrato.
    if (existing) await supabase.from("cash_movements").delete().eq("id", existing.id);
    return;
  }

  const { error } = existing
    ? await supabase.from("cash_movements").update(payload).eq("id", existing.id)
    : await supabase.from("cash_movements").insert(payload);

  if (error) throw new Error(`Falha ao salvar saldo inicial: ${error.message}`);
}
