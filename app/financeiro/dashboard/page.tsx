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

// Paleta das séries validada com scripts/validate_palette.js (skill dataviz):
// ΔE 27.6 visão normal / 9.2 CVD no par adjacente. Verde = recebido e laranja
// = em aberto mantêm a mesma semântica de cor já usada no resto do app. O
// contraste do verde fica em 2.74:1 (abaixo de 3:1), então as barras SEMPRE
// levam rótulo visível + tabela de dados — é o alívio exigido pelo validador.
const SERIES_RECEIVED = "#1baf7a";
const SERIES_OPEN = "#eb6834";

// Altura da área do gráfico e da barra mais alta, em pixel.
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

const PERIOD_OPTIONS = [
  { value: "6", label: "Últimos 6 meses" },
  { value: "12", label: "Últimos 12 meses" },
  { value: "all", label: "Todo o período" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Todas as cobranças" },
  { value: "open", label: "Somente em aberto" },
  { value: "paid", label: "Somente pagas" },
  { value: "overdue", label: "Somente atrasadas" },
];

/** Primeiro dia do mês, N meses atrás — corte do filtro de período. */
function monthsAgoIso(months: number): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() - months + 1, 1))
    .toISOString()
    .slice(0, 10);
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
  searchParams: Promise<{ period?: string; status?: string; client?: string }>;
}) {
  const { period, status, client } = await searchParams;
  const activePeriod = PERIOD_OPTIONS.some((o) => o.value === period) ? period! : "12";
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

  const cutoffIso = activePeriod === "all" ? null : monthsAgoIso(Number(activePeriod));
  const filtered = billings.filter((b) => {
    if (cutoffIso && b.due_date < cutoffIso) return false;
    if (activeClient && b.client_id !== activeClient) return false;
    if (activeStatus === "open" && b.paid) return false;
    if (activeStatus === "paid" && !b.paid) return false;
    if (activeStatus === "overdue" && (b.paid || b.due_date >= todayIso)) return false;
    return true;
  });

  // --- Números-síntese ---
  let openTotal = 0;
  let receivedTotal = 0;
  let overdueTotal = 0;
  let overdueCount = 0;
  let commissionTotal = 0;

  for (const b of filtered) {
    const { total_value, commission_value } = calcBillingTotal(b);
    commissionTotal += commission_value;
    if (b.paid) {
      receivedTotal += total_value;
    } else {
      openTotal += total_value;
      if (b.due_date < todayIso) {
        overdueTotal += total_value;
        overdueCount += 1;
      }
    }
  }

  // --- Série mensal (recebido x em aberto) ---
  const byMonth = new Map<string, { received: number; open: number }>();
  for (const b of filtered) {
    const key = monthKey(b.due_date);
    const bucket = byMonth.get(key) ?? { received: 0, open: 0 };
    const { total_value } = calcBillingTotal(b);
    if (b.paid) bucket.received += total_value;
    else bucket.open += total_value;
    byMonth.set(key, bucket);
  }
  const months = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ key, ...v, total: v.received + v.open }));
  const maxMonthTotal = Math.max(1, ...months.map((m) => m.total));

  // --- Ranking por cliente (valor em aberto) ---
  const byClient = new Map<string, number>();
  for (const b of filtered) {
    if (b.paid) continue;
    const { total_value } = calcBillingTotal(b);
    byClient.set(b.client_id, (byClient.get(b.client_id) ?? 0) + total_value);
  }
  const ranking = [...byClient.entries()]
    .map(([id, total]) => ({ id, name: clientsById.get(id)?.name ?? "Cliente removido", total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  const maxRanking = Math.max(1, ...ranking.map((r) => r.total));

  const clientOptions = [
    { value: "", label: "Todos os clientes" },
    ...clients.map((c) => ({ value: c.id, label: c.name })),
  ];

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

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 rounded-2xl border border-[#E4E4E7] bg-white p-4 shadow-sm">
          <FilterSelect
            name="period"
            label="Período"
            defaultValue={activePeriod}
            options={PERIOD_OPTIONS}
            basePath="/financeiro/dashboard"
          />
          <FilterSelect
            name="client"
            label="Cliente"
            defaultValue={activeClient}
            options={clientOptions}
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

        {/* Números-síntese */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold text-[#52525B] mb-1">Em aberto</p>
            <p className="text-lg font-bold text-[#18181B] tabular-nums">
              {currency.format(openTotal)}
            </p>
          </div>
          <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold text-[#52525B] mb-1">Recebido</p>
            <p className="text-lg font-bold text-[#18181B] tabular-nums">
              {currency.format(receivedTotal)}
            </p>
          </div>
          <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold text-[#52525B] mb-1">Atrasado</p>
            <p
              className={`text-lg font-bold tabular-nums ${overdueTotal > 0 ? "text-[#B91C1C]" : "text-[#18181B]"}`}
            >
              {currency.format(overdueTotal)}
            </p>
            <p className="text-[11px] text-[#A1A1AA]">
              {overdueCount} cobrança{overdueCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold text-[#52525B] mb-1">Comissão no período</p>
            <p className="text-lg font-bold text-[#18181B] tabular-nums">
              {currency.format(commissionTotal)}
            </p>
          </div>
        </div>

        {/* Evolução mensal */}
        <section className="rounded-2xl border border-[#E4E4E7] bg-white p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
            <div>
              <h2 className="text-sm font-bold text-[#18181B]">Evolução mensal</h2>
              <p className="text-xs text-[#A1A1AA]">Total cobrado por mês de referência</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: SERIES_RECEIVED }}
                />
                <span className="text-xs text-[#52525B]">Recebido</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SERIES_OPEN }} />
                <span className="text-xs text-[#52525B]">Em aberto</span>
              </div>
            </div>
          </div>

          {months.length === 0 ? (
            <p className="text-sm text-[#71717A]">Nenhuma cobrança no período selecionado.</p>
          ) : (
            <>
              {/* pt-20/px-12 dão folga pro tooltip (centralizado acima da coluna)
                  caber dentro da área rolável — sem isso o overflow-x-auto corta
                  ele em cima e nas laterais das colunas das pontas. */}
              <div className="overflow-x-auto">
                <div className="flex items-end gap-3 min-w-max pt-20 px-12">
                  {months.map((m) => {
                    // Alturas em pixel, não em %: dentro de um flex container a
                    // altura percentual não resolve contra um pai sem altura
                    // definida, e as barras somem.
                    const barTotal = Math.max((m.total / maxMonthTotal) * BAR_MAX_PX, 3);
                    const receivedPx = m.total > 0 ? (m.received / m.total) * barTotal : 0;
                    const openPx = barTotal - receivedPx;
                    return (
                      <div key={m.key} className="group relative flex w-16 flex-col items-center">
                        <div
                          className="flex w-full flex-col justify-end"
                          style={{ height: PLOT_HEIGHT_PX }}
                        >
                          <span className="mb-1 text-center text-[10px] font-semibold text-[#52525B] tabular-nums">
                            {compactCurrency.format(m.total)}
                          </span>
                          {openPx > 0.5 && (
                            <div
                              className="w-full rounded-t"
                              style={{
                                backgroundColor: SERIES_OPEN,
                                height: openPx,
                                marginBottom: receivedPx > 0.5 ? 2 : 0,
                              }}
                            />
                          )}
                          {receivedPx > 0.5 && (
                            <div
                              className={openPx > 0.5 ? "w-full" : "w-full rounded-t"}
                              style={{ backgroundColor: SERIES_RECEIVED, height: receivedPx }}
                            />
                          )}
                        </div>

                        <p className="mt-2 text-[10px] text-[#71717A] whitespace-nowrap">
                          {monthLabel(m.key, monthShortFmt)}
                        </p>

                        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#18181B] px-3 py-2 text-left shadow-lg group-hover:block">
                          <p className="text-[11px] font-semibold text-white mb-1">
                            {monthLabel(m.key, monthLongFmt)}
                          </p>
                          <p className="text-[11px] text-[#D4D4D8] tabular-nums">
                            Recebido: {currency.format(m.received)}
                          </p>
                          <p className="text-[11px] text-[#D4D4D8] tabular-nums">
                            Em aberto: {currency.format(m.open)}
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
                          Recebido
                        </th>
                        <th className="py-2 px-4 text-right text-[11px] font-semibold text-[#52525B]">
                          Em aberto
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
                            {currency.format(m.received)}
                          </td>
                          <td className="py-2 px-4 text-right text-[#52525B] tabular-nums">
                            {currency.format(m.open)}
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

        {/* Ranking por cliente */}
        <section className="rounded-2xl border border-[#E4E4E7] bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-sm font-bold text-[#18181B]">Maiores valores em aberto</h2>
            <p className="text-xs text-[#A1A1AA]">Por cliente, no período selecionado</p>
          </div>

          {ranking.length === 0 ? (
            <p className="text-sm text-[#71717A]">Nenhum valor em aberto no período selecionado.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {ranking.map((r) => (
                <Link
                  key={r.id}
                  href={`/financeiro/${r.id}`}
                  className="group block rounded-lg px-2 py-1.5 -mx-2 hover:bg-[#F9FBF8] transition-colors"
                >
                  <div className="flex items-center justify-between gap-4 mb-1.5">
                    <p className="text-sm font-medium text-[#18181B] truncate">{r.name}</p>
                    <p className="text-sm font-semibold text-[#18181B] tabular-nums shrink-0">
                      {currency.format(r.total)}
                    </p>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#F4F4F5] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max((r.total / maxRanking) * 100, 2)}%`,
                        backgroundColor: SERIES_OPEN,
                      }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
