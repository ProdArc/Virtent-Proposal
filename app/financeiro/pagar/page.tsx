import Link from "next/link";
import {
  listCategories,
  listPayables,
  listSuppliers,
  normalizeName,
  type CategoryRow,
  type PayableRow,
  type SupplierRow,
} from "@/lib/payables";
import {
  matchesPayableFilter,
  payableGroup,
  payableState,
  remainingAmount,
  PAYABLE_FILTER_LABEL,
  type PayableFilter,
} from "@/lib/payables-status";
import { GROUP_ORDER, todayIso, daysUntil, type UrgencyGroup } from "@/lib/urgency";
import { Plus, Storefront, Tag, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import {
  btnPrimary,
  btnSecondary,
  EmptyState,
  HeroCard,
  PageHeader,
  QuickAction,
} from "@/components/financeiro/ui";
import { SummaryCard } from "@/components/financeiro/SummaryCard";
import { UrgencyGroupHeader } from "@/components/financeiro/UrgencyGroupHeader";
import { PayableCard } from "@/components/financeiro/PayableCard";
import { PayableFilters } from "./PayableFilters";
import { quickPayAction } from "./actions";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const FILTERS: PayableFilter[] = ["", "urgent", "overdue", "upcoming", "paid"];

export const dynamic = "force-dynamic";

export default async function ContasAPagarPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    supplier?: string;
    category?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const sp = await searchParams;
  const activeFilter: PayableFilter = FILTERS.includes(sp.status as PayableFilter)
    ? (sp.status as PayableFilter)
    : "";
  const search = sp.q ?? "";
  const supplierFilter = sp.supplier ?? "";
  const categoryFilter = sp.category ?? "";
  const from = sp.from ?? "";
  const to = sp.to ?? "";

  let payables: PayableRow[] = [];
  let suppliers: SupplierRow[] = [];
  let categories: CategoryRow[] = [];
  let configError: string | null = null;

  try {
    [payables, suppliers, categories] = await Promise.all([
      listPayables(),
      listSuppliers(),
      listCategories(true),
    ]);
  } catch (err) {
    configError = err instanceof Error ? err.message : "Erro desconhecido ao conectar ao Supabase.";
  }

  if (configError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-lg text-center">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-pending-ink mb-3">
            Configuração pendente
          </p>
          <h1 className="text-xl font-bold text-ink mb-2">Módulo ainda não instalado no banco</h1>
          <p className="text-sm text-neutral-ink leading-relaxed">
            Rode a migração <code className="font-mono">007_contas_a_pagar.sql</code> no SQL Editor
            do Supabase para criar as tabelas de fornecedores, categorias e contas.
          </p>
          <p className="mt-3 text-xs text-secondary-ink">{configError}</p>
        </div>
      </div>
    );
  }

  const today = todayIso();
  const suppliersById = new Map(suppliers.map((s) => [s.id, s]));
  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  // ── Números do topo (base inteira, independem do filtro) ──
  const monthKey = today.slice(0, 7);
  const openPayables = payables.filter((p) => p.status === "pending");

  const dueThisMonth = payables
    .filter((p) => p.status !== "canceled" && p.due_date.slice(0, 7) === monthKey)
    .reduce((s, p) => s + Number(p.amount), 0);
  const paidThisMonth = payables
    .filter((p) => p.status === "paid" && p.due_date.slice(0, 7) === monthKey)
    .reduce((s, p) => s + Number(p.amount), 0);
  const overdue = openPayables.filter((p) => daysUntil(p.due_date, today) < 0);
  const overdueTotal = overdue.reduce((s, p) => s + remainingAmount(p), 0);
  const dueIn7 = openPayables.filter((p) => {
    const d = daysUntil(p.due_date, today);
    return d >= 0 && d <= 7;
  });
  const dueIn7Total = dueIn7.reduce((s, p) => s + remainingAmount(p), 0);

  const counts = Object.fromEntries(
    FILTERS.map((f) => [f, payables.filter((p) => matchesPayableFilter(p, today, f)).length])
  ) as Record<PayableFilter, number>;

  // ── Filtros combinados ──
  const needle = normalizeName(search);
  const visible = payables.filter((p) => {
    if (!matchesPayableFilter(p, today, activeFilter)) return false;
    if (supplierFilter && p.supplier_id !== supplierFilter) return false;
    if (categoryFilter && p.category_id !== categoryFilter) return false;
    if (from && p.due_date < from) return false;
    if (to && p.due_date > to) return false;
    if (needle) {
      const haystack = normalizeName(
        `${p.title} ${suppliersById.get(p.supplier_id)?.name ?? ""} ${categoriesById.get(p.category_id)?.name ?? ""}`
      );
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const visibleTotal = visible.reduce((s, p) => s + remainingAmount(p), 0);

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: visible
      .filter((p) => payableGroup(p, today) === group)
      .sort((a, b) => {
        // Dentro do grupo: vencimento primeiro (o que aperta antes vem antes),
        // e fornecedor como desempate.
        if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
        const an = suppliersById.get(a.supplier_id)?.name ?? "";
        const bn = suppliersById.get(b.supplier_id)?.name ?? "";
        return an.localeCompare(bn, "pt-BR");
      }),
  })).filter((g) => g.items.length > 0);

  const paramsWith = (patch: Record<string, string>) => {
    const params = new URLSearchParams();
    const merged = {
      status: activeFilter,
      q: search,
      supplier: supplierFilter,
      category: categoryFilter,
      from,
      to,
      ...patch,
    };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/financeiro/pagar?${qs}` : "/financeiro/pagar";
  };

  const exportParams = new URLSearchParams();
  for (const [k, v] of Object.entries({
    status: activeFilter,
    q: search,
    supplier: supplierFilter,
    category: categoryFilter,
    from,
    to,
  }))
    if (v) exportParams.set(k, v);

  return (
    <>
      <PageHeader
        title="A pagar"
        subtitle={`${payables.length} conta${payables.length === 1 ? "" : "s"} lançada${payables.length === 1 ? "" : "s"}`}
        actions={
          <span className="hidden sm:block">
            <Link href="/financeiro/pagar/nova" className={btnPrimary}>
              <Plus size={18} weight="bold" aria-hidden="true" />
              Nova conta
            </Link>
          </span>
        }
      />

      <HeroCard
        label="A pagar no mês"
        value={currency.format(dueThisMonth)}
        hint={
          overdue.length > 0 ? (
            <span className="font-semibold text-overdue-ink">
              {overdue.length} conta{overdue.length === 1 ? "" : "s"} atrasada
              {overdue.length === 1 ? "" : "s"} · {currency.format(overdueTotal)}
            </span>
          ) : (
            "lançado para este mês"
          )
        }
      >
        <div className="flex items-start justify-between gap-2 sm:justify-start sm:gap-6">
          <QuickAction href="/financeiro/pagar/nova" label="Nova conta" icon={Plus} />
          <QuickAction
            href={paramsWith({ status: "overdue" })}
            label="Atrasadas"
            icon={WarningCircle}
            badge={overdue.length}
            tone="danger"
          />
          <QuickAction href="/financeiro/pagar/fornecedores" label="Fornecedores" icon={Storefront} />
          <QuickAction href="/financeiro/pagar/categorias" label="Categorias" icon={Tag} />
        </div>
      </HeroCard>

      <div className="mb-5 mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Vence em 7 dias"
          value={currency.format(dueIn7Total)}
          hint={`${dueIn7.length} conta${dueIn7.length === 1 ? "" : "s"}`}
          tone={dueIn7.length > 0 ? "overdue" : "neutral"}
          href={paramsWith({ status: "urgent" })}
          active={activeFilter === "urgent"}
        />
        <SummaryCard
          label="Atrasadas"
          value={currency.format(overdueTotal)}
          hint={`${overdue.length} conta${overdue.length === 1 ? "" : "s"}`}
          tone={overdue.length > 0 ? "overdue" : "paid"}
          href={paramsWith({ status: "overdue" })}
          active={activeFilter === "overdue"}
        />
        <SummaryCard
          label="Pago no mês"
          value={currency.format(paidThisMonth)}
          tone="paid"
          hint="já quitado"
          href={paramsWith({ status: "paid" })}
          active={activeFilter === "paid"}
          className="col-span-2 sm:col-span-1"
        />
      </div>

        <PayableFilters
          active={activeFilter}
          counts={counts}
          labels={PAYABLE_FILTER_LABEL}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name, archived: c.archived }))}
          current={{ q: search, supplier: supplierFilter, category: categoryFilter, from, to }}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 px-1">
          <p className="text-xs text-secondary-ink">
            {visible.length} de {payables.length} conta{payables.length === 1 ? "" : "s"} ·{" "}
            <strong className="text-neutral-ink">{currency.format(visibleTotal)}</strong> em aberto
            no recorte
          </p>
          {visible.length > 0 && (
            <a
              href={`/financeiro/pagar/export?${exportParams.toString()}`}
              className="text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
            >
              Exportar CSV
            </a>
          )}
        </div>

        {payables.length === 0 ? (
          <EmptyState
            title="Nenhuma conta lançada"
            description="Lance a primeira conta para começar a acompanhar os vencimentos."
            action={
              <Link href="/financeiro/pagar/nova" className={btnPrimary}>
                <Plus size={18} weight="bold" aria-hidden="true" />
                Nova conta
              </Link>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="Nenhuma conta encontrada"
            description="Nada corresponde a esses filtros."
            action={
              <Link href="/financeiro/pagar" className={btnSecondary}>
                Limpar filtros
              </Link>
            }
          />
        ) : (
          grouped.map(({ group, items }) => (
            <section key={group}>
              <UrgencyGroupHeader group={group as UrgencyGroup} count={items.length} />
              <div className="rounded-3xl bg-white shadow-card overflow-hidden">
                {items.map((p) => (
                  <PayableCard
                    key={p.id}
                    payable={p}
                    supplier={suppliersById.get(p.supplier_id)}
                    category={categoriesById.get(p.category_id)}
                    today={today}
                    quickPay={quickPayAction}
                  />
                ))}
              </div>
            </section>
          ))
        )}
    </>
  );
}
