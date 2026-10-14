import Link from "next/link";
import type { FinancialBillingRow, FinancialClientRow } from "@/lib/financial";
import { calcBillingTotal } from "@/lib/financial";
import { billingState, STATE_LABEL, type BillingState, type ClientStatus } from "@/lib/financeiro-status";
import { BILLING_KIND_LABEL, billingKindOf } from "@/lib/billing-methods";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
// Sem "R$" nem centavos dentro da célula: o cabeçalho avisa a unidade e o valor exato fica no tooltip.
const compact = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const monthShort = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });

const CELL: Record<BillingState, string> = {
  paid: "bg-paid-bg text-paid-ink",
  overdue: "bg-overdue-bg text-overdue-ink font-semibold",
  pending: "bg-pending-bg text-pending-ink font-semibold",
  future: "bg-neutral-bg text-neutral-ink",
};

// Mês com mensalidade + repasse Meta: vale o estado que mais pede ação.
const PRIORITY: BillingState[] = ["overdue", "pending", "future", "paid"];

export interface MatrixRow {
  client: FinancialClientRow;
  billings: FinancialBillingRow[];
  status: ClientStatus;
}

/**
 * Clientes x meses numa tela só. Responde "quem pagou, quem deve e quanto, em
 * cada mês" sem abrir cliente por cliente nem rolar pilhas de cobranças.
 * Cada célula leva à referência daquele mês na ficha do cliente.
 */
export function ClientMatrix({
  rows,
  months,
  today,
}: {
  rows: MatrixRow[];
  /** Meses (YYYY-MM) em ordem cronológica. */
  months: string[];
  today: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-xs font-medium text-secondary-ink">
                Cliente <span className="font-normal text-subtle">· valores em R$</span>
              </th>
              {months.map((m) => (
                <th key={m} className="px-1 py-3 text-center text-xs font-semibold text-muted">
                  {monthShort.format(new Date(`${m}-01T00:00:00`)).replace(".", "")}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-secondary-ink">Em aberto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ client, billings, status }) => (
              <tr key={client.id} className="group/row">
                <th
                  scope="row"
                  className="sticky left-0 z-10 max-w-[10.5rem] border-t border-hairline bg-white px-4 py-1.5 text-left font-semibold text-ink group-hover/row:bg-[#F8FAF7] sm:max-w-[16rem]"
                >
                  <Link
                    href={`/financeiro/${client.id}`}
                    className="block truncate py-1 text-[13px] hover:text-brand"
                    title={client.name}
                  >
                    {client.name}
                  </Link>
                </th>
                {months.map((m) => {
                  const cell = billings.filter((b) => b.due_date.slice(0, 7) === m);
                  if (cell.length === 0) {
                    return (
                      <td key={m} className="border-t border-hairline px-1 py-1.5 text-center text-subtle">
                        <span aria-label="sem cobrança">·</span>
                      </td>
                    );
                  }
                  const states = cell.map((b) => billingState(b, today));
                  const worst = PRIORITY.find((s) => states.includes(s)) ?? "paid";
                  const total = cell.reduce((sum, b) => sum + calcBillingTotal(b).total_value, 0);
                  const tip = cell
                    .map(
                      (b) =>
                        `${cell.length > 1 ? `${BILLING_KIND_LABEL[billingKindOf(b)]}: ` : ""}${STATE_LABEL[billingState(b, today)]} · ${currency.format(calcBillingTotal(b).total_value)}`
                    )
                    .join("\n");
                  return (
                    <td key={m} className="border-t border-hairline px-1 py-1.5 text-center">
                      <Link
                        href={`/financeiro/${client.id}?ref=${m}`}
                        title={tip}
                        aria-label={`${client.name}, ${m}: ${STATE_LABEL[worst]}, ${currency.format(total)}`}
                        className={`block min-w-[3.75rem] rounded-xl px-2 py-1.5 text-xs tabular-nums transition-transform hover:scale-105 ${CELL[worst]}`}
                      >
                        {compact.format(total)}
                      </Link>
                    </td>
                  );
                })}
                <td className="border-t border-hairline px-4 py-1.5 text-right text-[13px] font-bold tabular-nums">
                  <span className={status.openTotal > 0 ? "text-ink" : "text-subtle"}>
                    {status.openTotal > 0 ? compact.format(status.openTotal) : "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-hairline px-4 py-3">
        {(["paid", "pending", "overdue", "future"] as BillingState[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-[11px] text-secondary-ink">
            <span aria-hidden="true" className={`h-3 w-3 rounded ${CELL[s].split(" ").slice(0, 2).join(" ")}`} />
            {s === "pending" ? "Em aberto" : s === "overdue" ? "Atrasada / vencendo" : s === "future" ? "A vencer" : "Paga"}
          </span>
        ))}
      </div>
    </div>
  );
}
