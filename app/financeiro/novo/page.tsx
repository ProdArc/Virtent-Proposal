import Link from "next/link";
import { NewClientForm } from "./NewClientForm";

export default function NovoClienteFinanceiroPage() {
  return (
    <main className="min-h-screen bg-[#F9FBF8] py-12 sm:py-16 px-6">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/financeiro"
          className="text-xs text-[#71717A] hover:text-[#18181B] transition-colors"
        >
          ← Financeiro
        </Link>
        <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#065F46] mt-4 mb-3">
          Virtent
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#18181B] mb-1">
          Novo cliente
        </h1>
        <p className="text-sm text-[#71717A] mb-8">
          Cadastre os valores de implantação e mensalidade. A cobrança de cada mês é gerada
          automaticamente quando você abre a página do cliente.
        </p>

        <NewClientForm />
      </div>
    </main>
  );
}
