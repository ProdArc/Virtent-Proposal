import Link from "next/link";
import {
  BellRinging,
  CaretDown,
  ChartLineUp,
  Plus,
  Rows,
  SquaresFour,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import {
  distinctSegments,
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
import { FilterSelect } from "@/components/ui/FilterSelect";
import { ClientCard } from "@/components/financeiro/ClientCard";
import { ClientMatrix } from "@/components/financeiro/ClientMatrix";
import { StatusChips } from "@/components/financeiro/StatusChips";
import { SearchInput } from "@/components/financeiro/SearchInput";
import { UrgencyGroupHeader } from "@/components/financeiro/UrgencyGroupHeader";
import {
  btnPrimary,
  btnSecondary,
  ConfigError,
  EmptyState,
  HeroCard,
  PageHeader,
  QuickAction,
} from "@/components/financeiro/ui";
import { BulkSelectionProvider } from "@/components/financeiro/BulkSelectionContext";
import { BulkActionBar } from "@/components/financeiro/BulkActionBar";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthLongFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
  searchParams: Promise<{ status?: string; q?: string; ref?: string; view?: string }>;
}) {
  const { status, q, ref, view: viewParam } = await searchParams;
  // "lista" é o padrão e não vai na URL; "matriz" = clientes x meses.
  const view: "lista" | "matriz" = viewParam === "matriz" ? "matriz" : "lista";
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

  if (configError) return <ConfigError message={configError} />;

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

  // Referências (meses de cobrança) disponíveis pro filtro — união de todas as
  // cobranças já geradas, mais recente primeiro.
  const refSet = new Set(billings.map((b) => b.due_date.slice(0, 7)));
  const availableRefs = [...refSet].sort((a, b) => b.localeCompare(a));
  const activeRef = ref && refSet.has(ref) ? ref : "";
  const REF_OPTIONS = [
    { value: "", label: "Todas as referências" },
    ...availableRefs.map((m) => ({
      value: m,
      label: capitalize(monthLongFmt.format(new Date(`${m}-01T00:00:00`))),
    })),
  ];

  // Totais e contagens dos chips vêm da base inteira, não do recorte visível —
  // senão o número do filtro mudaria conforme o próprio filtro.
  const totalOpen = enriched.reduce((s, e) => s + e.status.openTotal, 0);
  const totalOverdue = enriched.reduce((s, e) => s + e.status.overdueCount, 0);
  const totalUrgent = enriched.reduce((s, e) => s + e.status.urgentCount, 0);
  const activeClientsCount = clients.filter((c) => !c.canceled_at).length;

  const counts = Object.fromEntries(
    VALID_FILTERS.map((f) => [f, enriched.filter((e) => matchesFilter(e.status, f)).length])
  ) as Record<StatusFilter, number>;

  const needle = normalize(search);
  const visible = enriched.filter(
    (e) =>
      matchesFilter(e.status, activeFilter) &&
      (needle === "" || normalize(e.client.name).includes(needle)) &&
      (activeRef === "" || e.billings.some((b) => b.due_date.slice(0, 7) === activeRef))
  );

  // Ordena por urgência; dentro de cada faixa, alfabético.
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: visible
      .filter((e) => e.status.group === group)
      .sort((a, b) => a.client.name.localeCompare(b.client.name, "pt-BR")),
  })).filter((g) => g.items.length > 0);

  const segmentSuggestions = distinctSegments(clients);

  const hrefFor = (filter: StatusFilter) => {
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    if (search) params.set("q", search);
    if (activeRef) params.set("ref", activeRef);
    if (view === "matriz") params.set("view", "matriz");
    const query = params.toString();
    return query ? `/financeiro?${query}` : "/financeiro";
  };

  /** Link pra outra visão mantendo os filtros ativos. */
  const viewHref = (target: "lista" | "matriz") => {
    const params = new URLSearchParams();
    if (activeFilter) params.set("status", activeFilter);
    if (search) params.set("q", search);
    if (activeRef) params.set("ref", activeRef);
    if (target === "matriz") params.set("view", "matriz");
    const query = params.toString();
    return query ? `/financeiro?${query}` : "/financeiro";
  };

  // Colunas da matriz: os 6 meses mais recentes com cobrança, em ordem cronológica.
  const matrixMonths = availableRefs.slice(0, 6).reverse();
  const byName = (a: { client: FinancialClientRow }, b: { client: FinancialClientRow }) =>
    a.client.name.localeCompare(b.client.name, "pt-BR");

  const openClients = counts.upcoming + counts.overdue;

  return (
    <>
      <PageHeader
        title="A receber"
        subtitle={`${activeClientsCount} cliente${activeClientsCount === 1 ? "" : "s"} ativo${activeClientsCount === 1 ? "" : "s"}`}
        actions={
          // `hidden` no wrapper: no próprio link, `inline-flex` do btnPrimary
          // disputa o display e pode ganhar.
          <span className="hidden sm:block">
            <Link href="/financeiro/novo" className={btnPrimary}>
              <Plus size={18} weight="bold" aria-hidden="true" />
              Novo cliente
            </Link>
          </span>
        }
      />

      <HeroCard
        label="Em aberto"
        value={currency.format(totalOpen)}
        hint={
          <>
            {openClients} cliente{openClients === 1 ? "" : "s"} com cobrança em aberto
            {totalOverdue > 0 && (
              <>
                {" · "}
                <span className="font-semibold text-overdue-ink">
                  {totalOverdue} atrasada{totalOverdue === 1 ? "" : "s"}
                </span>
              </>
            )}
          </>
        }
      >
        <div className="flex items-start justify-between gap-2 sm:justify-start sm:gap-6">
          <QuickAction href="/financeiro/novo" label="Novo cliente" icon={Plus} />
          <QuickAction
            href={hrefFor("overdue")}
            label="Atrasadas"
            icon={WarningCircle}
            badge={totalOverdue}
            tone="danger"
          />
          <QuickAction
            href={hrefFor("urgent")}
            label="Urgentes"
            icon={BellRinging}
            badge={totalUrgent}
            tone="danger"
          />
          <QuickAction href="/financeiro/dashboard" label="Dashboard" icon={ChartLineUp} />
        </div>
      </HeroCard>

      {/* Filtros */}
      <div className="mb-5 mt-5 flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
          <SearchInput initialValue={search} />
          <FilterSelect
            name="ref"
            defaultValue={activeRef}
            options={REF_OPTIONS}
            basePath="/financeiro"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusChips
            active={activeFilter}
            counts={counts}
            search={search}
            reference={activeRef}
            view={view === "matriz" ? "matriz" : undefined}
          />
          <div
            role="group"
            aria-label="Modo de exibição"
            className="inline-flex shrink-0 rounded-full bg-card p-1 shadow-card"
          >
            {(
              [
                ["lista", "Lista", Rows],
                ["matriz", "Matriz", SquaresFour],
              ] as const
            ).map(([key, label, IconCmp]) => (
              <Link
                key={key}
                href={viewHref(key)}
                aria-current={view === key ? "true" : undefined}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors ${
                  view === key ? "bg-strong text-on-strong" : "text-muted hover:text-ink"
                }`}
              >
                <IconCmp size={16} weight="bold" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          title="Nenhum cliente cadastrado"
          description="Cadastre o primeiro cliente para começar a acompanhar as cobranças."
          action={
            <Link href="/financeiro/novo" className={btnPrimary}>
              <Plus size={18} weight="bold" aria-hidden="true" />
              Novo cliente
            </Link>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          description={
            search
              ? `Nada corresponde a "${search}" com esse filtro.`
              : "Nenhum cliente neste filtro — o que é uma boa notícia."
          }
          action={
            <Link href="/financeiro" className={btnSecondary}>
              Limpar filtros
            </Link>
          }
        />
      ) : view === "matriz" ? (
        <ClientMatrix
          rows={[...visible].sort(byName)}
          months={matrixMonths}
          today={today}
        />
      ) : (
        <BulkSelectionProvider>
          <BulkActionBar
            visibleIds={visible.map((e) => e.client.id)}
            segmentSuggestions={segmentSuggestions}
          />
          {grouped.map(({ group, items }) => (
            // Cada faixa recolhe: com muitos clientes dá pra esconder o que já
            // está resolvido ("Em dia" já começa fechado) e ficar só com o que pede ação.
            <details key={group} open={group !== "ok"} className="group/sec">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 focus:outline-none">
                <UrgencyGroupHeader group={group as UrgencyGroup} count={items.length} />
                <CaretDown
                  size={16}
                  weight="bold"
                  aria-hidden="true"
                  className="mb-3 shrink-0 self-end text-subtle transition-transform group-open/sec:rotate-180"
                />
              </summary>
              <div className="overflow-hidden rounded-3xl bg-card shadow-card">
                {items.map(({ client, billings: rows, status: st }) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    billings={rows}
                    status={st as ClientStatus}
                  />
                ))}
              </div>
            </details>
          ))}
        </BulkSelectionProvider>
      )}
    </>
  );
}
