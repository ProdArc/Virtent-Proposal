"use client";

import { useActionState } from "react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { saveOpeningBalanceAction, type FormState } from "./actions";

const initial: FormState = {};

/**
 * Saldo inicial: o sistema não nasce com caixa zero. Entra como a primeira
 * linha do extrato e é a única movimentação que se digita à mão — todas as
 * outras vêm das baixas e pagamentos.
 */
export function OpeningBalanceForm({ amount, date }: { amount: number; date: string }) {
  const [state, formAction, pending] = useActionState(saveOpeningBalanceAction, initial);

  return (
    <details className="group rounded-3xl bg-card shadow-card">
      <summary className="cursor-pointer list-none px-6 py-4 text-sm font-semibold text-ink hover:bg-surface transition-colors">
        Ajustes · saldo inicial de caixa
        <span className="ml-2 font-normal text-secondary-ink">
          {amount !== 0 ? "(configurado)" : "(não configurado)"}
        </span>
      </summary>

      <form action={formAction} className="border-t border-border px-6 py-5">
        <p className="mb-4 text-xs text-neutral-ink leading-relaxed">
          Quanto havia em caixa antes de começar a usar o sistema. Serve de ponto de partida — a
          partir dele, o saldo é movimentado só pelas baixas e pagamentos.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-ink mb-1">Valor</label>
            <CurrencyInput name="amount" defaultValue={Math.abs(amount)} className="w-40" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-neutral-ink mb-1">
              Data de referência
            </label>
            <input
              name="date"
              type="date"
              defaultValue={date}
              required
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <label className="flex items-center gap-2 pb-2.5">
            <input
              type="checkbox"
              name="negative"
              defaultChecked={amount < 0}
              className="h-4 w-4 rounded border-border text-brand-ink focus:ring-brand/30"
            />
            <span className="text-xs text-neutral-ink">Começou negativo</span>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-lg bg-brand px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar saldo inicial"}
          </button>
        </div>

        {state.error && (
          <p className="mt-3 rounded-lg border border-pending-line bg-pending-bg px-3 py-2 text-xs text-pending-ink">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="mt-3 rounded-lg border border-paid-line bg-paid-bg px-3 py-2 text-xs text-paid-ink">
            Saldo inicial salvo.
          </p>
        )}
      </form>
    </details>
  );
}
