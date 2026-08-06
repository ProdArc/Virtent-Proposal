import Link from "next/link";
import { listPayables, listSuppliers, type PayableRow, type SupplierRow } from "@/lib/payables";
import { remainingAmount } from "@/lib/payables-status";
import { todayIso } from "@/lib/urgency";
import { displayDocument, displayPhone } from "@/lib/format";
import { ConfirmButton } from "@/app/financeiro/[id]/ConfirmButton";
import { SupplierForm } from "./SupplierForm";
import { deleteSupplierAction } from "../actions";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const dynamic = "force-dynamic";

export default async function FornecedoresPage() {
  let suppliers: SupplierRow[] = [];
  let payables: PayableRow[] = [];
  let loadError: string | null = null;

  try {
    [suppliers, payables] = await Promise.all([listSuppliers(), listPayables()]);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Erro ao carregar fornecedores.";
  }

  const today = todayIso();
  const monthKey = today.slice(0, 7);
  const yearKey = today.slice(0, 4);

  const stats = new Map<string, { openTotal: number; openCount: number; month: number; year: number }>();
  for (const p of payables) {
    const s = stats.get(p.supplier_id) ?? { openTotal: 0, openCount: 0, month: 0, year: 0 };
    if (p.status === "pending") {
      s.openTotal += remainingAmount(p);
      s.openCount += 1;
    }
    if (p.status === "paid") {
      const paid = Number(p.paid_amount);
      if (p.due_date.slice(0, 7) === monthKey) s.month += paid;
      if (p.due_date.slice(0, 4) === yearKey) s.year += paid;
    }
    stats.set(p.supplier_id, s);
  }

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
        <h1 className="text-2xl font-extrabold tracking-tight text-ink mb-1">Fornecedores</h1>
        <p className="text-sm text-neutral-ink mb-8">
          {suppliers.length} cadastrado{suppliers.length === 1 ? "" : "s"}. Os totais consideram as
          contas lançadas para cada um.
        </p>

        {loadError && (
          <p className="mb-6 rounded-lg border border-pending-line bg-pending-bg px-3 py-2 text-sm text-pending-ink">
            {loadError}
          </p>
        )}

        <div className="mb-8">
          <SupplierForm />
        </div>

        {suppliers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-ink mb-1">Nenhum fornecedor cadastrado</p>
            <p className="text-sm text-neutral-ink">
              Cadastre acima, ou simplesmente digite o nome ao lançar uma conta — ele é criado
              automaticamente.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
            {suppliers.map((s) => {
              const st = stats.get(s.id) ?? { openTotal: 0, openCount: 0, month: 0, year: 0 };
              return (
                <details key={s.id} className="group border-b border-border last:border-b-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-surface transition-colors">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{s.name}</span>
                      <span className="block truncate text-[11.5px] text-secondary-ink">
                        {displayDocument(s.document) || "sem documento"}
                        {st.openCount > 0
                          ? ` · ${st.openCount} conta${st.openCount === 1 ? "" : "s"} em aberto`
                          : " · nada em aberto"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold tabular-nums text-ink">
                        {currency.format(st.openTotal)}
                      </span>
                      <span className="block text-[10.5px] text-secondary-ink">em aberto</span>
                    </span>
                  </summary>

                  <div className="border-t border-border bg-surface px-4 py-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink">
                          Pago no mês
                        </p>
                        <p className="text-sm font-semibold tabular-nums text-ink">
                          {currency.format(st.month)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink">
                          Pago no ano
                        </p>
                        <p className="text-sm font-semibold tabular-nums text-ink">
                          {currency.format(st.year)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink">
                          E-mail
                        </p>
                        <p className="text-sm text-ink truncate">{s.email || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink">
                          Telefone
                        </p>
                        <p className="text-sm text-ink truncate">{displayPhone(s.phone) || "—"}</p>
                      </div>
                    </div>

                    <SupplierForm supplier={s} />

                    <div className="mt-4 flex items-center gap-4">
                      <Link
                        href={`/financeiro/pagar?supplier=${s.id}`}
                        className="text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
                      >
                        Ver contas deste fornecedor →
                      </Link>
                      <form action={deleteSupplierAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <ConfirmButton
                          confirmText={`Excluir "${s.name}"? Só é possível se ele não tiver contas lançadas.`}
                          className="text-xs font-medium text-overdue-ink hover:opacity-80 transition-opacity"
                        >
                          Excluir
                        </ConfirmButton>
                      </form>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
