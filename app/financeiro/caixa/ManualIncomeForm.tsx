"use client";

import { useActionState, useEffect, useState } from "react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { addManualEntryAction, type FormState } from "./actions";

const initial: FormState = {};
const FIELD =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
const LABEL = "block text-[11px] font-semibold text-neutral-ink mb-1";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Entrada avulsa que não vem de baixa de cliente — aporte, devolução, cobrança
 * pontual, etc. Dois destinos pro mesmo formulário: "já recebido" lança direto
 * no caixa (comportamento de sempre); "ainda vou receber" só registra a
 * pendência (não mexe no caixa) pra aparecer em "Previsto a receber" e na
 * lista de pendências até ser marcada como recebida.
 *
 * Formulário remonta (via `formKey`) a cada sucesso: os campos são
 * descontrolados/controlados por `defaultValue`, então dar reset de verdade
 * exige recriar a árvore, não só limpar valores.
 */
export function ManualIncomeForm() {
  const [state, formAction, pending] = useActionState(addManualEntryAction, initial);
  const [formKey, setFormKey] = useState(0);
  const [status, setStatus] = useState<"received" | "pending">("received");

  useEffect(() => {
    if (state.ok) {
      setFormKey((k) => k + 1);
      setStatus("received");
    }
  }, [state.ok]);

  const isPending = status === "pending";

  return (
    <details className="group rounded-3xl bg-card shadow-card">
      <summary className="cursor-pointer list-none px-6 py-4 text-sm font-semibold text-ink hover:bg-surface transition-colors">
        Adicionar entrada manual
        <span className="ml-2 font-normal text-secondary-ink">
          aporte, devolução, cobrança avulsa...
        </span>
      </summary>

      <form key={formKey} action={formAction} className="border-t border-border px-6 py-5">
        <p className="mb-4 text-xs text-neutral-ink leading-relaxed">
          Para dinheiro que não vem de mensalidade, implantação nem repasse Meta. Pra desfazer, use
          &quot;Estornar&quot; no extrato (já recebido) ou exclua a pendência — nada aqui é apagado, só
          corrigido.
        </p>

        <div className="mb-4">
          <label className={LABEL}>Situação</label>
          <div role="radiogroup" aria-label="Situação da entrada" className="inline-flex rounded-full bg-neutral-bg p-1">
            {(
              [
                ["received", "Já recebido"],
                ["pending", "Ainda vou receber"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={status === value}
                onClick={() => setStatus(value)}
                className={`h-8 rounded-full px-3.5 text-xs font-semibold transition-colors ${
                  status === value ? "bg-card text-ink shadow-card" : "text-secondary-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input type="hidden" name="status" value={status} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className={LABEL}>
              Valor <span className="text-overdue-ink">*</span>
            </label>
            <CurrencyInput name="amount" className="w-full" />
          </div>
          <div>
            <label className={LABEL}>{isPending ? "Vencimento" : "Data"}</label>
            <input name="date" type="date" defaultValue={today()} className={FIELD} />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>
              Descrição <span className="text-overdue-ink">*</span>
            </label>
            <input
              name="description"
              required
              placeholder={
                isPending
                  ? "Ex: Serviço avulso Cliente X, reembolso pendente..."
                  : "Ex: Aporte dos sócios, devolução de fornecedor..."
              }
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
          {pending ? "Salvando..." : isPending ? "Registrar pendência" : "Adicionar entrada"}
        </button>

        {state.error && (
          <p className="mt-3 rounded-lg border border-pending-line bg-pending-bg px-3 py-2 text-xs text-pending-ink">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="mt-3 rounded-lg border border-paid-line bg-paid-bg px-3 py-2 text-xs text-paid-ink">
            {state.savedAs === "pending" ? "Pendência registrada." : "Entrada registrada."}
          </p>
        )}
      </form>
    </details>
  );
}
