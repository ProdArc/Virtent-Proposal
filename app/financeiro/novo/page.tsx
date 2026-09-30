import Link from "next/link";
import { listFinancialClients } from "@/lib/financial";
import { NewClientForm } from "./NewClientForm";

export const dynamic = "force-dynamic";

export default async function NovoClienteFinanceiroPage() {
  // Sugestão de segmentos já usados — não é obrigatório, só reduz variação
  // de grafia ("Franquia" vs "franquia") entre clientes. Se falhar, o campo
  // de segmento continua funcionando como texto livre normal.
  let segmentSuggestions: string[] = [];
  try {
    const clients = await listFinancialClients();
    segmentSuggestions = [...new Set(clients.map((c) => c.segment).filter((s): s is string => Boolean(s)))].sort(
      (a, b) => a.localeCompare(b, "pt-BR")
    );
  } catch {
    segmentSuggestions = [];
  }

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

        <NewClientForm segmentSuggestions={segmentSuggestions} />
      </div>
    </main>
  );
}
