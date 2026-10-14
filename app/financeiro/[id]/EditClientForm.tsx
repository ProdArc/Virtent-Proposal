"use client";

import { useActionState, useState } from "react";
import { updateClientAction, type FormActionState } from "./actions";
import type { FinancialClientRow } from "@/lib/financial";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { CnpjInput } from "@/components/ui/CnpjInput";
import { BillingMethodsFields } from "@/components/financeiro/BillingMethodsFields";

const initialState: FormActionState = {};
const DUE_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

/**
 * Sugestão de 1º repasse Meta pra quem ainda não tem: o próximo vencimento a
 * partir de hoje. Ligar o repasse num cliente antigo não pode cair no
 * `first_billing_date`, senão gera repasse vazio pra todos os meses passados.
 */
function nextDueDateFromToday(dueDay: number): string {
  const now = new Date();
  const day = Math.min(Math.max(dueDay, 1), 28);
  const thisMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), day));
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const next =
    thisMonth.getTime() >= todayUtc
      ? thisMonth
      : new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, day));
  return next.toISOString().slice(0, 10);
}

export function EditClientForm({
  client,
  segmentSuggestions,
}: {
  client: FinancialClientRow;
  segmentSuggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateClientAction, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-[#18181B] ring-1 ring-black/10 transition-colors hover:bg-[#F4F4F5]"
      >
        Editar dados do cliente
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-3 rounded-3xl bg-white p-5 shadow-card sm:p-6"
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
          <label className="block text-xs font-semibold text-[#52525B] mb-1.5">Segmento</label>
          <input
            name="segment"
            type="text"
            list="segment-suggestions"
            defaultValue={client.segment ?? ""}
            placeholder="Ex: Franquia, Academia, Clínica..."
            className="w-full rounded-lg border border-[#E4E4E7] px-3 py-2 text-sm text-[#18181B] bg-white placeholder:text-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
          />
          <datalist id="segment-suggestions">
            {segmentSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
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
        <BillingMethodsFields
          defaults={{
            billFixed: client.bill_fixed,
            billCommission: client.bill_commission,
            billMeta: client.bill_meta,
            monthlyValue: client.monthly_value,
            commissionPct: client.commission_pct,
            metaFeePerDispatch: client.meta_fee_per_dispatch,
            metaFirstBillingDate:
              client.meta_first_billing_date ?? nextDueDateFromToday(client.due_day),
          }}
          metaDateHint={
            client.meta_first_billing_date
              ? "Os ciclos de repasse começam nesta data."
              : "Sugestão: próximo vencimento. Antes dele não é gerado repasse."
          }
          inputClassName="w-full rounded-lg border border-[#E4E4E7] px-3 py-2 text-sm text-[#18181B] bg-white focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
        />
        <div>
          <label className="block text-xs font-semibold text-[#52525B] mb-1.5">
            Dia de vencimento das cobranças
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
          className="inline-flex items-center justify-center text-sm font-semibold px-4 py-2 rounded-full bg-[#065F46] text-white hover:bg-[#047857] disabled:opacity-60 disabled:cursor-not-allowed transition-colors min-h-10"
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
