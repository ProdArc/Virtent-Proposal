import Link from "next/link";
import {
  calcBillingTotal,
  listAllBillings,
  listFinancialClients,
  type FinancialBillingRow,
  type FinancialClientRow,
} from "@/lib/financial";
import { btnSecondary, ConfigError, HeroCard, PageHeader } from "@/components/financeiro/ui";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { CashFlowPanel, type CashFlowWindow } from "@/components/financeiro/CashFlowPanel";
import { listPayables } from "@/lib/payables";
import { remainingAmount } from "@/lib/payables-status";
import { daysUntil } from "@/lib/financeiro-status";

// Paleta das séries validada com scripts/validate_palette.js (skill dataviz):
// ΔE 27.6 visão normal / 9.2 CVD no par adjacente. O contraste do verde fica
// em 2.74:1 (abaixo de 3:1), então as barras SEMPRE levam rótulo visível +
// tabela de dados — é o alívio exigido pelo validador.
const SERIES_SETUP = "#1baf7a";
const SERIES_MONTHLY = "#eb6834";

const PLOT_HEIGHT_PX = 190;
const BAR_MAX_PX = 165;

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compactCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const monthShortFmt = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });
const monthLongFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const STATUS_OPTIONS = [
  { value: "", label: "Tudo (cobrado)" },
  { value: "paid", label: "Somente pago (recebido)" },
  { value: "open", label: "Somente em aberto" },
  { value: "overdue", label: "Somente atrasado" },
];

/**
 * Data em que o cliente entrou: o vencimento da implantação, que é quando a
 * unidade de fato começou. Cai pro 1º vencimento da mensalidade quando a
 * implantação não tem data — nunca usa `created_at`, senão todo cliente
 * antigo migrado pro sistema apareceria como entrada do mês do cadastro.
 */
function clientEntryDate(c: FinancialClientRow): string {
  return c.setup_due_date ?? c.first_billing_date;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function monthLabel(key: string, fmt: Intl.DateTimeFormat): string {
  return capitalize(fmt.format(new Date(`${key}-01T00:00:00`)).replace(".", ""));
}

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; status?: string; client?: string }>;
}) {
  const { month, status, client } = await searchParams;
  const activeStatus = status ?? "";
  const activeClient = client ?? "";

  let clients: FinancialClientRow[] = [];
  let billings: FinancialBillingRow[] = [];
  let configError: string | null = null;

  try {
    [clients, billings] = await Promise.all([listFinancialClients(), listAllBillings()]);
  } catch (err) {
    configError = err instanceof Error ? err.message : "Erro desconhecido ao conectar ao Supabase.";
  }

  if (configError) return <ConfigError message={configError} />;

  const todayIso = new Date().toISOString().slice(0, 10);
  const clientsById = new Map(clients.map((c) => [c.id, c]));

  // Meses de referência disponíveis: união das mensalidades e das entradas.
  const monthSet = new Set<string>();
  for (const b of billings) monthSet.add(monthKey(b.due_date));
  for (const c of clients) monthSet.add(monthKey(clientEntryDate(c)));
  const availableMonths = [...monthSet].sort((a, b) => b.localeCompare(a));
  const activeMonth = month && monthSet.has(month) ? month : "";

  const MONTH_OPTIONS = [
    { value: "", label: "Todo o período" },
    ...availableMonths.map((m) => ({ value: m, label: monthLabel(m, monthLongFmt) })),
  ];
  const CLIENT_OPTIONS = [
    { value: "", label: "Todos os clientes" },
    ...clients.map((c) => ({ value: c.id, label: c.name })),
  ];

  /** Aplica o filtro de status a um item cobrado (implantação ou mensalidade). */
  function matchesStatus(paid: boolean, dueDate: string): boolean {
    if (activeStatus === "paid") return paid;
    if (activeStatus === "open") return !paid;
    if (activeStatus === "overdue") return !paid && dueDate < todayIso;
    return true;
  }

  const inClientFilter = (id: string) => !activeClient || id === activeClient;

  // --- Faturamento por cliente (respeita todos os filtros) ---
  interface ClientRevenue {
    id: string;
    name: string;
    setup: number;
    /** Faturamento recorrente da Virtent: mensalidade + comissão + adicional por disparo. */
    monthly: number;
    commission: number;
    metaFee: number;
    /** Custo da Meta só repassado ao cliente — entra no caixa, mas fica fora do faturamento. */
    passThrough: number;
  }
  const revenueByClient = new Map<string, ClientRevenue>();
  const ensureRow = (id: string): ClientRevenue => {
    const existing = revenueByClient.get(id);
    if (existing) return existing;
    const row: ClientRevenue = {
      id,
      name: clientsById.get(id)?.name ?? "Cliente removido",
      setup: 0,
      monthly: 0,
      commission: 0,
      metaFee: 0,
      passThrough: 0,
    };
    revenueByClient.set(id, row);
    return row;
  };

  for (const c of clients) {
    if (!inClientFilter(c.id)) continue;
    const entry = clientEntryDate(c);
    if (activeMonth && monthKey(entry) !== activeMonth) continue;
    if (!matchesStatus(c.setup_paid, entry)) continue;
    ensureRow(c.id).setup += c.setup_value;
  }

  for (const b of billings) {
    if (!inClientFilter(b.client_id)) continue;
    if (activeMonth && monthKey(b.due_date) !== activeMonth) continue;
    if (!matchesStatus(b.paid, b.due_date)) continue;
    const { revenue_value, commission_value, meta_fee_value, pass_through_value } =
      calcBillingTotal(b);
    const row = ensureRow(b.client_id);
    row.monthly += revenue_value;
    row.commission += commission_value;
    row.metaFee += meta_fee_value;
    row.passThrough += pass_through_value;
  }

  const clientRows = [...revenueByClient.values()]
    .map((r) => ({ ...r, total: r.setup + r.monthly }))
    .filter((r) => r.total > 0 || r.passThrough > 0)
    .sort((a, b) => b.total - a.total);

  const setupTotal = clientRows.reduce((s, r) => s + r.setup, 0);
  const monthlyTotal = clientRows.reduce((s, r) => s + r.monthly, 0);
  const commissionTotal = clientRows.reduce((s, r) => s + r.commission, 0);
  const metaFeeTotal = clientRows.reduce((s, r) => s + r.metaFee, 0);
  const passThroughTotal = clientRows.reduce((s, r) => s + r.passThrough, 0);
  const grandTotal = setupTotal + monthlyTotal;

  // --- Clientes que entraram no mês de referência ---
  const enteredClients = clients.filter(
    (c) =>
      inClientFilter(c.id) && (!activeMonth || monthKey(clientEntryDate(c)) === activeMonth)
  );

  // --- Série mensal: implantação x mensalidade ---
  // Ignora o filtro de mês de propósito: o gráfico É a visão do tempo todo; o
  // mês selecionado aparece destacado em vez de virar uma barra só.
  const byMonth = new Map<string, { setup: number; monthly: number }>();
  const bucket = (key: string) => {
    const b = byMonth.get(key) ?? { setup: 0, monthly: 0 };
    byMonth.set(key, b);
    return b;
  };
  for (const c of clients) {
    if (!inClientFilter(c.id)) continue;
    const entry = clientEntryDate(c);
    if (!matchesStatus(c.setup_paid, entry)) continue;
    bucket(monthKey(entry)).setup += c.setup_value;
  }
  for (const b of billings) {
    if (!inClientFilter(b.client_id)) continue;
    if (!matchesStatus(b.paid, b.due_date)) continue;
    bucket(monthKey(b.due_date)).monthly += calcBillingTotal(b).revenue_value;
  }
  const months = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ key, ...v, total: v.setup + v.monthly }))
    .filter((m) => m.total > 0);
  const maxMonthTotal = Math.max(1, ...months.map((m) => m.total));

  // Fluxo de caixa: cruza recebíveis e contas a pagar em aberto por janela de
  // vencimento. Falha silenciosa se o módulo de pagar ainda não foi instalado
  // no banco — o resto do dashboard não deve quebrar por causa disso.
  let cashFlow: CashFlowWindow[] | null = null;
  try {
    const payables = await listPayables();
    const openPayables = payables.filter((p) => p.status === "pending");
    const openBillings = billings.filter((b) => !b.paid);
    cashFlow = [7, 30].map((days) => ({
      days,
      toReceive: openBillings
        .filter((b) => {
          const d = daysUntil(b.due_date, todayIso);
          return d <= days; // vencidos entram: ainda são caixa esperado
        })
        .reduce((s, b) => s + calcBillingTotal(b).total_value, 0),
      toPay: openPayables
        .filter((p) => daysUntil(p.due_date, todayIso) <= days)
        .reduce((s, p) => s + remainingAmount(p), 0),
    }));
  } catch {
    cashFlow = null;
  }

  const scopeLabel = activeMonth ? monthLabel(activeMonth, monthLongFmt) : "todo o período";
  const statusLabel =
    STATUS_OPTIONS.find((o) => o.value === activeStatus)?.label.toLowerCase() ?? "";

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Faturamento por mês e por cliente"
        actions={
          <Link href="/financeiro" className={btnSecondary}>
            Ver clientes
          </Link>
        }
      />

      <HeroCard
        label="Total faturado"
        value={currency.format(grandTotal)}
        hint={
          <>
            <strong className="font-semibold text-muted">{statusLabel}</strong> de{" "}
            <strong className="font-semibold text-muted">{scopeLabel}</strong>
            {passThroughTotal > 0 && (
              <>
                {" · "}+ {currency.format(passThroughTotal)} de repasse Meta (fora do faturamento)
              </>
            )}
          </>
        }
      />

      <div className="mb-3 mt-4 grid grid-cols-1 gap-3 rounded-3xl bg-card p-4 shadow-card sm:grid-cols-3">
        <FilterSelect
          name="month"
          label="Mês de referência"
          defaultValue={activeMonth}
          options={MONTH_OPTIONS}
          basePath="/financeiro/dashboard"
        />
        <FilterSelect
          name="client"
          label="Cliente"
          defaultValue={activeClient}
          options={CLIENT_OPTIONS}
          basePath="/financeiro/dashboard"
        />
        <FilterSelect
          name="status"
          label="Status"
          defaultValue={activeStatus}
          options={STATUS_OPTIONS}
          basePath="/financeiro/dashboard"
        />
      </div>
      <p className="mb-5 px-1 text-xs text-subtle">
        A implantação entra no mês do seu vencimento; a mensalidade, no mês da referência.
      </p>

      {/* Índices macro */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-3xl bg-card px-5 py-4 shadow-card">
          <p className="mb-1 text-xs font-medium text-secondary-ink">
            {activeMonth ? "Clientes que entraram" : "Clientes"}
          </p>
          <p className="text-xl font-extrabold tracking-tight text-ink tabular-nums">
            {enteredClients.length}
          </p>
          <p className="text-[11.5px] text-subtle">
            {activeMonth ? monthLabel(activeMonth, monthShortFmt) : "no total"}
          </p>
        </div>
        <div className="rounded-3xl bg-card px-5 py-4 shadow-card">
          <p className="mb-1 text-xs font-medium text-secondary-ink">
            <span
              className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle"
              style={{ backgroundColor: SERIES_SETUP }}
            />
            Implantação
          </p>
          <p className="text-xl font-extrabold tracking-tight text-ink tabular-nums">
            {currency.format(setupTotal)}
          </p>
        </div>
        <div className="col-span-2 rounded-3xl bg-card px-5 py-4 shadow-card sm:col-span-1">
          <p className="mb-1 text-xs font-medium text-secondary-ink">
            <span
              className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle"
              style={{ backgroundColor: SERIES_MONTHLY }}
            />
            Mensalidades
          </p>
          <p className="text-xl font-extrabold tracking-tight text-ink tabular-nums">
            {currency.format(monthlyTotal)}
          </p>
          <p className="text-[11.5px] text-subtle">
            inclui {currency.format(commissionTotal)} de comissão
            {metaFeeTotal > 0 && <> e {currency.format(metaFeeTotal)} de adicional por disparo</>}
          </p>
        </div>
      </div>

        {cashFlow && (
          <div className="mb-6">
            <CashFlowPanel windows={cashFlow} />
          </div>
        )}

        {/* Evolução mensal */}
        <section className="rounded-3xl bg-card shadow-card p-6 sm:p-8 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
            <div>
              <h2 className="text-sm font-bold text-ink">Faturamento por mês</h2>
              <p className="text-xs text-subtle">
                Todos os meses{activeMonth ? " — o mês filtrado aparece destacado" : ""}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SERIES_SETUP }} />
                <span className="text-xs text-muted">Implantação</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: SERIES_MONTHLY }}
                />
                <span className="text-xs text-muted">Mensalidades</span>
              </div>
            </div>
          </div>

          {months.length === 0 ? (
            <p className="text-sm text-secondary-ink">Nenhum faturamento no filtro selecionado.</p>
          ) : (
            <>
              {/* pt-20/px-12 dão folga pro tooltip caber dentro da área rolável. */}
              <div className="overflow-x-auto">
                <div className="flex items-end gap-3 min-w-max pt-20 px-12">
                  {months.map((m) => {
                    const barTotal = Math.max((m.total / maxMonthTotal) * BAR_MAX_PX, 3);
                    const setupPx = m.total > 0 ? (m.setup / m.total) * barTotal : 0;
                    const monthlyPx = barTotal - setupPx;
                    const dimmed = activeMonth !== "" && m.key !== activeMonth;
                    return (
                      <div
                        key={m.key}
                        className={`group relative flex w-16 flex-col items-center transition-opacity ${dimmed ? "opacity-35" : ""}`}
                      >
                        <div
                          className="flex w-full flex-col justify-end"
                          style={{ height: PLOT_HEIGHT_PX }}
                        >
                          <span className="mb-1 text-center text-[10px] font-semibold text-muted tabular-nums">
                            {compactCurrency.format(m.total)}
                          </span>
                          {monthlyPx > 0.5 && (
                            <div
                              className="w-full rounded-t"
                              style={{
                                backgroundColor: SERIES_MONTHLY,
                                height: monthlyPx,
                                marginBottom: setupPx > 0.5 ? 2 : 0,
                              }}
                            />
                          )}
                          {setupPx > 0.5 && (
                            <div
                              className={monthlyPx > 0.5 ? "w-full" : "w-full rounded-t"}
                              style={{ backgroundColor: SERIES_SETUP, height: setupPx }}
                            />
                          )}
                        </div>

                        <p
                          className={`mt-2 text-[10px] whitespace-nowrap ${m.key === activeMonth ? "font-bold text-ink" : "text-secondary-ink"}`}
                        >
                          {monthLabel(m.key, monthShortFmt)}
                        </p>

                        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-strong px-3 py-2 text-left shadow-lg group-hover:block">
                          <p className="text-[11px] font-semibold text-on-strong mb-1">
                            {monthLabel(m.key, monthLongFmt)}
                          </p>
                          <p className="text-[11px] text-on-strong-soft tabular-nums">
                            Implantação: {currency.format(m.setup)}
                          </p>
                          <p className="text-[11px] text-on-strong-soft tabular-nums">
                            Mensalidades: {currency.format(m.monthly)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <details className="group mt-5">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-brand-ink hover:text-brand-ink-hover transition-colors">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4 w-4 shrink-0 text-subtle transition-transform duration-200 group-open:rotate-90"
                  >
                    <path
                      d="M7 4l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Ver dados em tabela
                </summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 pr-4 text-left text-[11px] font-semibold text-muted">
                          Mês
                        </th>
                        <th className="py-2 px-4 text-right text-[11px] font-semibold text-muted">
                          Implantação
                        </th>
                        <th className="py-2 px-4 text-right text-[11px] font-semibold text-muted">
                          Mensalidades
                        </th>
                        <th className="py-2 pl-4 text-right text-[11px] font-semibold text-muted">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {months.map((m) => (
                        <tr key={m.key} className="border-b border-neutral-bg last:border-b-0">
                          <td className="py-2 pr-4 text-ink">
                            {monthLabel(m.key, monthLongFmt)}
                          </td>
                          <td className="py-2 px-4 text-right text-muted tabular-nums">
                            {currency.format(m.setup)}
                          </td>
                          <td className="py-2 px-4 text-right text-muted tabular-nums">
                            {currency.format(m.monthly)}
                          </td>
                          <td className="py-2 pl-4 text-right font-semibold text-ink tabular-nums">
                            {currency.format(m.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
        </section>

        {/* Faturamento por cliente */}
        <section className="rounded-3xl bg-card shadow-card p-6 sm:p-8">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-ink">Faturamento por cliente</h2>
            <p className="text-xs text-subtle">
              {scopeLabel === "todo o período" ? "Todo o período" : scopeLabel} · implantação e
              mensalidades separadas
            </p>
          </div>

          {clientRows.length === 0 ? (
            <p className="text-sm text-secondary-ink">Nenhum faturamento no filtro selecionado.</p>
          ) : (
            <>
            <ul className="divide-y divide-hairline md:hidden">
              {clientRows.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/financeiro/${r.id}`}
                    className="flex items-start justify-between gap-3 py-3.5"
                  >
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink">
                        {r.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-secondary-ink">
                        {[
                          r.setup > 0 && `Implantação ${currency.format(r.setup)}`,
                          r.monthly > 0 && `Mensalidade ${currency.format(r.monthly)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[15px] font-bold tabular-nums text-ink">
                        {currency.format(r.total)}
                      </span>
                      {r.passThrough > 0 && (
                        <span className="block text-[11px] text-subtle tabular-nums">
                          + {currency.format(r.passThrough)} Meta
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
              <li className="flex items-center justify-between gap-3 py-3.5">
                <span className="text-xs font-semibold text-secondary-ink">
                  Total ({clientRows.length} cliente{clientRows.length === 1 ? "" : "s"})
                </span>
                <span className="text-base font-extrabold tabular-nums text-ink">
                  {currency.format(grandTotal)}
                </span>
              </li>
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-left text-[11px] font-semibold text-muted">
                      Cliente
                    </th>
                    <th className="py-2 px-4 text-right text-[11px] font-semibold text-muted">
                      Implantação
                    </th>
                    <th className="py-2 px-4 text-right text-[11px] font-semibold text-muted">
                      Mensalidades
                    </th>
                    <th className="py-2 pl-4 text-right text-[11px] font-semibold text-muted">
                      Total
                    </th>
                    {passThroughTotal > 0 && (
                      <th className="py-2 pl-4 text-right text-[11px] font-semibold text-subtle">
                        Repasse Meta
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {clientRows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-neutral-bg last:border-b-0 hover:bg-surface transition-colors"
                    >
                      <td className="py-2.5 pr-4">
                        <Link
                          href={`/financeiro/${r.id}`}
                          className="text-ink hover:text-brand-ink font-medium transition-colors"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-right text-muted tabular-nums">
                        {r.setup > 0 ? currency.format(r.setup) : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right text-muted tabular-nums">
                        {r.monthly > 0 ? currency.format(r.monthly) : "—"}
                      </td>
                      <td className="py-2.5 pl-4 text-right font-semibold text-ink tabular-nums">
                        {currency.format(r.total)}
                      </td>
                      {passThroughTotal > 0 && (
                        <td className="py-2.5 pl-4 text-right text-subtle tabular-nums">
                          {r.passThrough > 0 ? currency.format(r.passThrough) : "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td className="py-2.5 pr-4 text-[11px] font-semibold text-muted">
                      Total ({clientRows.length} cliente{clientRows.length === 1 ? "" : "s"})
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-ink tabular-nums">
                      {currency.format(setupTotal)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-ink tabular-nums">
                      {currency.format(monthlyTotal)}
                    </td>
                    <td className="py-2.5 pl-4 text-right font-extrabold text-ink tabular-nums">
                      {currency.format(grandTotal)}
                    </td>
                    {passThroughTotal > 0 && (
                      <td className="py-2.5 pl-4 text-right font-semibold text-subtle tabular-nums">
                        {currency.format(passThroughTotal)}
                      </td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
            </>
          )}
        </section>
    </>
  );
}
