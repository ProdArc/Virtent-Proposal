import Link from "next/link";
import { listCategories, listPayables, type CategoryRow, type PayableRow } from "@/lib/payables";
import { CategoryTag } from "@/components/financeiro/CategoryTag";
import { CategoryForm, MergeCategoryForm } from "./CategoryForm";
import { archiveCategoryAction } from "../actions";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  let categories: CategoryRow[] = [];
  let payables: PayableRow[] = [];
  let loadError: string | null = null;

  try {
    [categories, payables] = await Promise.all([listCategories(true), listPayables()]);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Erro ao carregar categorias.";
  }

  const usage = new Map<string, { count: number; total: number }>();
  for (const p of payables) {
    const u = usage.get(p.category_id) ?? { count: 0, total: 0 };
    u.count += 1;
    u.total += Number(p.amount);
    usage.set(p.category_id, u);
  }

  const active = categories.filter((c) => !c.archived);
  const archived = categories.filter((c) => c.archived);

  return (
    <main className="min-h-screen bg-surface py-12 sm:py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/financeiro/pagar"
          className="text-xs text-neutral-ink hover:text-ink transition-colors"
        >
          ← Contas a pagar
        </Link>
        <p className="text-xs uppercase tracking-[0.18em] font-semibold text-brand mt-4 mb-3">
          Virtent
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink mb-1">Categorias</h1>
        <p className="text-sm text-neutral-ink mb-8">
          A cor identifica a categoria nos cards e gráficos. Categorias em uso não são excluídas —
          são arquivadas ou mescladas, pra não quebrar o histórico.
        </p>

        {loadError && (
          <p className="mb-6 rounded-lg border border-pending-line bg-pending-bg px-3 py-2 text-sm text-pending-ink">
            {loadError}
          </p>
        )}

        <div className="mb-8">
          <CategoryForm />
        </div>

        {active.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-ink mb-1">Nenhuma categoria ativa</p>
            <p className="text-sm text-neutral-ink">Cadastre a primeira acima.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm mb-6">
            {active.map((c) => {
              const u = usage.get(c.id) ?? { count: 0, total: 0 };
              return (
                <details key={c.id} className="group border-b border-border last:border-b-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-surface transition-colors">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 rounded"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="truncate text-sm font-semibold text-ink">{c.name}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold tabular-nums text-ink">
                        {currency.format(u.total)}
                      </span>
                      <span className="block text-[10.5px] text-secondary-ink">
                        {u.count} conta{u.count === 1 ? "" : "s"}
                      </span>
                    </span>
                  </summary>
                  <div className="border-t border-border bg-surface px-4 py-4">
                    <CategoryForm category={c} />
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <Link
                        href={`/financeiro/pagar?category=${c.id}`}
                        className="text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
                      >
                        Ver contas desta categoria →
                      </Link>
                      <form action={archiveCategoryAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="archived" value="true" />
                        <button
                          type="submit"
                          className="text-xs font-medium text-neutral-ink hover:text-ink transition-colors"
                        >
                          Arquivar
                        </button>
                      </form>
                    </div>
                    {u.count > 0 && (
                      <div className="mt-4 border-t border-border pt-4">
                        <MergeCategoryForm
                          from={c}
                          options={active.filter((o) => o.id !== c.id).map((o) => ({ id: o.id, name: o.name }))}
                        />
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}

        {archived.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer list-none text-xs font-semibold text-brand hover:text-brand-hover transition-colors">
              Arquivadas ({archived.length})
            </summary>
            <div className="mt-3 rounded-2xl border border-border bg-white overflow-hidden">
              {archived.map((c) => {
                const u = usage.get(c.id) ?? { count: 0, total: 0 };
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <CategoryTag name={c.name} color={c.color} archived />
                    <div className="flex items-center gap-4">
                      <span className="text-[11px] text-secondary-ink">
                        {u.count} conta{u.count === 1 ? "" : "s"}
                      </span>
                      <form action={archiveCategoryAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="archived" value="false" />
                        <button
                          type="submit"
                          className="text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
                        >
                          Reativar
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>
    </main>
  );
}
