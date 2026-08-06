import type { FinancialBillingRow, FinancialClientRow } from "@/lib/financial";
import { calcBillingTotal } from "@/lib/financial";

/**
 * Regras de status e urgência do painel financeiro. Fica fora dos componentes
 * de propósito: é a parte que precisa estar certa (dinheiro), e assim dá pra
 * conferir sem renderizar tela.
 */

/** Estado de uma cobrança. `overdue` cobre atrasado E vencendo em ≤7 dias — os dois pedem ação imediata. */
export type BillingState = "paid" | "overdue" | "pending" | "future";

/** Camada visual: cada uma tem paleta própria pra não confundir prazo com cadastro. */
export type Tone = "paid" | "pending" | "overdue" | "onboarding" | "neutral";

export const URGENT_WINDOW_DAYS = 7;

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysUntil(dueDateIso: string, fromIso: string): number {
  return Math.round(
    (Date.parse(`${dueDateIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000
  );
}

export function billingState(b: FinancialBillingRow, today: string): BillingState {
  if (b.paid) return "paid";
  const days = daysUntil(b.due_date, today);
  if (days < 0) return "overdue";
  if (days <= URGENT_WINDOW_DAYS) return "overdue"; // ≤7 dias também é ação imediata
  if (days <= 30) return "pending";
  return "future";
}

export const STATE_LABEL: Record<BillingState, string> = {
  paid: "Paga",
  overdue: "Atrasada ou vencendo",
  pending: "Em aberto",
  future: "A vencer",
};

export const STATE_TONE: Record<BillingState, Tone> = {
  paid: "paid",
  overdue: "overdue",
  pending: "pending",
  future: "neutral",
};

// ── Urgência do cliente ────────────────────────────────────────────────

export type UrgencyGroup = "immediate" | "week" | "month" | "ok";

export const GROUP_ORDER: UrgencyGroup[] = ["immediate", "week", "month", "ok"];

export const GROUP_LABEL: Record<UrgencyGroup, string> = {
  immediate: "Ação imediata",
  week: "Esta semana",
  month: "Este mês",
  ok: "Em dia",
};

export const GROUP_HINT: Record<UrgencyGroup, string> = {
  immediate: "Cobranças já vencidas",
  week: "Vencem em até 7 dias",
  month: "Vencem em até 30 dias",
  ok: "Nada vencendo nos próximos 30 dias",
};

export const GROUP_TONE: Record<UrgencyGroup, Tone> = {
  immediate: "overdue",
  week: "overdue",
  month: "pending",
  ok: "paid",
};

/** Uma pendência aberta — mensalidade ou implantação, tratadas igual pro cálculo de urgência. */
export interface OpenItem {
  kind: "setup" | "monthly";
  dueDate: string;
  value: number;
  daysUntilDue: number;
  label: string;
}

export interface ClientStatus {
  openItems: OpenItem[];
  openTotal: number;
  receivedTotal: number;
  overdueCount: number;
  /** Vencidos + vencendo em ≤7 dias: alimenta o card "Ação urgente". */
  urgentCount: number;
  /** Menor prazo entre as pendências (negativo = atrasado); null se não há nada em aberto. */
  soonestDays: number | null;
  group: UrgencyGroup;
  /** O que fazer agora, já resolvido pra UI. */
  action: { tone: Tone; label: string };
  /** Estado da implantação como camada própria (cadastro), separada do prazo. */
  setupTone: Tone;
  setupLabel: string;
  /** Pendências administrativas que travam o envio (NFe, PIX, e-mail). */
  blockers: string[];
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const dayFmt = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

function shortMonth(iso: string): string {
  const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const [year, month] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]}/${String(year).slice(2)}`;
}

function groupFor(soonestDays: number | null): UrgencyGroup {
  if (soonestDays === null) return "ok";
  if (soonestDays < 0) return "immediate";
  if (soonestDays <= URGENT_WINDOW_DAYS) return "week";
  if (soonestDays <= 30) return "month";
  return "ok";
}

/** Insumos que faltam pra conseguir enviar a cobrança de um ciclo. */
function billingBlockers(client: FinancialClientRow, b: FinancialBillingRow): string[] {
  const missing: string[] = [];
  if (!client.email) missing.push("e-mail da unidade");
  if (!b.nfe_path) missing.push("NFe");
  if (!b.pix_link) missing.push("link PIX");
  return missing;
}

function setupBlockers(client: FinancialClientRow): string[] {
  const missing: string[] = [];
  if (!client.email) missing.push("e-mail da unidade");
  if (!client.setup_nfe_path) missing.push("NFe da implantação");
  if (!client.setup_pix_link) missing.push("link PIX da implantação");
  return missing;
}

export function clientStatus(
  client: FinancialClientRow,
  billings: FinancialBillingRow[],
  today: string
): ClientStatus {
  const openItems: OpenItem[] = [];
  let openTotal = 0;
  let receivedTotal = client.setup_paid ? client.setup_value : 0;
  let overdueCount = 0;
  let urgentCount = 0;

  if (!client.setup_paid) {
    const due = client.setup_due_date ?? client.first_billing_date;
    const days = daysUntil(due, today);
    openItems.push({
      kind: "setup",
      dueDate: due,
      value: client.setup_value,
      daysUntilDue: days,
      label: "Implantação",
    });
    openTotal += client.setup_value;
    if (days < 0) overdueCount += 1;
    if (days <= URGENT_WINDOW_DAYS) urgentCount += 1;
  }

  for (const b of billings) {
    const { total_value } = calcBillingTotal(b);
    if (b.paid) {
      receivedTotal += total_value;
      continue;
    }
    const days = daysUntil(b.due_date, today);
    openItems.push({
      kind: "monthly",
      dueDate: b.due_date,
      value: total_value,
      daysUntilDue: days,
      label: shortMonth(b.due_date),
    });
    openTotal += total_value;
    if (days < 0) overdueCount += 1;
    if (days <= URGENT_WINDOW_DAYS) urgentCount += 1;
  }

  openItems.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  const soonest = openItems[0] ?? null;
  const soonestDays = soonest ? soonest.daysUntilDue : null;

  // Camada de cadastro (implantação) — azul enquanto em andamento, vermelho se
  // já venceu, verde quando concluída. Nunca âmbar, pra não colidir com prazo.
  const setupDue = client.setup_due_date ?? client.first_billing_date;
  const setupOverdue = !client.setup_paid && daysUntil(setupDue, today) < 0;
  const setupTone: Tone = client.setup_paid ? "paid" : setupOverdue ? "overdue" : "onboarding";
  const setupLabel = client.setup_paid
    ? "Implantação concluída"
    : setupOverdue
      ? "Implantação vencida"
      : "Implantação em andamento";

  // Bloqueios administrativos da pendência mais próxima.
  let blockers: string[] = [];
  if (soonest?.kind === "setup") blockers = setupBlockers(client);
  else if (soonest?.kind === "monthly") {
    const b = billings.find((x) => !x.paid && x.due_date === soonest.dueDate);
    blockers = b ? billingBlockers(client, b) : [];
  }

  return {
    openItems,
    openTotal,
    receivedTotal,
    overdueCount,
    urgentCount,
    soonestDays,
    group: groupFor(soonestDays),
    action: nextAction(client, billings, today, soonest, blockers),
    setupTone,
    setupLabel,
    blockers,
  };
}

function nextAction(
  client: FinancialClientRow,
  billings: FinancialBillingRow[],
  today: string,
  soonest: OpenItem | null,
  blockers: string[]
): { tone: Tone; label: string } {
  if (!soonest) return { tone: "paid", label: "Tudo em dia" };

  const days = soonest.daysUntilDue;
  const when =
    days < 0
      ? `atrasada há ${-days} ${plural(-days, "dia", "dias")}`
      : days === 0
        ? "vence hoje"
        : `vence em ${days} ${plural(days, "dia", "dias")}`;

  if (blockers.length > 0) {
    return { tone: days <= URGENT_WINDOW_DAYS ? "overdue" : "pending", label: `Falta ${blockers[0]} · ${when}` };
  }

  const alreadySent =
    soonest.kind === "setup"
      ? client.setup_email_sent_at
      : (billings.find((x) => !x.paid && x.due_date === soonest.dueDate)?.email_sent_at ?? null);

  if (!alreadySent) {
    return { tone: days <= URGENT_WINDOW_DAYS ? "overdue" : "pending", label: `Cobrança pronta para enviar · ${when}` };
  }

  return {
    tone: days < 0 ? "overdue" : "neutral",
    label: `Enviada em ${dayFmt(alreadySent)} · ${when}`,
  };
}

// ── Filtros ────────────────────────────────────────────────────────────

export type StatusFilter = "" | "urgent" | "overdue" | "upcoming" | "ok";

export const FILTER_LABEL: Record<StatusFilter, string> = {
  "": "Todos",
  urgent: "Ação urgente",
  overdue: "Atrasado",
  upcoming: "A vencer",
  ok: "Em dia",
};

export function matchesFilter(status: ClientStatus, filter: StatusFilter): boolean {
  switch (filter) {
    case "urgent":
      return status.urgentCount > 0;
    case "overdue":
      return status.overdueCount > 0;
    case "upcoming":
      return status.openItems.length > 0 && status.overdueCount === 0;
    case "ok":
      return status.openItems.length === 0;
    default:
      return true;
  }
}
