import Link from "next/link";
import {
  listAllBillings,
  listFinancialClients,
  type FinancialBillingRow,
  type FinancialClientRow,
} from "@/lib/financial";
import {
  clientStatus,
  matchesFilter,
  todayIso,
  GROUP_ORDER,
  type ClientStatus,
  type StatusFilter,
  type UrgencyGroup,
} from "@/lib/financeiro-status";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { ClientCard } from "@/components/financeiro/ClientCard";
import { SummaryCard } from "@/components/financeiro/SummaryCard";
import { StatusChips } from "@/components/financeiro/StatusChips";
import { SearchInput } from "@/components/financeiro/SearchInput";
import { UrgencyGroupHeader } from "@/components/financeiro/UrgencyGroupHeader";
import { FinanceTabs } from "@/components/financeiro/FinanceTabs";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const VALID_FILTERS: StatusFilter[] = ["", "urgent", "overdue", "upcoming", "ok"];

/** Sem acento e sem caixa — buscar "camaragibe" tem que achar "Camaragibe". */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

// A listagem precisa refletir status de pagamento atualizado a cada acesso.
export const dynamic = "force-dynamic";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const activeFilter: StatusFilter = VALID_FILTERS.includes(status as StatusFilter)
    ? (status as StatusFilter)
    : "";
  const search = q ?? "";

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
      <main className="min-h-screen flex items-center justify-center bg-surface px-6">
        <div className="max-w-md text-center">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-pending-ink mb-3">
            Configuração pendente
          </p>
          <h1 className="text-xl font-bold text-ink mb-2">Não foi possível conectar ao banco</h1>
          <p className="text-sm text-neutral-ink leading-relaxed">{configError}</p>
        </div>
      </main>
    );
  }

  const today = todayIso();

  const billingsByClient = new Map<string, FinancialBillingRow[]>();
  for (const b of billings) {
    billingsByClient.set(b.client_id, [...(billingsByClient.get(b.client_id) ?? []), b]);
  }

  const enriched = clients.map((client) => ({
    client,
    billings: billingsByClient.get(client.id) ?? [],
    status: clientStatus(client, billingsByClient.get(client.id) ?? [], today),
  }));

  // Totais e contagens dos chips vêm da base inteira, não do recorte visível —
  // senão o número do filtro mudaria conforme o próprio filtro.
  const totalOpen = enriched.reduce((s, e) => s + e.status.openTotal, 0);
  const totalOverdue = enriched.reduce((s, e) => s + e.status.overdueCount, 0);
  const totalUrgent = enriched.reduce((s, e) => s + e.status.urgentCount, 0);

  const counts = Object.fromEntries(
    VALID_FILTERS.map((f) => [f, enriched.filter((e) => matchesFilter(e.status, f)).length])
  ) as Record<StatusFilter, number>;

  const needle = normalize(search);
  const visible = enriched.filter(
    (e) =>
      matchesFilter(e.status, activeFilter) &&
      (needle === "" || normalize(e.client.name).includes(needle))
  );

  // Ordena por urgência; dentro de cada faixa, alfabético.
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: visible
      .filter((e) => e.status.group === group)
      .sort((a, b) => a.client.name.localeCompare(b.client.name, "pt-BR")),
  })).filter((g) => g.items.length > 0);

  const hrefFor = (filter: StatusFilter) => {
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    if (search) params.set("q", search);
    const query = params.toString();
    return query ? `/financeiro?${query}` : "/financeiro";
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface py-12 sm:py-16 px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,95,70,0.06),transparent_55%)]" />

      <div className="relative max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <Link href="/painel" className="text-xs text-neutral-ink hover:text-ink transition-colors">
            ← Painel
          </Link>
          <LogoutButton />
        </div>

        <div className="flex items-start justify-between gap-4 mt-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-brand mb-3">
              Virtent
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">Controle financeiro</h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/financeiro/dashboard"
              className="inline-flex items-center justify-center text-sm font-medium px-4 py-2 rounded-lg border border-border bg-white text-ink hover:bg-surface transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/financeiro/novo"
              className="inline-flex items-center justify-center text-sm font-semibold px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand-hover transition-colors"
            >
              + Novo cliente
            </Link>
          </div>
        </div>

        <div className="mb-5">
          <FinanceTabs active="receber" />
        </div>

        {/* Resumo — cada card filtra a lista abaixo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <SummaryCard
            label="Clientes"
            value={String(clients.length)}
            href={hrefFor("")}
            active={activeFilter === ""}
          />
          <SummaryCard
            label="Em aberto"
            value={currency.format(totalOpen)}
            hint={`${counts.upcoming + counts.overdue} cliente${counts.upcoming + counts.overdue === 1 ? "" : "s"}`}
            href={hrefFor("upcoming")}
            active={activeFilter === "upcoming"}
          />
          <SummaryCard
            label="Atrasadas"
            value={String(totalOverdue)}
            tone={totalOverdue > 0 ? "overdue" : "neutral"}
            hint="cobranças vencidas"
            href={hrefFor("overdue")}
            active={activeFilter === "overdue"}
          />
          <SummaryCard
            label="Ação urgente"
            value={String(totalUrgent)}
            tone={totalUrgent > 0 ? "overdue" : "paid"}
            hint="vencidas ou em ≤7 dias"
            href={hrefFor("urgent")}
            active={activeFilter === "urgent"}
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
          <StatusChips active={activeFilter} counts={counts} search={search} />
          <div className="w-full sm:w-64 shrink-0">
            <SearchInput initialValue={search} />
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-ink mb-1">Nenhum cliente cadastrado</p>
            <p className="text-sm text-neutral-ink mb-5">
              Cadastre o primeiro cliente para começar a acompanhar as cobranças.
            </p>
            <Link
              href="/financeiro/novo"
              className="inline-flex items-center justify-center text-sm font-semibold px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand-hover transition-colors"
            >
              + Novo cliente
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-ink mb-1">Nenhum cliente encontrado</p>
            <p className="text-sm text-neutral-ink mb-5">
              {search
                ? `Nada corresponde a "${search}" com esse filtro.`
                : "Nenhum cliente neste filtro — o que é uma boa notícia."}
            </p>
            <Link
              href="/financeiro"
              className="text-sm font-semibold text-brand hover:text-brand-hover transition-colors"
            >
              Limpar filtros
            </Link>
          </div>
        ) : (
          <>
            {grouped.map(({ group, items }) => (
              <section key={group}>
                <UrgencyGroupHeader group={group as UrgencyGroup} count={items.length} />
                <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
                  {items.map(({ client, billings: rows, status: st }) => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      billings={rows}
                      status={st as ClientStatus}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
