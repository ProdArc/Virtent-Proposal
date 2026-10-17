import type { BankTransactionRow } from "@/lib/bank-transactions";
import { KIND_LABEL, type CashMovementRow } from "@/lib/cash";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmButton } from "@/app/financeiro/[id]/ConfirmButton";
import { inputClass } from "@/components/financeiro/ui";
import {
  dismissBankTransactionAction,
  linkAsIncomeAction,
  linkAsPayableAction,
  reconcileAction,
} from "./actions";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");

const LABEL = "block text-xs font-semibold text-neutral-ink mb-1.5";

/**
 * Uma movimentação pendente do extrato — vira conta a pagar (saída) ou
 * entrada de caixa (entrada) com um clique, ou é ignorada se já está
 * contabilizada por outro caminho. Nunca o contrário: o valor e a data vêm
 * sempre da transação bancária, nunca de um campo editável aqui.
 */
export function BankTransactionCard({
  tx,
  matches,
  suppliers,
  categories,
}: {
  tx: BankTransactionRow;
  matches: CashMovementRow[];
  suppliers: string[];
  categories: string[];
}) {
  const isIn = tx.direction === "in";

  return (
    <details className="group border-b border-hairline last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface sm:px-5">
        <span
          aria-hidden="true"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            isIn ? "bg-paid-bg text-paid-ink" : "bg-overdue-bg text-overdue-ink"
          }`}
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-5 w-5">
            <path
              d={isIn ? "M8 13V3M8 3L4 7M8 3l4 4" : "M8 3v10M8 13l-4-4M8 13l4-4"}
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink">
            {tx.description}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-secondary-ink">
            {dateFmt(tx.occurred_at)}
            {matches.length > 0 && (
              <span className="rounded-full bg-paid-bg px-2 py-0.5 text-[10.5px] font-semibold text-paid-ink">
                já lançado — conciliar
              </span>
            )}
          </span>
        </span>

        <span
          className={`shrink-0 text-[15px] font-bold tabular-nums ${
            isIn ? "text-paid-ink" : "text-overdue-ink"
          }`}
        >
          {isIn ? "+" : "−"}
          {currency.format(Number(tx.amount))}
        </span>
      </summary>

      <div className="border-t border-hairline px-4 py-4 sm:px-5">
        {matches.length > 0 && (
          <div className="mb-4 rounded-2xl bg-paid-bg p-3">
            <p className="mb-2 text-xs font-semibold text-paid-ink">
              Já existe um lançamento com esse valor e direção — provavelmente é isso:
            </p>
            <div className="flex flex-col gap-2">
              {matches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{m.description}</p>
                    <p className="text-xs text-secondary-ink">
                      {dateFmt(m.occurred_at.slice(0, 10))} · {KIND_LABEL[m.kind]}
                    </p>
                  </div>
                  <form action={reconcileAction} className="shrink-0">
                    <input type="hidden" name="bankTxId" value={tx.id} />
                    <input type="hidden" name="cashMovementId" value={m.id} />
                    <SubmitButton
                      pendingLabel="Conciliando..."
                      className="inline-flex h-9 items-center justify-center rounded-full bg-paid-ink px-3 text-xs font-semibold text-white transition-colors hover:opacity-90"
                    >
                      Conciliar
                    </SubmitButton>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}

        {isIn ? (
          <form action={linkAsIncomeAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="bankTxId" value={tx.id} />
            <div className="sm:col-span-2">
              <label className={LABEL}>Descrição</label>
              <input
                name="description"
                type="text"
                required
                defaultValue={tx.description}
                className={inputClass}
              />
            </div>
            <div>
              <label className={LABEL}>De quem (opcional)</label>
              <input name="counterpart" type="text" placeholder="Ex: João, Cliente X" className={inputClass} />
            </div>
            <div>
              <label className={LABEL}>Categoria</label>
              <input
                name="category"
                type="text"
                list="bank-category-options"
                placeholder="Ex: Aporte, Devolução..."
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Observação</label>
              <input name="note" type="text" defaultValue={tx.note ?? ""} className={inputClass} />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3 pt-1">
              <SubmitButton
                pendingLabel="Lançando..."
                className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                Lançar como entrada
              </SubmitButton>
              <DismissButton bankTxId={tx.id} />
            </div>
          </form>
        ) : (
          <form action={linkAsPayableAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="bankTxId" value={tx.id} />
            <div>
              <label className={LABEL}>Fornecedor</label>
              <input
                name="supplier"
                type="text"
                list="bank-supplier-options"
                required
                autoComplete="off"
                placeholder="Ex: Imobiliária Central"
                className={inputClass}
              />
            </div>
            <div>
              <label className={LABEL}>Categoria</label>
              <input
                name="category"
                type="text"
                list="bank-category-options"
                required
                autoComplete="off"
                placeholder="Ex: Aluguel"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Título</label>
              <input
                name="title"
                type="text"
                defaultValue={tx.description}
                placeholder="Se vazio, usa o nome da categoria"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Observação</label>
              <input name="note" type="text" defaultValue={tx.note ?? ""} className={inputClass} />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3 pt-1">
              <SubmitButton
                pendingLabel="Lançando..."
                className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                Lançar como conta paga
              </SubmitButton>
              <DismissButton bankTxId={tx.id} />
            </div>
          </form>
        )}

        <datalist id="bank-supplier-options">
          {suppliers.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <datalist id="bank-category-options">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
    </details>
  );
}

function DismissButton({ bankTxId }: { bankTxId: string }) {
  return (
    <form action={dismissBankTransactionAction}>
      <input type="hidden" name="bankTxId" value={bankTxId} />
      <ConfirmButton
        confirmText="Ignorar esta movimentação? Ela some da fila sem virar conta a pagar nem entrada — use quando já estiver contabilizada por outro caminho."
        className="text-xs font-medium text-secondary-ink transition-colors hover:text-ink"
      >
        Ignorar
      </ConfirmButton>
    </form>
  );
}
