import Link from "next/link";
import { NewProposalForm } from "./NewProposalForm";

export default function NovaPropostaPage() {
  return (
    <main className="min-h-screen bg-[#F9FBF8] py-12 sm:py-16 px-6">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/propostas"
          className="text-xs text-[#71717A] hover:text-[#18181B] transition-colors"
        >
          ← Propostas
        </Link>
        <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#065F46] mt-4 mb-3">
          Virtent
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#18181B] mb-1">
          Nova proposta
        </h1>
        <p className="text-sm text-[#71717A] mb-8">
          Preencha os campos que mudam por cliente. O resto do conteúdo é o modelo padrão.
        </p>

        <NewProposalForm />
      </div>
    </main>
  );
}
