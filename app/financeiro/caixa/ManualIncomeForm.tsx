"use client";

import { useActionState, useEffect, useState } from "react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { addManualIncomeAction, type FormState } from "./actions";

const initial: FormState = {};
const FIELD =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
const LABEL = "block text-[11px] font-semibold text-neutral-ink mb-1";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Entrada avulsa que não vem de baixa de cliente — aporte, devolução, etc.
 * Formulário remonta (via `formKey`) a cada sucesso: os campos são
 * descontrolados/controlados por `defaultValue`, então dar reset de verdade
 * exige recriar a árvore, não só limpar valores.
 */
export function ManualIncomeForm() {
  const [state, formAction, pending] = useActionState(addManualIncomeAction, initial);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.ok) setFormKey((k) => k + 1);
  }, [state.ok]);

  return (
    <details className="group rounded-3xl bg-white shadow-card">
      <summary className="cursor-pointer list-none px-6 py-4 text-sm font-semibold text-ink hover:bg-surface transition-colors">
        Adicionar entrada manual
        <span className="ml-2 font-normal text-secondary-ink">aporte, devolução, outras receitas...</span>
      </summary>

      <form key={formKey} action={formAction} className="border-t border-border px-6 py-5">
        <p className="mb-4 text-xs text-neutral-ink leading-relaxed">
          Para dinheiro que entrou no caixa mas não veio de uma baixa de cliente. Para desfazer,
          use &quot;Estornar&quot; no extrato — nada aqui é apagado, só corrigido.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className={LABEL}>
              Valor <span className="text-overdue-ink">*</span>
            </label>
            <CurrencyInput name="amount" className="w-full" />
          </div>
          <div>
            <label className={LABEL}>Data</label>
            <input name="date" type="date" defaultValue={today()} className={FIELD} />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>
              Descrição <span className="text-overdue-ink">*</span>
            </label>
            <input
              name="description"
              required
              placeholder="Ex: Aporte dos sócios, devolução de fornecedor..."
              className={FIELD}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>De quem (opcional)</label>
            <input name="counterpart" placeholder="Ex: João, Fornecedor X" className={FIELD} />
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-lg bg-brand px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Adicionar entrada"}
        </button>

        {state.error && (
          <p className="mt-3 rounded-lg border border-pending-line bg-pending-bg px-3 py-2 text-xs text-pending-ink">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="mt-3 rounded-lg border border-paid-line bg-paid-bg px-3 py-2 text-xs text-paid-ink">
            Entrada registrada.
          </p>
        )}
      </form>
    </details>
  );
}
