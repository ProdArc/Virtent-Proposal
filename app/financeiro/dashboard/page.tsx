import Link from "next/link";
import {
  calcBillingTotal,
  listAllBillings,
  listFinancialClients,
  type FinancialBillingRow,
  type FinancialClientRow,
} from "@/lib/financial";
import { LogoutButton } from "@/components/ui/LogoutButton";
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

  if (configError) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F9FBF8] px-6">
        <div className="max-w-md text-center">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#B45309] mb-3">
            Configuração pendente
          </p>
          <h1 className="text-xl font-bold text-[#18181B] mb-2">
            Não foi possível conectar ao banco
          </h1>
          <p className="text-sm text-[#71717A] leading-relaxed">{configError}</p>
        </div>
      </main>
    );
  }

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
    <main className="relative min-h-screen overflow-hidden bg-[#F9FBF8] py-12 sm:py-16 px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,95,70,0.06),transparent_55%)]" />

      <div className="relative max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/painel"
            className="text-xs text-[#71717A] hover:text-[#18181B] transition-colors"
          >
            ← Painel
          </Link>
          <LogoutButton />
        </div>

        <div className="flex items-start justify-between gap-4 mt-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#065F46] mb-3">
              Virtent
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#18181B]">
              Dashboard financeiro
            </h1>
          </div>
          <Link
            href="/financeiro"
            className="shrink-0 inline-flex items-center justify-center text-sm font-medium px-4 py-2 rounded-lg border border-[#E4E4E7] bg-white text-[#18181B] hover:bg-[#F9FBF8] transition-colors"
          >
            Ver clientes
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 rounded-2xl border border-[#E4E4E7] bg-white p-4 shadow-sm">
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
        <p className="text-xs text-[#A1A1AA] mb-6 px-1">
          Mostrando <strong className="text-[#52525B]">{statusLabel}</strong> de{" "}
          <strong className="text-[#52525B]">{scopeLabel}</strong>. A implantação entra no mês do seu
          vencimento; a mensalidade, no mês da referência.
        </p>

        {/* Índices macro */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold text-[#52525B] mb-1">
              {activeMonth ? "Clientes que entraram" : "Clientes"}
            </p>
            <p className="text-lg font-bold text-[#18181B] tabular-nums">{enteredClients.length}</p>
            <p className="text-[11px] text-[#A1A1AA]">
              {activeMonth ? monthLabel(activeMonth, monthShortFmt) : "no total"}
            </p>
          </div>
          <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold text-[#52525B] mb-1">
              <span
                className="inline-block h-2 w-2 rounded-sm mr-1.5 align-middle"
                style={{ backgroundColor: SERIES_SETUP }}
              />
              Implantação
            </p>
            <p className="text-lg font-bold text-[#18181B] tabular-nums">
              {currency.format(setupTotal)}
            </p>
          </div>
          <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold text-[#52525B] mb-1">
              <span
                className="inline-block h-2 w-2 rounded-sm mr-1.5 align-middle"
                style={{ backgroundColor: SERIES_MONTHLY }}
              />
              Mensalidades
            </p>
            <p className="text-lg font-bold text-[#18181B] tabular-nums">
              {currency.format(monthlyTotal)}
            </p>
            <p className="text-[11px] text-[#A1A1AA]">
              inclui {currency.format(commissionTotal)} de comissão
              {metaFeeTotal > 0 && <> e {currency.format(metaFeeTotal)} de adicional por disparo</>}
            </p>
          </div>
          <div className="rounded-xl border border-[#065F46]/25 bg-[#F0FAF6] px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold text-[#065F46] mb-1">Total faturado</p>
            <p className="text-lg font-bold text-[#18181B] tabular-nums">
              {currency.format(grandTotal)}
            </p>
            {passThroughTotal > 0 && (
              <p className="text-[11px] text-[#71717A]">
                + {currency.format(passThroughTotal)} de repasse Meta (fora do faturamento)
              </p>
            )}
          </div>
        </div>

        {cashFlow && (
          <div className="mb-6">
            <CashFlowPanel windows={cashFlow} />
          </div>
        )}

        {/* Evolução mensal */}
        <section className="rounded-2xl border border-[#E4E4E7] bg-white p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
            <div>
              <h2 className="text-sm font-bold text-[#18181B]">Faturamento por mês</h2>
              <p className="text-xs text-[#A1A1AA]">
                Todos os meses{activeMonth ? " — o mês filtrado aparece destacado" : ""}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SERIES_SETUP }} />
                <span className="text-xs text-[#52525B]">Implantação</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: SERIES_MONTHLY }}
                />
                <span className="text-xs text-[#52525B]">Mensalidades</span>
              </div>
            </div>
          </div>

          {months.length === 0 ? (
            <p className="text-sm text-[#71717A]">Nenhum faturamento no filtro selecionado.</p>
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
                          <span className="mb-1 text-center text-[10px] font-semibold text-[#52525B] tabular-nums">
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
                          className={`mt-2 text-[10px] whitespace-nowrap ${m.key === activeMonth ? "font-bold text-[#18181B]" : "text-[#71717A]"}`}
                        >
                          {monthLabel(m.key, monthShortFmt)}
                        </p>

                        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#18181B] px-3 py-2 text-left shadow-lg group-hover:block">
                          <p className="text-[11px] font-semibold text-white mb-1">
                            {monthLabel(m.key, monthLongFmt)}
                          </p>
                          <p className="text-[11px] text-[#D4D4D8] tabular-nums">
                            Implantação: {currency.format(m.setup)}
                          </p>
                          <p className="text-[11px] text-[#D4D4D8] tabular-nums">
                            Mensalidades: {currency.format(m.monthly)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <details className="group mt-5">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-[#065F46] hover:text-[#047857] transition-colors">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4 w-4 shrink-0 text-[#A1A1AA] transition-transform duration-200 group-open:rotate-90"
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
                      <tr className="border-b border-[#E4E4E7]">
                        <th className="py-2 pr-4 text-left text-[11px] font-semibold text-[#52525B]">
                          Mês
                        </th>
                        <th className="py-2 px-4 text-right text-[11px] font-semibold text-[#52525B]">
                          Implantação
                        </th>
                        <th className="py-2 px-4 text-right text-[11px] font-semibold text-[#52525B]">
                          Mensalidades
                        </th>
                        <th className="py-2 pl-4 text-right text-[11px] font-semibold text-[#52525B]">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {months.map((m) => (
                        <tr key={m.key} className="border-b border-[#F4F4F5] last:border-b-0">
                          <td className="py-2 pr-4 text-[#18181B]">
                            {monthLabel(m.key, monthLongFmt)}
                          </td>
                          <td className="py-2 px-4 text-right text-[#52525B] tabular-nums">
                            {currency.format(m.setup)}
                          </td>
                          <td className="py-2 px-4 text-right text-[#52525B] tabular-nums">
                            {currency.format(m.monthly)}
                          </td>
                          <td className="py-2 pl-4 text-right font-semibold text-[#18181B] tabular-nums">
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
        <section className="rounded-2xl border border-[#E4E4E7] bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-[#18181B]">Faturamento por cliente</h2>
            <p className="text-xs text-[#A1A1AA]">
              {scopeLabel === "todo o período" ? "Todo o período" : scopeLabel} · implantação e
              mensalidades separadas
            </p>
          </div>

          {clientRows.length === 0 ? (
            <p className="text-sm text-[#71717A]">Nenhum faturamento no filtro selecionado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E4E4E7]">
                    <th className="py-2 pr-4 text-left text-[11px] font-semibold text-[#52525B]">
                      Cliente
                    </th>
                    <th className="py-2 px-4 text-right text-[11px] font-semibold text-[#52525B]">
                      Implantação
                    </th>
                    <th className="py-2 px-4 text-right text-[11px] font-semibold text-[#52525B]">
                      Mensalidades
                    </th>
                    <th className="py-2 pl-4 text-right text-[11px] font-semibold text-[#52525B]">
                      Total
                    </th>
                    {passThroughTotal > 0 && (
                      <th className="py-2 pl-4 text-right text-[11px] font-semibold text-[#A1A1AA]">
                        Repasse Meta
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {clientRows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-[#F4F4F5] last:border-b-0 hover:bg-[#F9FBF8] transition-colors"
                    >
                      <td className="py-2.5 pr-4">
                        <Link
                          href={`/financeiro/${r.id}`}
                          className="text-[#18181B] hover:text-[#065F46] font-medium transition-colors"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#52525B] tabular-nums">
                        {r.setup > 0 ? currency.format(r.setup) : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#52525B] tabular-nums">
                        {r.monthly > 0 ? currency.format(r.monthly) : "—"}
                      </td>
                      <td className="py-2.5 pl-4 text-right font-semibold text-[#18181B] tabular-nums">
                        {currency.format(r.total)}
                      </td>
                      {passThroughTotal > 0 && (
                        <td className="py-2.5 pl-4 text-right text-[#A1A1AA] tabular-nums">
                          {r.passThrough > 0 ? currency.format(r.passThrough) : "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#E4E4E7]">
                    <td className="py-2.5 pr-4 text-[11px] font-semibold text-[#52525B]">
                      Total ({clientRows.length} cliente{clientRows.length === 1 ? "" : "s"})
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-[#18181B] tabular-nums">
                      {currency.format(setupTotal)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-[#18181B] tabular-nums">
                      {currency.format(monthlyTotal)}
                    </td>
                    <td className="py-2.5 pl-4 text-right font-extrabold text-[#18181B] tabular-nums">
                      {currency.format(grandTotal)}
                    </td>
                    {passThroughTotal > 0 && (
                      <td className="py-2.5 pl-4 text-right font-semibold text-[#A1A1AA] tabular-nums">
                        {currency.format(passThroughTotal)}
                      </td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
