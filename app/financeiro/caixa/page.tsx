import Link from "next/link";
import { getCashBalance, getOpeningMovement, listMovements, type CashMovementRow } from "@/lib/cash";
import { calcBillingTotal, listAllBillings, listFinancialClients } from "@/lib/financial";
import { listPayables } from "@/lib/payables";
import { remainingAmount } from "@/lib/payables-status";
import { daysUntil, todayIso } from "@/lib/urgency";
import { ChartPieSlice, HandCoins, ListBullets, Receipt } from "@phosphor-icons/react/dist/ssr";
import { HeroCard, PageHeader, QuickAction } from "@/components/financeiro/ui";
import { SummaryCard } from "@/components/financeiro/SummaryCard";
import { BalanceChart } from "@/components/financeiro/BalanceChart";
import { OpeningBalanceForm } from "./OpeningBalanceForm";
import { ManualIncomeForm } from "./ManualIncomeForm";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthLongFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const dynamic = "force-dynamic";

export default async function CaixaPage({
  searchParams,
}: {
  searchParams: Promise<{ until?: string }>;
}) {
  const sp = await searchParams;
  const untilParam = sp.until && /^\d{4}-\d{2}-\d{2}$/.test(sp.until) ? sp.until : "";

  let movements: CashMovementRow[] = [];
  let balance = { balance: 0, total_in: 0, total_out: 0, movements: 0 };
  let opening: CashMovementRow | null = null;
  let configError: string | null = null;

  try {
    [movements, balance, opening] = await Promise.all([
      listMovements(),
      getCashBalance(),
      getOpeningMovement(),
    ]);
  } catch (err) {
    configError = err instanceof Error ? err.message : "Erro ao carregar o caixa.";
  }

  if (configError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-lg text-center">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-pending-ink mb-3">
            Configuração pendente
          </p>
          <h1 className="text-xl font-bold text-ink mb-2">Caixa ainda não instalado no banco</h1>
          <p className="text-sm text-neutral-ink leading-relaxed">
            Rode a migração <code className="font-mono">008_caixa.sql</code> no SQL Editor do
            Supabase para criar o livro de movimentações.
          </p>
          <p className="mt-3 text-xs text-secondary-ink">{configError}</p>
        </div>
      </div>
    );
  }

  const today = todayIso();
  const monthKey = today.slice(0, 7);

  const inMonth = movements.filter((m) => m.occurred_at.slice(0, 7) === monthKey);
  const entradasMes = inMonth
    .filter((m) => m.direction === "in" && m.kind !== "opening")
    .reduce((s, m) => s + Number(m.amount), 0);
  const saidasMes = inMonth
    .filter((m) => m.direction === "out" && m.kind !== "opening")
    .reduce((s, m) => s + Number(m.amount), 0);
  const resultadoMes = entradasMes - saidasMes;

  // ── Previsto (ainda não aconteceu) — não se mistura com saldo de caixa ──
  let previstoReceber = 0;
  let previstoPagar = 0;
  let proj7 = { receber: 0, pagar: 0 };
  let proj30 = { receber: 0, pagar: 0 };
  let projCustom = { receber: 0, pagar: 0 };

  try {
    const [clients, billings, payables] = await Promise.all([
      listFinancialClients(),
      listAllBillings(),
      listPayables().catch(() => []),
    ]);

    const openBillings = billings.filter((b) => !b.paid);
    const openSetups = clients.filter((c) => !c.setup_paid);
    const openPayables = payables.filter((p) => p.status === "pending");

    previstoReceber =
      openBillings.reduce((s, b) => s + calcBillingTotal(b).total_value, 0) +
      openSetups.reduce((s, c) => s + Number(c.setup_value), 0);
    previstoPagar = openPayables.reduce((s, p) => s + remainingAmount(p), 0);

    const within = (due: string, days: number) => daysUntil(due, today) <= days;
    for (const [days, target] of [[7, proj7], [30, proj30]] as const) {
      target.receber =
        openBillings.filter((b) => within(b.due_date, days)).reduce((s, b) => s + calcBillingTotal(b).total_value, 0) +
        openSetups
          .filter((c) => within(c.setup_due_date ?? c.first_billing_date, days))
          .reduce((s, c) => s + Number(c.setup_value), 0);
      target.pagar = openPayables
        .filter((p) => within(p.due_date, days))
        .reduce((s, p) => s + remainingAmount(p), 0);
    }

    if (untilParam) {
      const upTo = (due: string) => due <= untilParam;
      projCustom.receber =
        openBillings.filter((b) => upTo(b.due_date)).reduce((s, b) => s + calcBillingTotal(b).total_value, 0) +
        openSetups
          .filter((c) => upTo(c.setup_due_date ?? c.first_billing_date))
          .reduce((s, c) => s + Number(c.setup_value), 0);
      projCustom.pagar = openPayables
        .filter((p) => upTo(p.due_date))
        .reduce((s, p) => s + remainingAmount(p), 0);
    }
  } catch {
    // Um módulo indisponível não deve derrubar o painel de caixa.
  }

  // ── Evolução do saldo, mês a mês (últimos 12) ──
  const byMonth = new Map<string, number>();
  for (const m of movements) {
    const key = m.occurred_at.slice(0, 7);
    const delta = m.direction === "in" ? Number(m.amount) : -Number(m.amount);
    byMonth.set(key, (byMonth.get(key) ?? 0) + delta);
  }
  const sortedMonths = [...byMonth.keys()].sort();
  let running = 0;
  const series = sortedMonths.map((key) => {
    running += byMonth.get(key) ?? 0;
    return { key, balance: Math.round(running * 100) / 100 };
  });
  const chartSeries = series.slice(-12);

  const saldo = balance.balance;

  return (
    <>
      <PageHeader title="Caixa" subtitle="Dinheiro que já entrou e saiu de fato" />

      {/* Saldo em destaque — é a métrica principal da tela */}
      <HeroCard
        label="Saldo em caixa"
        value={currency.format(saldo)}
        tone={saldo >= 0 ? "paid" : "overdue"}
        hint={
          <>
            {balance.movements} movimentaç{balance.movements === 1 ? "ão" : "ões"} registrada
            {balance.movements === 1 ? "" : "s"}
          </>
        }
      >
        <div className="flex items-start justify-between gap-2 sm:justify-start sm:gap-6">
          <QuickAction href="/financeiro/caixa/extrato" label="Extrato" icon={ListBullets} />
          <QuickAction href="/financeiro/caixa/dre" label="DRE" icon={ChartPieSlice} />
          <QuickAction href="/financeiro" label="A receber" icon={HandCoins} />
          <QuickAction href="/financeiro/pagar" label="A pagar" icon={Receipt} />
        </div>
      </HeroCard>

        {/* Previsto — conceito diferente de saldo, rotulado pra não confundir */}
        <div className="mb-6 mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            label={`Entradas de ${capitalize(monthLongFmt.format(new Date()))}`}
            value={currency.format(entradasMes)}
            tone="paid"
            hint="baixas recebidas no mês"
            href="/financeiro/caixa/extrato?type=in"
          />
          <SummaryCard
            label="Saídas do mês"
            value={currency.format(saidasMes)}
            tone="overdue"
            hint="contas pagas no mês"
            href="/financeiro/caixa/extrato?type=out"
          />
          <SummaryCard
            label="Previsto a receber"
            value={currency.format(previstoReceber)}
            hint="ainda não recebido"
            href="/financeiro"
          />
          <SummaryCard
            label="Previsto a pagar"
            value={currency.format(previstoPagar)}
            hint="ainda não pago"
            href="/financeiro/pagar"
          />
        </div>

        {/* Resultado do mês */}
        <section className="rounded-3xl bg-white shadow-card p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-ink">Resultado do mês</h2>
              <p className="text-xs text-secondary-ink">
                Entradas menos saídas do mês corrente ·{" "}
                <Link href="/financeiro/caixa/dre" className="font-semibold text-brand hover:text-brand-hover transition-colors">
                  ver DRE completo
                </Link>
              </p>
            </div>
            <p
              className={`text-2xl font-extrabold tabular-nums ${
                resultadoMes >= 0 ? "text-paid-ink" : "text-overdue-ink"
              }`}
            >
              {resultadoMes >= 0 ? "+" : "−"}
              {currency.format(Math.abs(resultadoMes))}
            </p>
          </div>
          <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-neutral-bg">
            {entradasMes + saidasMes > 0 && (
              <>
                <div
                  className="bg-paid-ink"
                  style={{ width: `${(entradasMes / (entradasMes + saidasMes)) * 100}%` }}
                />
                <div
                  className="bg-overdue-ink"
                  style={{ width: `${(saidasMes / (entradasMes + saidasMes)) * 100}%` }}
                />
              </>
            )}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-secondary-ink">
            <span>Entradas {currency.format(entradasMes)}</span>
            <span>Saídas {currency.format(saidasMes)}</span>
          </div>
        </section>

        {/* Projeção */}
        <section className="rounded-3xl bg-white shadow-card p-6 sm:p-8 mb-6">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-ink">Saldo projetado</h2>
            <p className="text-xs text-secondary-ink">
              Saldo de hoje mais o previsto a receber, menos o previsto a pagar, por vencimento
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: "7", label: "Em 7 dias", data: proj7 },
              { key: "30", label: "Em 30 dias", data: proj30 },
            ].map(({ key, label, data }) => {
              const projected = saldo + data.receber - data.pagar;
              return (
                <div key={key} className="rounded-2xl border border-hairline p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-ink mb-3">
                    {label}
                  </p>
                  <dl className="space-y-1.5 mb-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-xs text-secondary-ink">Saldo hoje</dt>
                      <dd className="text-sm tabular-nums text-ink">{currency.format(saldo)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-xs text-secondary-ink">A receber</dt>
                      <dd className="text-sm font-semibold tabular-nums text-paid-ink">
                        + {currency.format(data.receber)}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-xs text-secondary-ink">A pagar</dt>
                      <dd className="text-sm font-semibold tabular-nums text-overdue-ink">
                        − {currency.format(data.pagar)}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
                    <span className="text-xs font-semibold text-ink">Saldo projetado</span>
                    <span
                      className={`text-base font-bold tabular-nums ${
                        projected >= 0 ? "text-paid-ink" : "text-overdue-ink"
                      }`}
                    >
                      {currency.format(projected)}
                    </span>
                  </div>
                  {projected < 0 && (
                    <p className="mt-2 text-[11px] font-medium text-overdue-ink">
                      O caixa fica negativo nesse período.
                    </p>
                  )}
                </div>
              );
            })}

            {/* Data escolhida — mesmo cálculo, mas até uma data qualquer em vez de N dias fixos */}
            <div className="rounded-2xl border border-hairline p-4">
              <form action="/financeiro/caixa" className="mb-3 flex items-center gap-2">
                <input
                  name="until"
                  type="date"
                  min={today}
                  defaultValue={untilParam || undefined}
                  aria-label="Escolher data para projetar o saldo"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-white px-2 py-1.5 text-xs text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-brand px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover transition-colors min-h-10"
                >
                  Ver
                </button>
              </form>

              {untilParam ? (
                (() => {
                  const projected = saldo + projCustom.receber - projCustom.pagar;
                  const dateLabel = new Date(`${untilParam}T00:00:00`).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  return (
                    <>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-ink mb-3">
                        Até {dateLabel}
                      </p>
                      <dl className="space-y-1.5 mb-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="text-xs text-secondary-ink">Saldo hoje</dt>
                          <dd className="text-sm tabular-nums text-ink">{currency.format(saldo)}</dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="text-xs text-secondary-ink">A receber</dt>
                          <dd className="text-sm font-semibold tabular-nums text-paid-ink">
                            + {currency.format(projCustom.receber)}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="text-xs text-secondary-ink">A pagar</dt>
                          <dd className="text-sm font-semibold tabular-nums text-overdue-ink">
                            − {currency.format(projCustom.pagar)}
                          </dd>
                        </div>
                      </dl>
                      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
                        <span className="text-xs font-semibold text-ink">Saldo projetado</span>
                        <span
                          className={`text-base font-bold tabular-nums ${
                            projected >= 0 ? "text-paid-ink" : "text-overdue-ink"
                          }`}
                        >
                          {currency.format(projected)}
                        </span>
                      </div>
                      {projected < 0 && (
                        <p className="mt-2 text-[11px] font-medium text-overdue-ink">
                          O caixa fica negativo até essa data.
                        </p>
                      )}
                    </>
                  );
                })()
              ) : (
                <p className="text-xs text-secondary-ink leading-relaxed">
                  Escolha uma data pra ver o saldo projetado até lá.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Evolução */}
        <section className="rounded-3xl bg-white shadow-card p-6 sm:p-8 mb-6">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-ink">Evolução do saldo</h2>
            <p className="text-xs text-secondary-ink">Saldo acumulado ao fim de cada mês</p>
          </div>
          <BalanceChart series={chartSeries} />
        </section>

        <div className="space-y-3">
          <ManualIncomeForm />
          <OpeningBalanceForm
            amount={opening ? (opening.direction === "in" ? Number(opening.amount) : -Number(opening.amount)) : 0}
            date={opening ? opening.occurred_at.slice(0, 10) : today}
          />
        </div>
    </>
  );
}
