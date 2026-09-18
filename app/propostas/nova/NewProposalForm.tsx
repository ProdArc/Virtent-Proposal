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
  const [billingModel, setBillingModel] = useState<"comissao" | "fixa">("comissao");

  if (state.success) {
    // Nunca usar window.location.origin sozinho aqui: se alguém abrir essa
    // ferramenta a partir de uma URL de deployment específico da Vercel (não
    // o domínio de produção), o link copiado sairia com aquele endereço
    // temporário — que exige login na Vercel pra qualquer visitante externo.
    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const siteUrl = configuredSiteUrl || (typeof window !== "undefined" ? window.location.origin : "");
    const proposalPath = `/p/${state.success.slug}`;
    const link = `${siteUrl}${proposalPath}`;

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
            {link || proposalPath}
          </code>
        </div>
        {!configuredSiteUrl && (
          <p className="text-xs text-[#B45309] bg-[#FFF7ED] border border-[#FDBA74]/40 rounded-lg px-3 py-2 mb-4">
            NEXT_PUBLIC_SITE_URL não está configurada — o link acima usa o endereço desta aba.
            Se você abriu essa ferramenta a partir de uma URL de deployment da Vercel (com um
            hash tipo <code>-1uqnbo8f9-</code> no meio), o link vai exigir login da Vercel pra
            quem receber. Configure a variável pra sempre gerar o domínio de produção certo.
          </p>
        )}
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
          <a
            href={link || proposalPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center text-sm font-medium px-4 py-2 rounded-lg border border-[#E4E4E7] text-[#18181B] hover:bg-[#F9FBF8] transition-colors"
          >
            Abrir proposta
          </a>
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

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-[#52525B] mb-1.5">
            Modelo de cobrança
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "comissao" as const, label: "Mensalidade + comissão sobre arrecadação" },
              { key: "fixa" as const, label: "Mensalidade fixa (sem comissão)" },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setBillingModel(opt.key)}
                aria-pressed={billingModel === opt.key}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  billingModel === opt.key
                    ? "border-[#065F46] bg-[#065F46] text-white"
                    : "border-[#E4E4E7] bg-white text-[#71717A] hover:text-[#18181B]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input type="hidden" name="billingModel" value={billingModel} />
        </div>
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
