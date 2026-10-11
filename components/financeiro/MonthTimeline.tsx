import type { FinancialBillingRow } from "@/lib/financial";
import { calcBillingTotal } from "@/lib/financial";
import { billingState, STATE_LABEL, type BillingState } from "@/lib/financeiro-status";
import { BILLING_KIND_LABEL, billingKindOf } from "@/lib/billing-methods";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthLongFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const MONTH_ABBR = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/**
 * Cada quadrado mostra SEMPRE a inicial do mês — a identidade do mês não pode
 * depender de hover. O status vem da cor, e a forma diferencia os dois casos
 * que não podem ser confundidos por quem não distingue verde de vermelho:
 * "atrasada" ganha um halo e "a vencer" é vazado em vez de sólido.
 */
const CELL_CLASS: Record<BillingState, string> = {
  paid: "bg-paid-ink text-white",
  overdue: "bg-overdue-ink text-white ring-2 ring-overdue-line",
  pending: "bg-pending-ink text-white",
  future: "bg-white text-neutral-ink border border-neutral-line",
};

// Mês com mensalidade + repasse Meta vira UM quadrado: vale o estado que
// mais pede ação entre os dois.
const STATE_PRIORITY: BillingState[] = ["overdue", "pending", "future", "paid"];

export function MonthTimeline({
  billings,
  today,
  limit = 12,
}: {
  billings: FinancialBillingRow[];
  today: string;
  limit?: number;
}) {
  const byMonth = new Map<string, FinancialBillingRow[]>();
  for (const b of billings) {
    const key = b.due_date.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), b]);
  }
  // Mais recente primeiro, como no resto do painel.
  const recent = [...byMonth.entries()].sort(([a], [b]) => b.localeCompare(a)).slice(0, limit);

  if (recent.length === 0) {
    return <p className="text-xs text-secondary-ink">Nenhuma referência gerada ainda.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {recent.map(([monthKey, rows]) => {
        const states = rows.map((b) => billingState(b, today));
        const state = STATE_PRIORITY.find((s) => states.includes(s)) ?? "paid";
        const monthIndex = Number(monthKey.slice(5, 7)) - 1;
        const label = monthLongFmt.format(new Date(`${monthKey}-01T00:00:00`));
        const allSent = rows.every((b) => b.email_sent_at);
        const details = rows
          .map((b) => {
            const sent = b.email_sent_at
              ? `e-mail enviado em ${new Date(b.email_sent_at).toLocaleDateString("pt-BR")}`
              : "e-mail não enviado";
            const kind = rows.length > 1 ? `${BILLING_KIND_LABEL[billingKindOf(b)]}: ` : "";
            return `${kind}${STATE_LABEL[billingState(b, today)]} · ${currency.format(calcBillingTotal(b).total_value)} · ${sent}`;
          })
          .join("\n");
        return (
          <span
            key={monthKey}
            title={`${label}\n${details}`}
            className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold leading-none ${CELL_CLASS[state]}`}
          >
            {MONTH_ABBR[monthIndex]}
            {allSent && (
              <span
                aria-hidden="true"
                title=""
                className="absolute -right-1 -top-1 h-2 w-2 rounded-full border border-white bg-brand"
              />
            )}
          </span>
        );
      })}
    </div>
  );
}

/** Legenda da timeline — as cores sozinhas não se explicam. */
export function MonthTimelineLegend() {
  const items: [BillingState, string][] = [
    ["paid", "Paga"],
    ["pending", "Em aberto"],
    ["overdue", "Atrasada / vencendo"],
    ["future", "A vencer"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {items.map(([state, label]) => (
        <span key={state} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={`h-3 w-3 rounded ${CELL_CLASS[state]}`} />
          <span className="text-[10.5px] text-secondary-ink">{label}</span>
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2 w-2 rounded-full border border-white bg-brand" />
        <span className="text-[10.5px] text-secondary-ink">Cobrança enviada</span>
      </span>
    </div>
  );
}
