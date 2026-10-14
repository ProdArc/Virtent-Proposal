import { distinctSegments, listFinancialClients } from "@/lib/financial";
import { PageHeader } from "@/components/financeiro/ui";
import { NewClientForm } from "./NewClientForm";

export const dynamic = "force-dynamic";

export default async function NovoClienteFinanceiroPage() {
  // Sugestão de segmentos já usados — não é obrigatório, só reduz variação
  // de grafia ("Franquia" vs "franquia") entre clientes. Se falhar, o campo
  // de segmento continua funcionando como texto livre normal.
  let segmentSuggestions: string[] = [];
  try {
    segmentSuggestions = distinctSegments(await listFinancialClients());
  } catch {
    segmentSuggestions = [];
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        back={{ href: "/financeiro", label: "Voltar para A receber" }}
        title="Novo cliente"
        subtitle="Cadastre os valores de implantação e mensalidade. A cobrança de cada mês é gerada automaticamente quando você abre a página do cliente."
      />

      <NewClientForm segmentSuggestions={segmentSuggestions} />
    </div>
  );
}
