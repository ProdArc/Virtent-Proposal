import Link from "next/link";
import { listMovements, type CashMovementRow } from "@/lib/cash";
import { listCategories, listPayables, type CategoryRow, type PayableRow } from "@/lib/payables";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/financeiro/ui";
import { CategoryTag } from "@/components/financeiro/CategoryTag";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthLongFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const monthShortFmt = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function signedSum(movements: CashMovementRow[]): number {
  return movements.reduce((s, m) => s + (m.direction === "in" ? Number(m.amount) : -Number(m.amount)), 0);
}

export const dynamic = "force-dynamic";

export default async function DrePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const todayMonth = new Date().toISOString().slice(0, 7);
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : todayMonth;

  let movements: CashMovementRow[] = [];
  let payables: PayableRow[] = [];
  let categories: CategoryRow[] = [];
  let configError: string | null = null;

  try {
    movements = await listMovements();
  } catch (err) {
    configError = err instanceof Error ? err.message : "Erro ao carregar o DRE.";
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

  // Categoria de cada despesa vem do cadastro de contas a pagar — um módulo
  // indisponível não deve derrubar o DRE, só agrupa tudo em "Sem categoria".
  try {
    [payables, categories] = await Promise.all([
      listPayables(),
      listCategories(true),
    ]);
  } catch {
    // segue com os arrays vazios
  }

  const payableById = new Map(payables.map((p) => [p.id, p]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  // ── Série mensal (receita/despesa/resultado) pra tabela comparativa ──
  const byMonth = new Map<string, { receita: number; despesa: number }>();
  for (const m of movements) {
    if (m.kind !== "setup" && m.kind !== "monthly" && m.kind !== "payable") continue;
    const key = m.occurred_at.slice(0, 7);
    const entry = byMonth.get(key) ?? { receita: 0, despesa: 0 };
    const signed = m.direction === "in" ? Number(m.amount) : -Number(m.amount);
    if (m.kind === "payable") entry.despesa += -signed;
    else entry.receita += signed;
    byMonth.set(key, entry);
  }
  const trend = [...byMonth.keys()]
    .sort()
    .slice(-12)
    .map((key) => {
      const { receita, despesa } = byMonth.get(key)!;
      return { key, receita, despesa, resultado: receita - despesa };
    });

  // ── Detalhe do mês selecionado ──
  const monthMovements = movements.filter((m) => m.occurred_at.slice(0, 7) === month);
  const receitaImplantacao = signedSum(monthMovements.filter((m) => m.kind === "setup"));
  const receitaMensalidade = signedSum(monthMovements.filter((m) => m.kind === "monthly"));
  const receitaBruta = receitaImplantacao + receitaMensalidade;

  const expenseByCategory = new Map<string, { name: string; color: string; total: number }>();
  for (const m of monthMovements) {
    if (m.kind !== "payable") continue;
    const signed = m.direction === "out" ? Number(m.amount) : -Number(m.amount);
    const payable = m.source_id ? payableById.get(m.source_id) : undefined;
    const category = payable ? categoryById.get(payable.category_id) : undefined;
    const key = category?.id ?? "_none";
    const bucket = expenseByCategory.get(key) ?? {
      name: category?.name ?? "Sem categoria",
      color: category?.color ?? "#A1A1AA",
      total: 0,
    };
    bucket.total += signed;
    expenseByCategory.set(key, bucket);
  }
  const expenseRows = [...expenseByCategory.values()]
    .filter((c) => Math.abs(c.total) > 0.004)
    .sort((a, b) => b.total - a.total);
  const despesasTotal = expenseRows.reduce((s, c) => s + c.total, 0);

  const resultado = receitaBruta - despesasTotal;
  const margem = receitaBruta > 0 ? (resultado / receitaBruta) * 100 : null;

  // Aporte, devolução, saldo inicial: dinheiro que passa pelo caixa mas não é
  // resultado operacional — mostrado à parte pra não distorcer a margem.
  const foraDoResultado = signedSum(
    monthMovements.filter((m) => m.kind === "manual" || m.kind === "opening")
  );

  const monthLabel = capitalize(monthLongFmt.format(new Date(`${month}-01T00:00:00`)));
  const prevMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: "/financeiro/caixa", label: "Voltar para o Caixa" }}
        title="DRE"
        subtitle="Demonstrativo de resultado em regime de caixa — conta o que efetivamente entrou e saiu, não o que está previsto."
      />

      {/* Navegação de mês */}
      <div className="mb-5 flex items-center justify-between gap-2 rounded-full bg-card p-1.5 shadow-card">
        <Link
          href={`/financeiro/caixa/dre?month=${prevMonth}`}
          aria-label="Mês anterior"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-neutral-bg active:scale-95"
        >
          <CaretLeft size={20} weight="bold" aria-hidden="true" />
        </Link>
        <h2 className="min-w-0 flex-1 truncate text-center text-[15px] font-bold text-ink">{monthLabel}</h2>
        <Link
          href={`/financeiro/caixa/dre?month=${nextMonth}`}
          aria-label="Próximo mês"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-neutral-bg active:scale-95"
        >
          <CaretRight size={20} weight="bold" aria-hidden="true" />
        </Link>
      </div>
      <form action="/financeiro/caixa/dre" className="mb-6 flex items-center gap-2">
        <input
          type="month"
          name="month"
          defaultValue={month}
          aria-label="Escolher mês do DRE"
          className="min-w-0 flex-1 rounded-2xl border-0 bg-card px-4 py-2.5 text-sm text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="submit"
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-card px-5 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:bg-neutral-bg"
        >
          Ir
        </button>
      </form>

        {/* DRE do mês */}
        <section className="rounded-3xl bg-card shadow-card p-6 sm:p-8 mb-6">
          <dl className="space-y-2.5 mb-4">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-secondary-ink">Implantações</dt>
              <dd className="text-sm tabular-nums text-ink">{currency.format(receitaImplantacao)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-secondary-ink">Mensalidades</dt>
              <dd className="text-sm tabular-nums text-ink">{currency.format(receitaMensalidade)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-hairline pt-2.5">
              <dt className="text-xs font-bold text-ink">Receita bruta</dt>
              <dd className="text-sm font-bold tabular-nums text-paid-ink">
                {currency.format(receitaBruta)}
              </dd>
            </div>
          </dl>

          {expenseRows.length > 0 && (
            <dl className="space-y-2 mb-4 border-t border-hairline pt-4">
              {expenseRows.map((c) => (
                <div key={c.name} className="flex items-center justify-between gap-3">
                  <dt className="min-w-0">
                    <CategoryTag name={c.name} color={c.color} />
                  </dt>
                  <dd className="shrink-0 text-sm tabular-nums text-overdue-ink">
                    − {currency.format(c.total)}
                  </dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-3 border-t border-hairline pt-2.5">
                <dt className="text-xs font-bold text-ink">Despesas totais</dt>
                <dd className="text-sm font-bold tabular-nums text-overdue-ink">
                  − {currency.format(despesasTotal)}
                </dd>
              </div>
            </dl>
          )}

          <div
            className={`flex items-center justify-between gap-3 rounded-2xl p-4 ${
              resultado >= 0 ? "bg-paid-bg" : "bg-overdue-bg"
            }`}
          >
            <div>
              <p className="text-xs font-bold text-ink">Resultado do mês</p>
              {margem !== null && (
                <p className="text-[11px] text-secondary-ink">
                  Margem de {margem.toFixed(1).replace(".", ",")}%
                </p>
              )}
            </div>
            <p
              className={`text-xl font-extrabold tabular-nums ${
                resultado >= 0 ? "text-paid-ink" : "text-overdue-ink"
              }`}
            >
              {resultado >= 0 ? "+" : "−"}
              {currency.format(Math.abs(resultado))}
            </p>
          </div>

          {Math.abs(foraDoResultado) > 0.004 && (
            <p className="mt-3 text-[11px] text-secondary-ink leading-relaxed">
              Fora do resultado: {currency.format(foraDoResultado)} em saldo inicial e/ou entradas
              manuais (aporte, devolução...) neste mês — não é receita operacional.
            </p>
          )}

          {receitaBruta === 0 && despesasTotal === 0 && (
            <p className="mt-3 text-xs text-neutral-ink">
              Nenhuma movimentação de receita ou despesa neste mês.
            </p>
          )}
        </section>

        {/* Últimos meses */}
        <section className="rounded-3xl bg-card shadow-card p-6 sm:p-8 mb-6">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-ink">Últimos meses</h2>
            <p className="text-xs text-secondary-ink">Receita, despesa e resultado mês a mês</p>
          </div>

          {trend.length === 0 ? (
            <p className="text-sm text-neutral-ink">Nenhuma movimentação registrada ainda.</p>
          ) : (
            <>
            <ul className="divide-y divide-hairline md:hidden">
              {trend.map((t) => (
                <li key={t.key}>
                  <Link
                    href={`/financeiro/caixa/dre?month=${t.key}`}
                    className={`flex items-center justify-between gap-3 py-3.5 ${t.key === month ? "font-semibold" : ""}`}
                  >
                    <span>
                      <span className="block text-[15px] font-semibold text-ink">
                        {capitalize(monthShortFmt.format(new Date(`${t.key}-01T00:00:00`)))}
                      </span>
                      <span className="block text-xs text-secondary-ink tabular-nums">
                        {currency.format(t.receita)} − {currency.format(t.despesa)}
                      </span>
                    </span>
                    <span
                      className={`text-[15px] font-bold tabular-nums ${
                        t.resultado >= 0 ? "text-paid-ink" : "text-overdue-ink"
                      }`}
                    >
                      {t.resultado >= 0 ? "+" : "−"}
                      {currency.format(Math.abs(t.resultado))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-neutral-ink">
                    <th className="px-2 py-2 text-left font-semibold">Mês</th>
                    <th className="px-2 py-2 text-right font-semibold">Receita</th>
                    <th className="px-2 py-2 text-right font-semibold">Despesa</th>
                    <th className="px-2 py-2 text-right font-semibold">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((t) => (
                    <tr
                      key={t.key}
                      className={`border-t border-hairline ${t.key === month ? "bg-surface" : ""}`}
                    >
                      <td className="px-2 py-2">
                        <Link
                          href={`/financeiro/caixa/dre?month=${t.key}`}
                          className="font-medium text-ink hover:text-brand-ink transition-colors"
                        >
                          {capitalize(monthShortFmt.format(new Date(`${t.key}-01T00:00:00`)))}
                        </Link>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-paid-ink">
                        {currency.format(t.receita)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-overdue-ink">
                        {currency.format(t.despesa)}
                      </td>
                      <td
                        className={`px-2 py-2 text-right font-semibold tabular-nums ${
                          t.resultado >= 0 ? "text-paid-ink" : "text-overdue-ink"
                        }`}
                      >
                        {t.resultado >= 0 ? "+" : "−"}
                        {currency.format(Math.abs(t.resultado))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>
    </div>
  );
}
