"use client";

import { useActionState } from "react";
import type { PayableRow } from "@/lib/payables";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { PAYMENT_METHODS } from "@/lib/payables-status";
import { updatePayableAction, type FormState } from "../actions";

const initial: FormState = {};
const FIELD =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
const LABEL = "block text-[11px] font-semibold text-neutral-ink mb-1";

/**
 * Edição da conta. Vale a pena lembrar: cada ocorrência de uma recorrência é
 * uma linha própria, então editar o valor aqui afeta SÓ este mês — que é o
 * comportamento desejado para contas variáveis (luz, água).
 */
export function EditPayableForm({
  payable,
  supplierName,
  categoryName,
  suppliers,
  categories,
}: {
  payable: PayableRow;
  supplierName: string;
  categoryName: string;
  suppliers: string[];
  categories: string[];
}) {
  const [state, formAction, pending] = useActionState(updatePayableAction, initial);

  return (
    <form action={formAction} className="rounded-3xl bg-card shadow-card p-6">
      <input type="hidden" name="id" value={payable.id} />
      <p className="mb-4 text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink">
        Dados da conta
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className={LABEL}>
            Fornecedor <span className="text-overdue-ink">*</span>
          </label>
          <input
            name="supplier"
            list="edit-suppliers"
            required
            defaultValue={supplierName}
            autoComplete="off"
            className={FIELD}
          />
          <datalist id="edit-suppliers">
            {suppliers.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={LABEL}>
            Categoria <span className="text-overdue-ink">*</span>
          </label>
          <input
            name="category"
            list="edit-categories"
            required
            defaultValue={categoryName}
            autoComplete="off"
            className={FIELD}
          />
          <datalist id="edit-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>Descrição</label>
          <input name="title" defaultValue={payable.title} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>
            Valor <span className="text-overdue-ink">*</span>
          </label>
          <CurrencyInput name="amount" required defaultValue={Number(payable.amount)} />
          {payable.recurrence && (
            <p className="mt-1 text-[11px] text-secondary-ink">
              Afeta só esta ocorrência, não as outras da recorrência.
            </p>
          )}
        </div>
        <div>
          <label className={LABEL}>
            Vencimento <span className="text-overdue-ink">*</span>
          </label>
          <input
            name="dueDate"
            type="date"
            required
            defaultValue={payable.due_date}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL}>Data de emissão</label>
          <input
            name="issueDate"
            type="date"
            defaultValue={payable.issue_date ?? ""}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL}>Forma de pagamento</label>
          <select name="paymentMethod" defaultValue={payable.payment_method ?? ""} className={FIELD}>
            <option value="">Não definida</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Conta / carteira de origem</label>
          <input
            name="accountOrigin"
            defaultValue={payable.account_origin ?? ""}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL}>Centro de custo</label>
          <input name="costCenter" defaultValue={payable.cost_center ?? ""} className={FIELD} />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>Observações internas</label>
          <textarea name="notes" rows={3} defaultValue={payable.notes ?? ""} className={FIELD} />
        </div>
      </div>

      {state.error && (
        <p className="mb-3 rounded-lg border border-pending-line bg-pending-bg px-3 py-2 text-xs text-pending-ink">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60 min-h-10"
      >
        {pending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}
