import Link from "next/link";
import {
  getBillingSummaryByClient,
  listFinancialClients,
  type ClientBillingSummary,
  type FinancialClientRow,
} from "@/lib/financial";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { FilterSelect } from "@/components/ui/FilterSelect";

// Ferramenta interna de controle financeiro — mesma paleta e proteção (sessão
// via cookie, ver proxy.ts e lib/auth.ts) que /propostas.

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_OPTIONS = [
  { value: "", label: "Todos os clientes" },
  { value: "open", label: "Com cobrança em aberto" },
  { value: "overdue", label: "Com cobrança atrasada" },
  { value: "setup_pending", label: "Implantação pendente" },
  { value: "ok", label: "Em dia" },
];

function matchesStatus(
  status: string,
  client: FinancialClientRow,
  summary: ClientBillingSummary | undefined
): boolean {
  switch (status) {
    case "open":
      return Boolean(summary && summary.openCount > 0);
    case "overdue":
      return Boolean(summary && summary.overdueCount > 0);
    case "setup_pending":
      return !client.setup_paid;
    case "ok":
      return client.setup_paid && !(summary && summary.openCount > 0);
    default:
      return true;
  }
}

// A listagem precisa refletir status de pagamento atualizado a cada acesso.
export const dynamic = "force-dynamic";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = status ?? "";

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

  const totalOpen = Object.values(summaries).reduce((sum, s) => sum + s.openTotal, 0);
  const totalOverdueCount = Object.values(summaries).reduce((sum, s) => sum + s.overdueCount, 0);
  const filteredClients = clients.filter((c) => matchesStatus(activeStatus, c, summaries[c.id]));

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F9FBF8] py-12 sm:py-16 px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,95,70,0.06),transparent_55%)]" />

      <div className="relative max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/painel"
            className="text-xs text-[#71717A] hover:text-[#18181B] transition-colors"
          >
            ← Painel
          </Link>
          <LogoutButton />
        </div>
        <div className="flex items-start justify-between gap-4 mt-4 mb-6">
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold text-[#52525B] mb-1">Clientes</p>
            <p className="text-base font-bold text-[#18181B] tabular-nums">{clients.length}</p>
          </div>
          <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold text-[#52525B] mb-1">Em aberto</p>
            <p className="text-base font-bold text-[#18181B] tabular-nums">{currency.format(totalOpen)}</p>
          </div>
          <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold text-[#52525B] mb-1">Atrasadas</p>
            <p
              className={`text-base font-bold tabular-nums ${totalOverdueCount > 0 ? "text-[#B91C1C]" : "text-[#18181B]"}`}
            >
              {totalOverdueCount}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mb-4">
          <p className="text-sm text-[#71717A]">
            {filteredClients.length} de {clients.length} cliente{clients.length === 1 ? "" : "s"}
          </p>
          <FilterSelect
            name="status"
            defaultValue={activeStatus}
            options={STATUS_OPTIONS}
            basePath="/financeiro"
          />
        </div>

        {clients.length === 0 ? (
          <p className="text-sm text-[#71717A] leading-relaxed">
            Nenhum cliente cadastrado ainda. Clique em{" "}
            <span className="font-semibold text-[#18181B]">+ Novo cliente</span> para começar.
          </p>
        ) : filteredClients.length === 0 ? (
          <p className="text-sm text-[#71717A] leading-relaxed">
            Nenhum cliente encontrado para esse filtro.
          </p>
        ) : (
          <div className="rounded-2xl border border-[#E4E4E7] bg-white overflow-hidden shadow-sm">
            {filteredClients.map((c) => {
              const summary = summaries[c.id];
              const initial = c.name.trim().charAt(0).toUpperCase() || "?";
              return (
                <Link
                  key={c.id}
                  href={`/financeiro/${c.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#E4E4E7] last:border-b-0 hover:bg-[#F9FBF8] transition-colors duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#065F46] text-sm font-bold">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#18181B] truncate">{c.name}</p>
                      <p className="text-xs text-[#A1A1AA] truncate">
                        Mensalidade {currency.format(c.monthly_value)} · comissão {c.commission_pct}%
                      </p>
                    </div>
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
