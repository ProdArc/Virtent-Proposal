"use client";

import { useActionState } from "react";
import { ConfirmButton } from "@/app/financeiro/[id]/ConfirmButton";
import {
  cancelManualReceivableAction,
  receiveManualReceivableAction,
  type FormState,
} from "./actions";
import type { ManualReceivableRow } from "@/lib/manual-receivables";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
const initial: FormState = {};

function ReceiveButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(receiveManualReceivableAction, initial);
  return (
    <form action={formAction} className="shrink-0">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="h-8 rounded-full bg-paid-solid px-3 text-[11.5px] font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Marcar como recebido"}
      </button>
      {state.error && <p className="mt-1 max-w-[12rem] text-[10px] text-overdue-ink">{state.error}</p>}
    </form>
  );
}

function CancelButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(cancelManualReceivableAction, initial);
  return (
    <form action={formAction} className="shrink-0">
      <input type="hidden" name="id" value={id} />
      <ConfirmButton
        confirmText="Cancelar esta pendência? Ela some de 'o que falta cobrar' sem gerar movimentação no caixa."
        className="text-[11.5px] font-semibold text-secondary-ink hover:text-overdue-ink transition-colors disabled:opacity-60"
      >
        {pending ? "Cancelando..." : "Cancelar"}
      </ConfirmButton>
      {state.error && <p className="mt-1 max-w-[12rem] text-[10px] text-overdue-ink">{state.error}</p>}
    </form>
  );
}

/**
 * Pendências avulsas a receber (lib/manual-receivables) — a contrapartida de
 * "Ainda vou receber" no formulário de entrada manual. Fica logo acima do
 * formulário pra ser a 1ª coisa vista ao abrir o Caixa: é exatamente "o que
 * falta cobrar" que não tem cadastro de cliente nem ciclo de mensalidade.
 */
export function ManualReceivablesList({ items }: { items: ManualReceivableRow[] }) {
  if (items.length === 0) return null;

  const total = items.reduce((s, r) => s + Number(r.amount), 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="rounded-3xl bg-card shadow-card p-6 mb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-ink">Pendências avulsas</h2>
          <p className="text-xs text-secondary-ink">
            Cobranças que não vêm de mensalidade, implantação nem repasse Meta
          </p>
        </div>
        <p className="text-base font-extrabold tabular-nums text-ink">{currency.format(total)}</p>
      </div>

      <div className="divide-y divide-hairline">
        {items.map((r) => {
          const overdue = r.due_date < today;
          return (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{r.description}</p>
                <p className="text-xs text-secondary-ink">
                  {r.counterpart && <>{r.counterpart} · </>}
                  <span className={overdue ? "font-semibold text-overdue-ink" : undefined}>
                    Vencimento {dateFmt(r.due_date)}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <p className="text-sm font-bold tabular-nums text-ink">{currency.format(Number(r.amount))}</p>
                <ReceiveButton id={r.id} />
                <CancelButton id={r.id} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
