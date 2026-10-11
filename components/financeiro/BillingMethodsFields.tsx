"use client";

import { useState, type ReactNode } from "react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

export interface BillingMethodsDefaults {
  billFixed: boolean;
  billCommission: boolean;
  billMeta: boolean;
  monthlyValue: number;
  commissionPct: number;
  metaFeePerDispatch: number;
  metaFirstBillingDate: string | null;
}

/**
 * Formas de cobrança do cliente, marcáveis em combinação. Campo de forma
 * desmarcada só fica escondido (continua no form) — assim o valor não se
 * perde se a forma for remarcada. Lido no servidor por
 * `parseBillingMethodsForm` (lib/financial.ts).
 */
export function BillingMethodsFields({
  defaults,
  metaDateHint,
  inputClassName,
}: {
  defaults: BillingMethodsDefaults;
  /** Explica de onde vem a data sugerida do 1º repasse (muda entre cadastro e edição). */
  metaDateHint: string;
  inputClassName: string;
}) {
  const [fixed, setFixed] = useState(defaults.billFixed);
  const [commission, setCommission] = useState(defaults.billCommission);
  const [meta, setMeta] = useState(defaults.billMeta);

  const none = !fixed && !commission && !meta;

  return (
    <fieldset className="sm:col-span-2">
      <legend className="block text-xs font-semibold text-[#52525B] mb-1.5">Formas de cobrança</legend>
      <p className="text-[11px] text-[#A1A1AA] mb-2.5">
        Marque todas que valem pra este cliente. Fixo e % saem no mesmo boleto; o repasse Meta sai num
        boleto separado.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MethodTile
          name="billFixed"
          checked={fixed}
          onChange={setFixed}
          title="Mensalidade fixa"
          description="Valor fixo todo mês."
        >
          <label className="block text-[11px] font-semibold text-[#52525B] mb-1">Valor</label>
          <CurrencyInput name="monthlyValue" required={fixed} defaultValue={defaults.monthlyValue} />
        </MethodTile>

        <MethodTile
          name="billCommission"
          checked={commission}
          onChange={setCommission}
          title="% sobre arrecadação"
          description="Percentual do que a unidade arrecadou no mês."
        >
          <label className="block text-[11px] font-semibold text-[#52525B] mb-1">Percentual</label>
          <div className="flex items-center rounded-lg border border-[#E4E4E7] bg-white focus-within:ring-2 focus-within:ring-[#065F46]/30 focus-within:border-[#065F46]">
            <input
              name="commissionPct"
              type="number"
              step="0.1"
              min={0}
              max={100}
              required={commission}
              defaultValue={defaults.commissionPct || 5}
              className="w-full min-w-0 bg-transparent pl-3 py-2 text-sm text-[#18181B] focus:outline-none"
            />
            <span className="pr-3 text-sm text-[#A1A1AA] select-none">%</span>
          </div>
        </MethodTile>

        <MethodTile
          name="billMeta"
          checked={meta}
          onChange={setMeta}
          title="Repasse Meta"
          description="Custo da Meta no nosso cartão + adicional por contato disparado (não conta mensagem na janela de atendimento)."
        >
          <label className="block text-[11px] font-semibold text-[#52525B] mb-1">
            Adicional por disparo
          </label>
          <div className="flex items-center rounded-lg border border-[#E4E4E7] bg-white focus-within:ring-2 focus-within:ring-[#065F46]/30 focus-within:border-[#065F46] mb-2.5">
            <span className="pl-3 text-sm text-[#A1A1AA] select-none">R$</span>
            <input
              name="metaFeePerDispatch"
              type="text"
              inputMode="decimal"
              required={meta}
              defaultValue={String(defaults.metaFeePerDispatch || 0.005).replace(".", ",")}
              className="w-full min-w-0 bg-transparent px-2 py-2 text-sm text-[#18181B] focus:outline-none"
            />
          </div>
          <label className="block text-[11px] font-semibold text-[#52525B] mb-1">
            1º vencimento do repasse
          </label>
          <input
            name="metaFirstBillingDate"
            type="date"
            defaultValue={defaults.metaFirstBillingDate ?? ""}
            className={inputClassName}
          />
          <p className="text-[11px] text-[#A1A1AA] mt-1">{metaDateHint}</p>
        </MethodTile>
      </div>

      {none && (
        <p className="mt-2 text-[11px] text-[#B45309]">Marque ao menos uma forma de cobrança.</p>
      )}
    </fieldset>
  );
}

function MethodTile({
  name,
  checked,
  onChange,
  title,
  description,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${checked ? "border-[#065F46]/40 bg-[#F0FAF6]" : "border-[#E4E4E7] bg-white"}`}
    >
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#065F46]"
        />
        <span>
          <span className="block text-sm font-semibold text-[#18181B]">{title}</span>
          <span className="block text-[11px] leading-snug text-[#71717A]">{description}</span>
        </span>
      </label>
      {/* Escondido, não removido: o valor continua indo no form. */}
      <div className={checked ? "mt-3" : "hidden"}>{children}</div>
    </div>
  );
}
