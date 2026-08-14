"use client";

import { useActionState, useState } from "react";
import { createFinancialClientAction, type NewFinancialClientState } from "./actions";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { CnpjInput } from "@/components/ui/CnpjInput";

const initialState: NewFinancialClientState = {};

const DUE_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

/** Sugestão inicial: pós-pago, então o 1º vencimento é 1 ciclo à frente do dia escolhido, nunca o mês corrente. */
function suggestFirstBillingDate(dueDay: number): string {
  const now = new Date();
  const day = Math.min(Math.max(dueDay, 1), 28);
  const suggested = new Date(now.getFullYear(), now.getMonth() + 1, day);
  return suggested.toISOString().slice(0, 10);
}

export function NewClientForm() {
  const [state, formAction, pending] = useActionState(createFinancialClientAction, initialState);
  const [dueDay, setDueDay] = useState(10);
  const [firstBillingDate, setFirstBillingDate] = useState(() => suggestFirstBillingDate(10));
  const [firstBillingTouched, setFirstBillingTouched] = useState(false);

  function handleDueDayChange(value: number) {
    setDueDay(value);
    if (!firstBillingTouched) {
      setFirstBillingDate(suggestFirstBillingDate(value));
    }
  }

  return (
    <form action={formAction} className="rounded-2xl border border-[#E4E4E7] bg-white p-6 sm:p-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="block text-xs font-semibold text-[#52525B] mb-1.5">
            Nome da empresa
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Cartão de TODOS - Campinas Sudoeste"
            className="w-full rounded-lg border border-[#E4E4E7] px-3 py-2.5 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
          />
        </div>

        <div>
          <label htmlFor="cnpj" className="block text-xs font-semibold text-[#52525B] mb-1.5">
            CNPJ
          </label>
          <CnpjInput id="cnpj" name="cnpj" />
        </div>

        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-[#52525B] mb-1.5">
            E-mail(s) da unidade
          </label>
          <input
            id="email"
            name="email"
            type="email"
            multiple
            placeholder="unidade@exemplo.com, financeiro@exemplo.com"
            className="w-full rounded-lg border border-[#E4E4E7] px-3 py-2.5 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
          />
          <p className="mt-1 text-[11px] text-[#A1A1AA]">Separe vários e-mails por vírgula.</p>
        </div>

        <div>
          <label htmlFor="setupValue" className="block text-xs font-semibold text-[#52525B] mb-1.5">
            Valor de implantação
          </label>
          <CurrencyInput id="setupValue" name="setupValue" required />
        </div>

        <div>
          <label htmlFor="setupDueDate" className="block text-xs font-semibold text-[#52525B] mb-1.5">
            Vencimento da implantação
          </label>
          <input
            id="setupDueDate"
            name="setupDueDate"
            type="date"
            className="w-full rounded-lg border border-[#E4E4E7] px-3 py-2.5 text-sm text-[#18181B] focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
          />
        </div>

        <div>
          <label htmlFor="monthlyValue" className="block text-xs font-semibold text-[#52525B] mb-1.5">
            Valor de mensalidade
          </label>
          <CurrencyInput id="monthlyValue" name="monthlyValue" required />
        </div>

        <div>
          <label htmlFor="dueDay" className="block text-xs font-semibold text-[#52525B] mb-1.5">
            Dia de vencimento da mensalidade
          </label>
          <select
            id="dueDay"
            name="dueDay"
            required
            value={dueDay}
            onChange={(e) => handleDueDayChange(Number(e.target.value))}
            className="w-full rounded-lg border border-[#E4E4E7] px-3 py-2.5 text-sm text-[#18181B] bg-white focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
          >
            {DUE_DAYS.map((day) => (
              <option key={day} value={day}>
                Todo dia {day}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="firstBillingDate" className="block text-xs font-semibold text-[#52525B] mb-1.5">
            Primeiro vencimento da mensalidade
          </label>
          <input
            id="firstBillingDate"
            name="firstBillingDate"
            type="date"
            required
            value={firstBillingDate}
            onChange={(e) => {
              setFirstBillingTouched(true);
              setFirstBillingDate(e.target.value);
            }}
            className="w-full rounded-lg border border-[#E4E4E7] px-3 py-2.5 text-sm text-[#18181B] focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
          />
          <p className="text-[11px] text-[#A1A1AA] mt-1">
            Pós-pago: normalmente 1 mês após o cadastro, não o mês corrente.
          </p>
        </div>

        <div>
          <label htmlFor="commissionPct" className="block text-xs font-semibold text-[#52525B] mb-1.5">
            Comissão sobre arrecadação
          </label>
          <div className="flex items-center rounded-lg border border-[#E4E4E7] bg-white focus-within:ring-2 focus-within:ring-[#065F46]/30 focus-within:border-[#065F46]">
            <input
              id="commissionPct"
              name="commissionPct"
              type="number"
              step="0.1"
              min={0}
              max={100}
              required
              defaultValue={5}
              className="w-full min-w-0 bg-transparent pl-3 py-2.5 text-sm text-[#18181B] focus:outline-none"
            />
            <span className="pr-3 text-sm text-[#A1A1AA] select-none">%</span>
          </div>
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-[#B45309] bg-[#FFF7ED] border border-[#FDBA74]/40 rounded-lg px-3 py-2 mb-4">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center text-sm font-semibold px-5 py-2.5 rounded-lg bg-[#065F46] text-white hover:bg-[#047857] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? "Criando..." : "Criar cliente"}
      </button>
    </form>
  );
}
