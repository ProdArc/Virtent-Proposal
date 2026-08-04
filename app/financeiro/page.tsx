import Link from "next/link";
import {
  getBillingSummaryByClient,
  listFinancialClients,
  type ClientBillingSummary,
  type FinancialClientRow,
} from "@/lib/financial";
import { LogoutButton } from "@/components/ui/LogoutButton";

// Ferramenta interna de controle financeiro — mesma paleta e proteção (sessão
// via cookie, ver proxy.ts e lib/auth.ts) que /propostas.

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// A listagem precisa refletir status de pagamento atualizado a cada acesso.
export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  let clients: FinancialClientRow[] = [];
  let summaries: Record<string, ClientBillingSummary> = {};
  let configError: string | null = null;

  try {
    [clients, summaries] = await Promise.all([listFinancialClients(), getBillingSummaryByClient()]);
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
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/painel"
            className="text-xs text-[#71717A] hover:text-[#18181B] transition-colors"
          >
            ← Painel
          </Link>
          <LogoutButton />
        </div>
        <div className="flex items-start justify-between gap-4 mt-4 mb-1">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#065F46] mb-3">
              Virtent
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#18181B]">
              Controle financeiro
            </h1>
          </div>
          <Link
            href="/financeiro/novo"
            className="shrink-0 inline-flex items-center justify-center text-sm font-semibold px-4 py-2 rounded-lg bg-[#065F46] text-white hover:bg-[#047857] transition-colors"
          >
            + Novo cliente
          </Link>
        </div>
        <p className="text-sm text-[#71717A] mb-8">
          {clients.length} cliente{clients.length === 1 ? "" : "s"} cadastrado
          {clients.length === 1 ? "" : "s"}.
        </p>

        {clients.length === 0 ? (
          <p className="text-sm text-[#71717A] leading-relaxed">
            Nenhum cliente cadastrado ainda. Clique em{" "}
            <span className="font-semibold text-[#18181B]">+ Novo cliente</span> para começar.
          </p>
        ) : (
          <div className="rounded-2xl border border-[#E4E4E7] bg-white overflow-hidden">
            {clients.map((c) => {
              const summary = summaries[c.id];
              return (
                <Link
                  key={c.id}
                  href={`/financeiro/${c.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#E4E4E7] last:border-b-0 hover:bg-[#F9FBF8] transition-colors duration-150"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#18181B] truncate">{c.name}</p>
                    <p className="text-xs text-[#A1A1AA] truncate">
                      Mensalidade {currency.format(c.monthly_value)} · comissão {c.commission_pct}%
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        c.setup_paid ? "bg-[#ECFDF5] text-[#065F46]" : "bg-[#FFF7ED] text-[#B45309]"
                      }`}
                    >
                      {c.setup_paid ? "Implantação paga" : "Implantação pendente"}
                    </span>
                    {summary && summary.openCount > 0 && (
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                          summary.overdueCount > 0
                            ? "bg-[#FEF2F2] text-[#B91C1C]"
                            : "bg-[#FFF7ED] text-[#B45309]"
                        }`}
                      >
                        {currency.format(summary.openTotal)} em aberto
                        {summary.overdueCount > 0 ? ` · ${summary.overdueCount} atrasada${summary.overdueCount === 1 ? "" : "s"}` : ""}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
