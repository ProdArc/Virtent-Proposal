import type { PayableRow } from "@/lib/payables";
import { daysUntil, URGENT_WINDOW_DAYS, type Tone, type UrgencyGroup } from "@/lib/urgency";

/**
 * Status derivado e urgência das contas a pagar.
 *
 * Reaproveita de propósito a MESMA escala de urgência do contas a receber
 * (atrasado → ≤7 dias → ≤30 dias → resto) e os mesmos tons: quem usa os dois
 * módulos não deveria ter que aprender duas convenções.
 *
 * "Atrasada" e "Parcialmente paga" não existem no banco — são calculados a
 * partir de due_date e paid_amount, pra nunca ficarem desatualizados.
 */
export type PayableState = "paid" | "partial" | "overdue" | "due-soon" | "pending" | "canceled";

export const PAYABLE_STATE_LABEL: Record<PayableState, string> = {
  paid: "Paga",
  partial: "Parcialmente paga",
  overdue: "Atrasada",
  "due-soon": "Vence em breve",
  pending: "Pendente",
  canceled: "Cancelada",
};

export const PAYABLE_STATE_TONE: Record<PayableState, Tone> = {
  paid: "paid",
  partial: "onboarding", // azul: é um estado de andamento, não um prazo
  overdue: "overdue",
  "due-soon": "overdue",
  pending: "pending",
  canceled: "neutral",
};

export function payableState(p: PayableRow, today: string): PayableState {
  if (p.status === "canceled") return "canceled";
  if (p.status === "paid") return "paid";

  const days = daysUntil(p.due_date, today);
  const partial = Number(p.paid_amount) > 0;

  if (days < 0) return "overdue";
  if (partial) return "partial";
  if (days <= URGENT_WINDOW_DAYS) return "due-soon";
  return "pending";
}

/** Quanto ainda falta pagar desta conta. */
export function remainingAmount(p: PayableRow): number {
  return Math.max(0, Math.round((Number(p.amount) - Number(p.paid_amount)) * 100) / 100);
}

export function payableGroup(p: PayableRow, today: string): UrgencyGroup {
  // Paga ou cancelada não disputa atenção: vai pro fim da lista.
  if (p.status === "paid" || p.status === "canceled") return "ok";
  const days = daysUntil(p.due_date, today);
  if (days < 0) return "immediate";
  if (days <= URGENT_WINDOW_DAYS) return "week";
  if (days <= 30) return "month";
  return "ok";
}

// ── Filtros ────────────────────────────────────────────────────────────

export type PayableFilter = "" | "urgent" | "overdue" | "upcoming" | "paid";

export const PAYABLE_FILTER_LABEL: Record<PayableFilter, string> = {
  "": "Todas",
  urgent: "Ação urgente",
  overdue: "Atrasadas",
  upcoming: "A vencer",
  paid: "Pagas",
};

export function matchesPayableFilter(p: PayableRow, today: string, filter: PayableFilter): boolean {
  const state = payableState(p, today);
  switch (filter) {
    case "urgent":
      return state === "overdue" || state === "due-soon";
    case "overdue":
      return state === "overdue";
    case "upcoming":
      return state === "pending" || state === "due-soon" || state === "partial";
    case "paid":
      return state === "paid";
    default:
      return true;
  }
}

// ── Rótulos de apoio ───────────────────────────────────────────────────

export const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "boleto", label: "Boleto" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
  { value: "dinheiro", label: "Dinheiro" },
];

export const PAYMENT_METHOD_LABEL: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.label])
);

export const RECURRENCE_LABEL: Record<string, string> = {
  monthly: "Mensal",
  weekly: "Semanal",
  yearly: "Anual",
};

/** Frase curta de prazo, do jeito que aparece no card. */
export function dueLabel(p: PayableRow, today: string): string {
  const days = daysUntil(p.due_date, today);
  if (p.status === "paid") return "Paga";
  if (p.status === "canceled") return "Cancelada";
  if (days < 0) return `Atrasada há ${-days} ${-days === 1 ? "dia" : "dias"}`;
  if (days === 0) return "Vence hoje";
  return `Vence em ${days} ${days === 1 ? "dia" : "dias"}`;
}
