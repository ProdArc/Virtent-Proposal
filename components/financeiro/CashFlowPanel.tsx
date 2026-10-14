const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export interface CashFlowWindow {
  days: number;
  toReceive: number;
  toPay: number;
}

/**
 * Fluxo de caixa projetado: cruza o que entra (contas a receber) com o que sai
 * (contas a pagar) nos próximos 7 e 30 dias. É a razão de os dois módulos
 * viverem no mesmo painel — separados, nenhum dos dois responde "vai sobrar
 * ou faltar dinheiro?".
 */
export function CashFlowPanel({ windows }: { windows: CashFlowWindow[] }) {
  return (
    <section className="rounded-3xl bg-card shadow-card p-6 sm:p-8">
      <div className="mb-5">
        <h2 className="text-sm font-bold text-ink">Fluxo de caixa projetado</h2>
        <p className="text-xs text-secondary-ink">
          Contas a receber em aberto menos contas a pagar em aberto, por vencimento
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {windows.map((w) => {
          const balance = w.toReceive - w.toPay;
          const positive = balance >= 0;
          return (
            <div key={w.days} className="rounded-2xl border border-hairline p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-ink mb-3">
                Próximos {w.days} dias
              </p>

              <dl className="space-y-1.5 mb-3">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-secondary-ink">A receber</dt>
                  <dd className="text-sm font-semibold tabular-nums text-paid-ink">
                    + {currency.format(w.toReceive)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-secondary-ink">A pagar</dt>
                  <dd className="text-sm font-semibold tabular-nums text-overdue-ink">
                    − {currency.format(w.toPay)}
                  </dd>
                </div>
              </dl>

              <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
                <span className="text-xs font-semibold text-ink">Saldo projetado</span>
                <span
                  className={`text-base font-bold tabular-nums ${positive ? "text-paid-ink" : "text-overdue-ink"}`}
                >
                  {positive ? "" : "−"}
                  {currency.format(Math.abs(balance))}
                </span>
              </div>
              {!positive && (
                <p className="mt-2 text-[11px] font-medium text-overdue-ink">
                  Falta caixa nesse período — antecipe recebimentos ou renegocie vencimentos.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
