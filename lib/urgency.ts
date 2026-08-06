/**
 * Primitivas de urgência compartilhadas pelos dois módulos financeiros.
 *
 * Este arquivo é deliberadamente livre de qualquer import server-only: ele é
 * consumido também por client components (chips de filtro, formulários). As
 * funções que tocam o banco ficam em financeiro-status.ts / payables-status.ts.
 */

/** Camada visual — cada tom tem um significado único em todo o painel. */
export type Tone = "paid" | "pending" | "overdue" | "onboarding" | "neutral";

export type UrgencyGroup = "immediate" | "week" | "month" | "ok";

/** Janela do "precisa de ação agora". Vale igual em receber e pagar. */
export const URGENT_WINDOW_DAYS = 7;

export const GROUP_ORDER: UrgencyGroup[] = ["immediate", "week", "month", "ok"];

export const GROUP_LABEL: Record<UrgencyGroup, string> = {
  immediate: "Ação imediata",
  week: "Esta semana",
  month: "Este mês",
  ok: "Em dia",
};

export const GROUP_HINT: Record<UrgencyGroup, string> = {
  immediate: "Já vencidas",
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

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Dias entre duas datas ISO. Negativo = já passou. */
export function daysUntil(dueDateIso: string, fromIso: string): number {
  return Math.round(
    (Date.parse(`${dueDateIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000
  );
}

export function groupForDays(days: number | null): UrgencyGroup {
  if (days === null) return "ok";
  if (days < 0) return "immediate";
  if (days <= URGENT_WINDOW_DAYS) return "week";
  if (days <= 30) return "month";
  return "ok";
}
