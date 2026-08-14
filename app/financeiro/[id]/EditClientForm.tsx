"use client";

import { useActionState, useState } from "react";
import { updateClientAction, type FormActionState } from "./actions";
import type { FinancialClientRow } from "@/lib/financial";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { CnpjInput } from "@/components/ui/CnpjInput";

const initialState: FormActionState = {};
const DUE_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

export function EditClientForm({ client }: { client: FinancialClientRow }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateClientAction, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-[#065F46] hover:text-[#047857] transition-colors"
      >
        Editar dados do cliente
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-xl border border-[#E4E4E7] bg-[#F9FBF8] p-5 mt-3"
    >
      <input type="hidden" name="id" value={client.id} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-[#52525B] mb-1.5">
            Nome da empresa
          </label>
          <input
            name="name"
            type="text"
            required
            defaultValue={client.name}
            className="w-full rounded-lg border border-[#E4E4E7] px-3 py-2 text-sm text-[#18181B] bg-white focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#52525B] mb-1.5">CNPJ</label>
          <CnpjInput name="cnpj" defaultValue={client.cnpj} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#52525B] mb-1.5">
            E-mail(s) da unidade
          </label>
          <input
            name="email"
            type="email"
            multiple
            defaultValue={client.email ?? ""}
            placeholder="unidade@exemplo.com, financeiro@exemplo.com"
            className="w-full rounded-lg border border-[#E4E4E7] px-3 py-2 text-sm text-[#18181B] bg-white placeholder:text-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
          />
          <p className="mt-1 text-[11px] text-[#A1A1AA]">Separe vários e-mails por vírgula.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#52525B] mb-1.5">
            Valor de implantação
          </label>
          <CurrencyInput name="setupValue" required defaultValue={client.setup_value} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#52525B] mb-1.5">
            Vencimento da implantação
          </label>
          <input
            name="setupDueDate"
            type="date"
            defaultValue={client.setup_due_date ?? ""}
            className="w-full rounded-lg border border-[#E4E4E7] px-3 py-2 text-sm text-[#18181B] bg-white focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#52525B] mb-1.5">
            Valor de mensalidade
          </label>
          <CurrencyInput name="monthlyValue" required defaultValue={client.monthly_value} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#52525B] mb-1.5">
            Dia de vencimento da mensalidade
          </label>
          <select
            name="dueDay"
            required
            defaultValue={client.due_day}
            className="w-full rounded-lg border border-[#E4E4E7] px-3 py-2 text-sm text-[#18181B] bg-white focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
          >
            {DUE_DAYS.map((day) => (
              <option key={day} value={day}>
                Todo dia {day}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#52525B] mb-1.5">
            Primeiro vencimento da mensalidade
          </label>
          <input
            name="firstBillingDate"
            type="date"
            required
            defaultValue={client.first_billing_date}
            className="w-full rounded-lg border border-[#E4E4E7] px-3 py-2 text-sm text-[#18181B] bg-white focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
          />
          <p className="text-[11px] text-[#A1A1AA] mt-1">
            Só afeta o 1º ciclo, antes de qualquer cobrança já gerada.
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#52525B] mb-1.5">
            Comissão sobre arrecadação
          </label>
          <div className="flex items-center rounded-lg border border-[#E4E4E7] bg-white focus-within:ring-2 focus-within:ring-[#065F46]/30 focus-within:border-[#065F46]">
            <input
              name="commissionPct"
              type="number"
              step="0.1"
              min={0}
              max={100}
              required
              defaultValue={client.commission_pct}
              className="w-full min-w-0 bg-transparent pl-3 py-2 text-sm text-[#18181B] focus:outline-none"
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

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center text-sm font-semibold px-4 py-2 rounded-lg bg-[#065F46] text-white hover:bg-[#047857] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-medium text-[#71717A] hover:text-[#18181B] transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
