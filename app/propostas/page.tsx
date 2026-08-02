import Link from "next/link";
import { listProposals, type ProposalListItem } from "@/lib/proposals";

// Ferramenta interna de consulta — sem os efeitos/animações da proposta em si,
// só a paleta base do site pra consistência visual mínima. Acesso protegido
// por Basic Auth no proxy.ts (ADMIN_PASSWORD), não nesta página.

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  visualizada: "Visualizada",
};

const STATUS_STYLE: Record<string, string> = {
  rascunho: "bg-[#F4F4F5] text-[#71717A]",
  enviada: "bg-[#ECFDF5] text-[#065F46]",
  visualizada: "bg-[#FFF7ED] text-[#B45309]",
};

// A lista precisa refletir status atualizado (enviada → visualizada) a cada acesso.
export const dynamic = "force-dynamic";

export default async function PropostasPage() {
  let proposals: ProposalListItem[] = [];
  let configError: string | null = null;

  try {
    proposals = await listProposals();
  } catch (err) {
    configError = err instanceof Error ? err.message : "Erro desconhecido ao conectar ao Supabase.";
  }

  if (configError) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F9FBF8] px-6">
        <div className="max-w-md text-center">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#B45309] mb-3">
            Configuração pendente
          </p>
          <h1 className="text-xl font-bold text-[#18181B] mb-2">
            Não foi possível conectar ao banco
          </h1>
          <p className="text-sm text-[#71717A] leading-relaxed">{configError}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F9FBF8] py-12 sm:py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#065F46] mb-3">
              Virtent
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#18181B]">
              Propostas comerciais
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/financeiro"
              className="inline-flex items-center justify-center text-sm font-medium px-4 py-2 rounded-lg border border-[#E4E4E7] text-[#18181B] hover:bg-[#F9FBF8] transition-colors"
            >
              Financeiro
            </Link>
            <Link
              href="/propostas/nova"
              className="inline-flex items-center justify-center text-sm font-semibold px-4 py-2 rounded-lg bg-[#065F46] text-white hover:bg-[#047857] transition-colors"
            >
              + Nova proposta
            </Link>
          </div>
        </div>
        <p className="text-sm text-[#71717A] mb-8">
          {proposals.length} proposta{proposals.length === 1 ? "" : "s"} cadastrada
          {proposals.length === 1 ? "" : "s"}.
        </p>

        {proposals.length === 0 ? (
          <p className="text-sm text-[#71717A] leading-relaxed">
            Nenhuma proposta ainda. Rode{" "}
            <code className="font-mono text-xs bg-[#F4F4F5] px-1.5 py-0.5 rounded">
              npm run seed
            </code>{" "}
            para criar a proposta de exemplo, ou insira uma linha na tabela{" "}
            <code className="font-mono text-xs bg-[#F4F4F5] px-1.5 py-0.5 rounded">
              proposals
            </code>{" "}
            no Supabase.
          </p>
        ) : (
          <div className="rounded-2xl border border-[#E4E4E7] bg-white overflow-hidden">
            {proposals.map((p) => (
              <Link
                key={p.id}
                href={`/p/${p.slug}`}
                className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#E4E4E7] last:border-b-0 hover:bg-[#F9FBF8] transition-colors duration-150"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#18181B] truncate">
                    {p.client_name}
                  </p>
                  <p className="text-xs text-[#A1A1AA] font-[family-name:var(--font-geist-mono)] truncate">
                    /p/{p.slug}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs text-[#A1A1AA]">
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      STATUS_STYLE[p.status] ?? "bg-[#F4F4F5] text-[#71717A]"
                    }`}
                  >
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
