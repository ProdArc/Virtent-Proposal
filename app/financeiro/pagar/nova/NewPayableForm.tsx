"use client";

import { useActionState, useState } from "react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { PAYMENT_METHODS } from "@/lib/payables-status";
import { createPayableAction, type FormState } from "../actions";

const initial: FormState = {};

const FIELD =
  "w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
const LABEL = "block text-xs font-semibold text-neutral-ink mb-1.5";

/**
 * Cadastro rápido: só 4 campos obrigatórios em cima (fornecedor, categoria,
 * valor, vencimento). Tudo mais fica atrás de um "mais opções" pra não travar
 * o lançamento do dia a dia.
 *
 * Fornecedor e categoria usam <datalist>: aceita digitar livre, mas sugere o
 * que já existe — e o servidor casa por nome normalizado, então "Google" e
 * "google  llc" não viram dois cadastros.
 */
export function NewPayableForm({
  suppliers,
  categories,
}: {
  suppliers: string[];
  categories: string[];
}) {
  const [state, formAction, pending] = useActionState(createPayableAction, initial);
  const [mode, setMode] = useState<"single" | "installments" | "recurring">("single");

  return (
    <form action={formAction} className="rounded-3xl bg-white shadow-card p-6 sm:p-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <div>
          <label htmlFor="supplier" className={LABEL}>
            Fornecedor <span className="text-overdue-ink">*</span>
          </label>
          <input
            id="supplier"
            name="supplier"
            list="supplier-options"
            required
            autoFocus
            autoComplete="off"
            placeholder="Ex: Imobiliária Central"
            className={FIELD}
          />
          <datalist id="supplier-options">
            {suppliers.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <p className="mt-1 text-[11px] text-secondary-ink">
            Não existe ainda? É criado automaticamente ao salvar.
          </p>
        </div>

        <div>
          <label htmlFor="category" className={LABEL}>
            Categoria <span className="text-overdue-ink">*</span>
          </label>
          <input
            id="category"
            name="category"
            list="category-options"
            required
            autoComplete="off"
            placeholder="Ex: Aluguel"
            className={FIELD}
          />
          <datalist id="category-options">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="amount" className={LABEL}>
            Valor <span className="text-overdue-ink">*</span>
          </label>
          <CurrencyInput id="amount" name="amount" required />
        </div>

        <div>
          <label htmlFor="dueDate" className={LABEL}>
            Vencimento <span className="text-overdue-ink">*</span>
          </label>
          <input id="dueDate" name="dueDate" type="date" required className={FIELD} />
        </div>
      </div>

      {/* Repetição — some do caminho de quem só quer lançar uma conta */}
      <fieldset className="mb-5 rounded-2xl border border-hairline bg-surface p-4">
        <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-ink">
          Repetição
        </legend>
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { key: "single" as const, label: "Conta única" },
            { key: "installments" as const, label: "Parcelar" },
            { key: "recurring" as const, label: "Recorrente" },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMode(opt.key)}
              aria-pressed={mode === opt.key}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === opt.key
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-white text-neutral-ink hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {mode === "installments" && (
          <div className="max-w-xs">
            <label htmlFor="installments" className={LABEL}>
              Número de parcelas
            </label>
            <input
              id="installments"
              name="installments"
              type="number"
              min={2}
              max={60}
              defaultValue={2}
              className={FIELD}
            />
            <p className="mt-1 text-[11px] text-secondary-ink">
              O valor é dividido e os vencimentos seguem mês a mês.
            </p>
          </div>
        )}

        {mode === "recurring" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div>
              <label htmlFor="recurrence" className={LABEL}>
                Frequência
              </label>
              <select id="recurrence" name="recurrence" defaultValue="monthly" className={FIELD}>
                <option value="monthly">Mensal</option>
                <option value="weekly">Semanal</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
            <div>
              <label htmlFor="occurrences" className={LABEL}>
                Quantas ocorrências
              </label>
              <input
                id="occurrences"
                name="occurrences"
                type="number"
                min={2}
                max={60}
                defaultValue={12}
                className={FIELD}
              />
            </div>
            <p className="sm:col-span-2 text-[11px] text-secondary-ink">
              Cada ocorrência vira uma conta própria — dá pra editar o valor de um mês (conta de
              luz varia) sem afetar os outros.
            </p>
          </div>
        )}
      </fieldset>

      <details className="mb-5 group">
        <summary className="cursor-pointer list-none text-xs font-semibold text-brand hover:text-brand-hover transition-colors">
          + Mais opções (descrição, forma de pagamento, origem, observações)
        </summary>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label htmlFor="title" className={LABEL}>
              Descrição
            </label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="Se vazio, usa o nome da categoria"
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="issueDate" className={LABEL}>
              Data de emissão
            </label>
            <input id="issueDate" name="issueDate" type="date" className={FIELD} />
          </div>
          <div>
            <label htmlFor="paymentMethod" className={LABEL}>
              Forma de pagamento
            </label>
            <select id="paymentMethod" name="paymentMethod" defaultValue="" className={FIELD}>
              <option value="">Não definida</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="accountOrigin" className={LABEL}>
              Conta / carteira de origem
            </label>
            <input
              id="accountOrigin"
              name="accountOrigin"
              type="text"
              placeholder="Ex: Santander PJ"
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="costCenter" className={LABEL}>
              Centro de custo
            </label>
            <input
              id="costCenter"
              name="costCenter"
              type="text"
              placeholder="Opcional"
              className={FIELD}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="notes" className={LABEL}>
              Observações internas
            </label>
            <textarea id="notes" name="notes" rows={3} className={FIELD} />
          </div>
        </div>
      </details>

      {state.error && (
        <p className="mb-4 rounded-lg border border-pending-line bg-pending-bg px-3 py-2 text-sm text-pending-ink">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 min-h-10"
      >
        {pending ? "Lançando..." : "Lançar conta"}
      </button>
    </form>
  );
}
