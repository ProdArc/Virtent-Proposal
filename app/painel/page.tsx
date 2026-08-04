import Image from "next/image";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listProposals } from "@/lib/proposals";
import { listFinancialClients, getBillingSummaryByClient } from "@/lib/financial";
import { LogoutButton } from "@/components/ui/LogoutButton";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Os números dos cards (propostas cadastradas, cobranças em aberto) mudam a
// cada acesso — sem cache, senão o painel fica desatualizado.
export const dynamic = "force-dynamic";

export default async function PainelPage() {
  const user = await getSessionUser();

  let proposalsCount = 0;
  let clientsCount = 0;
  let openTotal = 0;

  try {
    const proposals = await listProposals();
    proposalsCount = proposals.length;
  } catch {
    // Card mostra "—" se o Supabase não estiver configurado; não é um erro fatal do painel.
  }

  try {
    const [clients, summaries] = await Promise.all([listFinancialClients(), getBillingSummaryByClient()]);
    clientsCount = clients.length;
    openTotal = Object.values(summaries).reduce((sum, s) => sum + s.openTotal, 0);
  } catch {
    // idem
  }

  return (
    <main className="min-h-screen bg-[#F9FBF8] py-12 sm:py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-10">
          <div className="flex items-center gap-3">
            <Image
              src="/images/virtent-logo-icon.png"
              alt="Virtent"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#065F46] mb-1">
                Virtent
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#18181B]">Painel</h1>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0 pt-1">
            {user && (
              <p className="text-sm text-[#71717A]">
                Olá, <span className="font-semibold text-[#18181B]">{capitalize(user)}</span>
              </p>
            )}
            <LogoutButton />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Link
            href="/propostas"
            className="group rounded-2xl border border-[#E4E4E7] bg-white p-6 sm:p-8 hover:border-[#065F46]/40 hover:shadow-sm transition-all duration-150"
          >
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#065F46] mb-3">
              Comercial
            </p>
            <h2 className="text-lg font-bold text-[#18181B] mb-2">Propostas</h2>
            <p className="text-sm text-[#71717A] leading-relaxed mb-6">
              Crie e acompanhe propostas comerciais enviadas aos clientes.
            </p>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-extrabold text-[#18181B]">
                {proposalsCount || "—"}
                <span className="text-xs font-medium text-[#A1A1AA] ml-1.5">
                  proposta{proposalsCount === 1 ? "" : "s"}
                </span>
              </p>
              <span className="text-sm font-semibold text-[#065F46] group-hover:text-[#047857] transition-colors">
                Ver propostas →
              </span>
            </div>
          </Link>

          <Link
            href="/financeiro"
            className="group rounded-2xl border border-[#E4E4E7] bg-white p-6 sm:p-8 hover:border-[#065F46]/40 hover:shadow-sm transition-all duration-150"
          >
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#065F46] mb-3">
              Financeiro
            </p>
            <h2 className="text-lg font-bold text-[#18181B] mb-2">Controle financeiro</h2>
            <p className="text-sm text-[#71717A] leading-relaxed mb-6">
              Implantação, mensalidades, comprovantes, NFe e cobrança por e-mail.
            </p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-extrabold text-[#18181B]">
                  {clientsCount || "—"}
                  <span className="text-xs font-medium text-[#A1A1AA] ml-1.5">
                    cliente{clientsCount === 1 ? "" : "s"}
                  </span>
                </p>
                {openTotal > 0 && (
                  <p className="text-xs text-[#B45309] font-medium mt-0.5">
                    {currency.format(openTotal)} em aberto
                  </p>
                )}
              </div>
              <span className="text-sm font-semibold text-[#065F46] group-hover:text-[#047857] transition-colors">
                Ver financeiro →
              </span>
            </div>
          </Link>
        </div>

        <Link
          href="/financeiro/dashboard"
          className="group mt-5 flex items-center justify-between gap-4 rounded-2xl border border-[#E4E4E7] bg-white px-6 py-5 hover:border-[#065F46]/40 hover:shadow-sm transition-all duration-150"
        >
          <div>
            <h2 className="text-sm font-bold text-[#18181B] mb-0.5">Dashboard financeiro</h2>
            <p className="text-sm text-[#71717A]">
              Evolução mensal, atrasos e comissão, com filtros por período e cliente.
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-[#065F46] group-hover:text-[#047857] transition-colors">
            Abrir →
          </span>
        </Link>
      </div>
    </main>
  );
}
