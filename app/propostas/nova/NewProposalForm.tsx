"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createProposalAction, type NewProposalState } from "./actions";

const initialState: NewProposalState = {};

const FIELDS: {
  name: string;
  label: string;
  placeholder: string;
}[] = [
  { name: "clientName", label: "Nome do cliente", placeholder: "Cartão de TODOS - Campinas Sudoeste" },
  { name: "consultantName", label: "Consultor responsável", placeholder: "Eduardo Vaz" },
  { name: "date", label: "Data da proposta", placeholder: "20 de junho de 2026" },
  { name: "validUntil", label: "Válida até", placeholder: "20 de julho de 2026" },
  { name: "monthlyPrice", label: "Valor da mensalidade", placeholder: "R$ 2.200" },
  { name: "setupPrice", label: "Valor de implantação", placeholder: "R$ 999,90" },
];

export function NewProposalForm() {
  const [state, formAction, pending] = useActionState(createProposalAction, initialState);
  const [copied, setCopied] = useState(false);

  if (state.success) {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/p/${state.success.slug}`;

    return (
      <div className="rounded-2xl border border-[#E4E4E7] bg-white p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#065F46] mb-3">
          Proposta criada
        </p>
        <p className="text-sm text-[#71717A] mb-4">
          O link abaixo já está pronto pra enviar pro cliente.
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-[#E4E4E7] bg-[#F9FBF8] px-3 py-2.5 mb-4">
          <code className="flex-1 text-xs sm:text-sm text-[#18181B] font-[family-name:var(--font-geist-mono)] break-all">
            /p/{state.success.slug}
          </code>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="inline-flex items-center justify-center text-sm font-medium px-4 py-2 rounded-lg bg-[#065F46] text-white hover:bg-[#047857] transition-colors"
          >
            {copied ? "Copiado!" : "Copiar link"}
          </button>
          <Link
            href={`/p/${state.success.slug}`}
            target="_blank"
            className="inline-flex items-center justify-center text-sm font-medium px-4 py-2 rounded-lg border border-[#E4E4E7] text-[#18181B] hover:bg-[#F9FBF8] transition-colors"
          >
            Abrir proposta
          </Link>
          <Link
            href="/propostas"
            className="inline-flex items-center justify-center text-sm font-medium px-4 py-2 rounded-lg text-[#71717A] hover:text-[#18181B] transition-colors"
          >
            Voltar pra listagem
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-2xl border border-[#E4E4E7] bg-white p-6 sm:p-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        {FIELDS.map((field) => (
          <div key={field.name} className={field.name === "clientName" ? "sm:col-span-2" : ""}>
            <label
              htmlFor={field.name}
              className="block text-xs font-semibold text-[#52525B] mb-1.5"
            >
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type="text"
              required
              placeholder={field.placeholder}
              className="w-full rounded-lg border border-[#E4E4E7] px-3 py-2.5 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
            />
          </div>
        ))}
      </div>

      {state.error && (
        <p className="text-sm text-[#B45309] bg-[#FFF7ED] border border-[#FDBA74]/40 rounded-lg px-3 py-2 mb-4">
          {state.error}
        </p>
      )}

      <p className="text-xs text-[#A1A1AA] mb-5">
        Todo o resto do conteúdo (textos, seções, features) vem do modelo padrão em{" "}
        <code className="font-[family-name:var(--font-geist-mono)]">lib/content.ts</code>. Pra
        personalizar mais campos depois de criada, edite direto no Supabase Studio.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center text-sm font-semibold px-5 py-2.5 rounded-lg bg-[#065F46] text-white hover:bg-[#047857] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? "Criando..." : "Criar proposta"}
      </button>
    </form>
  );
}
