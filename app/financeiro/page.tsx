import Link from "next/link";
import {
  calcBillingTotal,
  listAllBillings,
  listFinancialClients,
  type FinancialBillingRow,
  type FinancialClientRow,
} from "@/lib/financial";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { FilterSelect } from "@/components/ui/FilterSelect";

// Ferramenta interna de controle financeiro — mesma paleta e proteção (sessão
// via cookie, ver proxy.ts e lib/auth.ts) que /propostas.

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthLongFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const MONTH_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const STATUS_OPTIONS = [
  { value: "", label: "Todos os clientes" },
  { value: "open", label: "Com cobrança em aberto" },
  { value: "overdue", label: "Com cobrança atrasada" },
  { value: "setup_pending", label: "Implantação pendente" },
  { value: "ok", label: "Em dia" },
];

interface ClientSummary {
  openCount: number;
  overdueCount: number;
  openTotal: number;
}

type BillingState = "paid" | "overdue" | "pending" | "future";

const STATE_STYLE: Record<BillingState, string> = {
  paid: "bg-[#ECFDF5] text-[#065F46] border-[#A7E8CC]",
  overdue: "bg-[#FEF2F2] text-[#B91C1C] border-[#F5B5B5]",
  pending: "bg-[#FFF7ED] text-[#B45309] border-[#F6CE9B]",
  future: "bg-[#F4F4F5] text-[#71717A] border-[#E4E4E7]",
};

const STATE_LABEL: Record<BillingState, string> = {
  paid: "Paga",
  overdue: "Atrasada",
  pending: "Pendente",
  future: "A vencer",
};

// Cor sozinha não basta pra distinguir os estados (daltonismo, impressão em
// P&B): cada chip leva também um símbolo.
const STATE_GLYPH: Record<BillingState, string> = {
  paid: "✓",
  overdue: "!",
  pending: "●",
  future: "○",
};

/** Cor sólida da legenda — os tons de fundo dos chips são claros demais num quadradinho. */
const STATE_DOT: Record<BillingState, string> = {
  paid: "#065F46",
  overdue: "#B91C1C",
  pending: "#B45309",
  future: "#A1A1AA",
};

function billingState(b: FinancialBillingRow, todayIso: string): BillingState {
  if (b.paid) return "paid";
  if (b.due_date < todayIso) return "overdue";
  if (b.due_date > todayIso) return "future";
  return "pending";
}

/** "2026-09-10" -> "set/26" */
function shortMonth(iso: string): string {
  const [year, month] = iso.split("-").map(Number);
  return `${MONTH_ABBR[month - 1]}/${String(year).slice(2)}`;
}

function longMonth(iso: string): string {
  const s = monthLongFmt.format(new Date(`${iso}T00:00:00`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function matchesStatus(
  status: string,
  client: FinancialClientRow,
  summary: ClientSummary
): boolean {
  switch (status) {
    case "open":
      return summary.openCount > 0;
    case "overdue":
      return summary.overdueCount > 0;
    case "setup_pending":
      return !client.setup_paid;
    case "ok":
      return client.setup_paid && summary.openCount === 0;
    default:
      return true;
  }
}

/** Envelope: marca que a cobrança daquele ciclo já foi enviada por e-mail. */
function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 4.5l6 4 6-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
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
  let billings: FinancialBillingRow[] = [];
  let configError: string | null = null;

  try {
    [clients, billings] = await Promise.all([listFinancialClients(), listAllBillings()]);
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

  const todayIso = new Date().toISOString().slice(0, 10);

  // Cobranças por cliente, da referência mais recente para a mais antiga.
  const billingsByClient = new Map<string, FinancialBillingRow[]>();
  for (const b of billings) {
    billingsByClient.set(b.client_id, [...(billingsByClient.get(b.client_id) ?? []), b]);
  }
  for (const rows of billingsByClient.values()) {
    rows.sort((a, b) => b.due_date.localeCompare(a.due_date));
  }

  const summaries = new Map<string, ClientSummary>();
  for (const c of clients) {
    const rows = billingsByClient.get(c.id) ?? [];
    const summary: ClientSummary = { openCount: 0, overdueCount: 0, openTotal: 0 };
    for (const b of rows) {
      if (b.paid) continue;
      summary.openCount += 1;
      summary.openTotal += calcBillingTotal(b).total_value;
      if (b.due_date < todayIso) summary.overdueCount += 1;
    }
    summaries.set(c.id, summary);
  }

  const totalOpen = [...summaries.values()].reduce((sum, s) => sum + s.openTotal, 0);
  const totalOverdueCount = [...summaries.values()].reduce((sum, s) => sum + s.overdueCount, 0);
  const filteredClients = clients.filter((c) =>
    matchesStatus(activeStatus, c, summaries.get(c.id)!)
  );

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
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/financeiro/dashboard"
              className="inline-flex items-center justify-center text-sm font-medium px-4 py-2 rounded-lg border border-[#E4E4E7] bg-white text-[#18181B] hover:bg-[#F9FBF8] transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/financeiro/novo"
              className="inline-flex items-center justify-center text-sm font-semibold px-4 py-2 rounded-lg bg-[#065F46] text-white hover:bg-[#047857] transition-colors"
            >
              + Novo cliente
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold text-[#52525B] mb-1">Clientes</p>
            <p className="text-base font-bold text-[#18181B] tabular-nums">{clients.length}</p>
          </div>
          <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold text-[#52525B] mb-1">Em aberto</p>
            <p className="text-base font-bold text-[#18181B] tabular-nums">
              {currency.format(totalOpen)}
            </p>
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

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm text-[#71717A]">
            {filteredClients.length} de {clients.length} cliente{clients.length === 1 ? "" : "s"}
          </p>
          <div className="w-full sm:w-auto sm:min-w-64">
            <FilterSelect
              name="status"
              defaultValue={activeStatus}
              options={STATUS_OPTIONS}
              basePath="/financeiro"
            />
          </div>
        </div>

        {/* Legenda: as cores dos meses sozinhas não dizem o que significam. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 px-1">
          {(["paid", "pending", "overdue", "future"] as BillingState[]).map((state) => (
            <span key={state} className="inline-flex items-center gap-1.5">
              <span
                className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm text-[9px] font-bold leading-none text-white"
                style={{ backgroundColor: STATE_DOT[state] }}
                aria-hidden="true"
              >
                {STATE_GLYPH[state]}
              </span>
              <span className="text-[11px] text-[#71717A]">{STATE_LABEL[state]}</span>
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <MailIcon className="h-3 w-3 text-[#065F46]" />
            <span className="text-[11px] text-[#71717A]">Cobrança enviada por e-mail</span>
          </span>
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
              const summary = summaries.get(c.id)!;
              const clientBillings = billingsByClient.get(c.id) ?? [];
              const initial = c.name.trim().charAt(0).toUpperCase() || "?";
              return (
                <Link
                  key={c.id}
                  href={`/financeiro/${c.id}`}
                  className="block px-5 py-4 border-b border-[#E4E4E7] last:border-b-0 hover:bg-[#F9FBF8] transition-colors duration-150"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#065F46] text-sm font-bold">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#18181B] truncate">{c.name}</p>
                        <p className="text-xs text-[#A1A1AA] truncate">
                          Mensalidade {currency.format(c.monthly_value)} · comissão{" "}
                          {c.commission_pct}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                          c.setup_paid
                            ? "bg-[#ECFDF5] text-[#065F46]"
                            : "bg-[#FFF7ED] text-[#B45309]"
                        }`}
                        title={
                          c.setup_email_sent_at
                            ? `Implantação ${c.setup_paid ? "paga" : "pendente"} · cobrança enviada por e-mail em ${new Date(c.setup_email_sent_at).toLocaleDateString("pt-BR")}`
                            : `Implantação ${c.setup_paid ? "paga" : "pendente"} · cobrança ainda não enviada por e-mail`
                        }
                      >
                        Implantação {c.setup_paid ? "paga" : "pendente"}
                        {c.setup_email_sent_at ? (
                          <MailIcon className="h-3 w-3" />
                        ) : (
                          <MailIcon className="h-3 w-3 opacity-30" />
                        )}
                      </span>
                      {summary.openCount > 0 && (
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                            summary.overdueCount > 0
                              ? "bg-[#FEF2F2] text-[#B91C1C]"
                              : "bg-[#FFF7ED] text-[#B45309]"
                          }`}
                        >
                          {currency.format(summary.openTotal)} em aberto
                          {summary.overdueCount > 0
                            ? ` · ${summary.overdueCount} atrasada${summary.overdueCount === 1 ? "" : "s"}`
                            : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Referências da mensalidade, da mais recente para a mais antiga. */}
                  {clientBillings.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 sm:pl-12">
                      {clientBillings.map((b) => {
                        const state = billingState(b, todayIso);
                        const sentAt = b.email_sent_at
                          ? new Date(b.email_sent_at).toLocaleDateString("pt-BR")
                          : null;
                        return (
                          <span
                            key={b.id}
                            title={`${longMonth(b.due_date)} · ${STATE_LABEL[state]} · ${
                              sentAt ? `e-mail enviado em ${sentAt}` : "e-mail não enviado"
                            }`}
                            className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold tabular-nums ${STATE_STYLE[state]}`}
                          >
                            <span aria-hidden="true" className="text-[9px] leading-none">
                              {STATE_GLYPH[state]}
                            </span>
                            {shortMonth(b.due_date)}
                            <MailIcon className={`h-2.5 w-2.5 ${sentAt ? "" : "opacity-25"}`} />
                          </span>
                        );
                      })}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
