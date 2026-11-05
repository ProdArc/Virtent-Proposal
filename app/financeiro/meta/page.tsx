import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import {
  calcBillingTotal,
  listAllBillings,
  listFinancialClients,
  type FinancialBillingRow,
  type FinancialClientRow,
} from "@/lib/financial";
import { formatFee } from "@/lib/billing-methods";
import { ConfigError, EmptyState, Panel, PageHeader } from "@/components/financeiro/ui";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { updateMetaBillingAction } from "./actions";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const intFmt = new Intl.NumberFormat("pt-BR");
const monthYearFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const dateFmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const cycleLabel = (iso: string) => capitalize(monthYearFmt.format(new Date(`${iso}T00:00:00`)));

export const dynamic = "force-dynamic";

export default async function RepasseMetaPage() {
  let clients: FinancialClientRow[] = [];
  let billings: FinancialBillingRow[] = [];
  let configError: string | null = null;

  try {
    [clients, billings] = await Promise.all([listFinancialClients(), listAllBillings()]);
  } catch (err) {
    configError = err instanceof Error ? err.message : "Erro ao carregar o repasse Meta.";
  }

  if (configError) return <ConfigError message={configError} />;

  const todayIso = new Date().toISOString().slice(0, 10);

  // Clientes com repasse Meta ligado — inclui cancelado com ciclo ainda em
  // aberto (cancelar não apaga o que já é devido, só para de gerar ciclo novo).
  const metaClients = clients
    .filter((c) => c.bill_meta)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const metaBillingsByClient = new Map<string, FinancialBillingRow[]>();
  for (const b of billings) {
    if (b.kind !== "meta") continue;
    metaBillingsByClient.set(b.client_id, [...(metaBillingsByClient.get(b.client_id) ?? []), b]);
  }

  const openMeta = billings.filter((b) => b.kind === "meta" && !b.paid);
  const pendingEntry = openMeta.filter((b) => b.due_date <= todayIso && Number(b.meta_dispatches) === 0);
  const openTotal = openMeta.reduce((s, b) => s + calcBillingTotal(b).total_value, 0);

  if (metaClients.length === 0) {
    return (
      <>
        <PageHeader title="Repasse Meta" subtitle="Clientes com cobrança de repasse Meta." />
        <EmptyState
          title="Nenhum cliente com repasse Meta"
          description="Ative 'Repasse Meta' nas formas de cobrança de um cliente pra ele aparecer aqui."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Repasse Meta"
        subtitle={`${metaClients.length} cliente${metaClients.length === 1 ? "" : "s"} com repasse Meta ligado`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-hairline bg-card p-4">
          <p className="text-[11px] text-secondary-ink">Ciclos em aberto</p>
          <p className="text-lg font-bold tabular-nums text-ink">{openMeta.length}</p>
        </div>
        <div className="rounded-2xl border border-hairline bg-card p-4">
          <p className="text-[11px] text-secondary-ink">Sem disparos lançados</p>
          <p className={`text-lg font-bold tabular-nums ${pendingEntry.length > 0 ? "text-pending-ink" : "text-ink"}`}>
            {pendingEntry.length}
          </p>
        </div>
        <div className="rounded-2xl border border-hairline bg-card p-4 col-span-2 sm:col-span-1">
          <p className="text-[11px] text-secondary-ink">Total em aberto</p>
          <p className="text-lg font-bold tabular-nums text-ink">{currency.format(openTotal)}</p>
        </div>
      </div>

      <div className="space-y-3">
        {metaClients.map((client) => {
          const all = (metaBillingsByClient.get(client.id) ?? []).sort((a, b) =>
            a.due_date.localeCompare(b.due_date)
          );
          const open = all.filter((b) => !b.paid);
          const paidCount = all.length - open.length;

          return (
            <Panel key={client.id} padded={false}>
              <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
                <div className="min-w-0">
                  <Link
                    href={`/financeiro/${client.id}`}
                    className="inline-flex items-center gap-1 text-[15px] font-bold text-ink hover:text-brand-ink transition-colors"
                  >
                    {client.name}
                    <CaretRight size={14} weight="bold" aria-hidden="true" className="text-subtle" />
                  </Link>
                  <p className="text-xs text-secondary-ink">
                    {formatFee(Number(client.meta_fee_per_dispatch))} por disparo
                    {client.canceled_at && " · cliente cancelado"}
                  </p>
                </div>
                {paidCount > 0 && (
                  <p className="shrink-0 text-xs text-secondary-ink">
                    {paidCount} ciclo{paidCount === 1 ? "" : "s"} pago{paidCount === 1 ? "" : "s"}
                  </p>
                )}
              </div>

              {open.length === 0 ? (
                <p className="px-5 py-4 text-sm text-secondary-ink">Em dia — nenhum ciclo em aberto.</p>
              ) : (
                <div className="divide-y divide-hairline">
                  {open.map((b) => {
                    const { meta_fee_value, pass_through_value, total_value } = calcBillingTotal(b);
                    const needsEntry = Number(b.meta_dispatches) === 0;
                    return (
                      <div key={b.id} className="px-5 py-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-ink">{cycleLabel(b.due_date)}</p>
                            <p className="text-xs text-subtle">Vencimento {dateFmt(b.due_date)}</p>
                          </div>
                          {needsEntry && (
                            <span className="rounded-full bg-pending-bg px-2.5 py-1 text-[11px] font-semibold text-pending-ink">
                              Falta lançar
                            </span>
                          )}
                        </div>

                        <form action={updateMetaBillingAction} className="flex flex-wrap items-end gap-2">
                          <input type="hidden" name="billingId" value={b.id} />
                          <div>
                            <label className="block text-[11px] font-semibold text-muted mb-1">
                              Contatos disparados
                            </label>
                            <input
                              name="metaDispatches"
                              type="text"
                              inputMode="numeric"
                              defaultValue={b.meta_dispatches ? intFmt.format(b.meta_dispatches) : ""}
                              placeholder="Ex: 100.000"
                              className="w-36 rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-muted mb-1">
                              Custo Meta no mês
                            </label>
                            <CurrencyInput name="metaCost" defaultValue={b.meta_cost} className="w-36" />
                          </div>
                          <SubmitButton
                            pendingLabel="Salvando..."
                            className="text-xs font-semibold px-4 py-1.5 rounded-full border border-border text-ink hover:bg-surface transition-colors min-h-10"
                          >
                            Salvar
                          </SubmitButton>

                          <div className="ml-auto text-right text-xs text-secondary-ink">
                            <p>
                              Custo Meta {currency.format(pass_through_value)} ·{" "}
                              {intFmt.format(b.meta_dispatches)} disparos × {formatFee(b.meta_fee_per_dispatch)} ={" "}
                              {currency.format(meta_fee_value)}
                            </p>
                            <p className="font-semibold text-ink tabular-nums">
                              Total a cobrar: {currency.format(total_value)}
                            </p>
                          </div>
                        </form>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          );
        })}
      </div>
    </>
  );
}
