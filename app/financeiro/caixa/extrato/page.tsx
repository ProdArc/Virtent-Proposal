import Link from "next/link";
import { listMovements, KIND_LABEL, type CashMovementRow, type MovementKind } from "@/lib/cash";
import { normalizeName } from "@/lib/payables";
import { btnSecondary, EmptyState, PageHeader } from "@/components/financeiro/ui";
import { LedgerFilters } from "./LedgerFilters";
import { ReverseManualButton } from "./ReverseManualButton";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const stamp = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const KINDS: MovementKind[] = ["opening", "setup", "monthly", "payable", "manual"];

/** Para onde o item do extrato leva de volta. */
function sourceHref(m: CashMovementRow): string | null {
  if (!m.source_id) return null;
  if (m.source_type === "payable") return `/financeiro/pagar/${m.source_id}`;
  if (m.source_type === "client_setup") return `/financeiro/${m.source_id}`;
  return null; // billing: o id é da cobrança, não do cliente — sem rota direta
}

export const dynamic = "force-dynamic";

export default async function ExtratoPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; kind?: string; q?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const type = sp.type === "in" || sp.type === "out" ? sp.type : "";
  const kind = KINDS.includes(sp.kind as MovementKind) ? (sp.kind as MovementKind) : "";
  const q = sp.q ?? "";
  const from = sp.from ?? "";
  const to = sp.to ?? "";

  let movements: CashMovementRow[] = [];
  let configError: string | null = null;

  try {
    movements = await listMovements();
  } catch (err) {
    configError = err instanceof Error ? err.message : "Erro ao carregar o extrato.";
  }

  if (configError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-lg text-center">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-pending-ink mb-3">
            Configuração pendente
          </p>
          <h1 className="text-xl font-bold text-ink mb-2">Caixa ainda não instalado no banco</h1>
          <p className="text-sm text-neutral-ink">
            Rode a migração <code className="font-mono">008_caixa.sql</code> no SQL Editor do
            Supabase.
          </p>
          <p className="mt-3 text-xs text-secondary-ink">{configError}</p>
        </div>
      </div>
    );
  }

  // Saldo corrente: calculado do mais ANTIGO para o mais novo sobre a base
  // completa, e só depois filtrado — senão o saldo ao lado de cada linha
  // mudaria conforme o filtro, o que não faz sentido para um extrato.
  const chronological = [...movements].sort((a, b) =>
    a.occurred_at.localeCompare(b.occurred_at)
  );
  const runningById = new Map<string, number>();
  let running = 0;
  for (const m of chronological) {
    running += m.direction === "in" ? Number(m.amount) : -Number(m.amount);
    runningById.set(m.id, Math.round(running * 100) / 100);
  }

  // Entradas manuais já estornadas não podem ser estornadas de novo.
  const reversedIds = new Set(movements.map((m) => m.reverses_id).filter(Boolean) as string[]);

  const needle = normalizeName(q);
  const visible = movements.filter((m) => {
    if (type && m.direction !== type) return false;
    if (kind && m.kind !== kind) return false;
    if (from && m.occurred_at.slice(0, 10) < from) return false;
    if (to && m.occurred_at.slice(0, 10) > to) return false;
    if (needle && !normalizeName(`${m.description} ${m.counterpart ?? ""}`).includes(needle))
      return false;
    return true;
  });

  const totalIn = visible
    .filter((m) => m.direction === "in")
    .reduce((s, m) => s + Number(m.amount), 0);
  const totalOut = visible
    .filter((m) => m.direction === "out")
    .reduce((s, m) => s + Number(m.amount), 0);

  const exportParams = new URLSearchParams();
  for (const [k, v] of Object.entries({ type, kind, q, from, to })) if (v) exportParams.set(k, v);

  return (
    <>
      <PageHeader
        back={{ href: "/financeiro/caixa", label: "Voltar para o Caixa" }}
        title="Extrato"
        subtitle="Somente leitura. Toda linha nasce de uma baixa ou de um pagamento — para corrigir, ajuste na conta de origem."
      />

        <LedgerFilters current={{ type, kind, q, from, to }} kinds={KINDS} kindLabels={KIND_LABEL} />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 px-1">
          <p className="text-xs text-secondary-ink">
            {visible.length} movimentaç{visible.length === 1 ? "ão" : "ões"} ·{" "}
            <strong className="text-paid-ink">+{currency.format(totalIn)}</strong> ·{" "}
            <strong className="text-overdue-ink">−{currency.format(totalOut)}</strong>
          </p>
          {visible.length > 0 && (
            <a
              href={`/financeiro/caixa/extrato/export?${exportParams.toString()}`}
              className="text-xs font-semibold text-brand-ink hover:text-brand-ink-hover transition-colors"
            >
              Exportar CSV
            </a>
          )}
        </div>

        {movements.length === 0 ? (
          <EmptyState
            title="Nenhuma movimentação ainda"
            description="O extrato se preenche sozinho conforme você dá baixa em recebíveis e paga contas."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="Nada neste filtro"
            action={
              <Link href="/financeiro/caixa/extrato" className={btnSecondary}>
                Limpar filtros
              </Link>
            }
          />
        ) : (
          <div className="rounded-3xl bg-card shadow-card overflow-hidden">
            {visible.map((m) => {
              const isIn = m.direction === "in";
              const href = sourceHref(m);
              const balance = runningById.get(m.id) ?? 0;
              const reversal = Boolean(m.reverses_id);
              const canReverse = m.kind === "manual" && !reversal && !reversedIds.has(m.id);

              const row = (
                <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <span
                    aria-hidden="true"
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                      isIn ? "bg-paid-bg text-paid-ink" : "bg-overdue-bg text-overdue-ink"
                    }`}
                  >
                    <svg viewBox="0 0 16 16" fill="none" className="h-5 w-5">
                      <path
                        d={isIn ? "M8 13V3M8 3L4 7M8 3l4 4" : "M8 3v10M8 13l-4-4M8 13l4-4"}
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink">
                      {m.description}
                    </span>
                    <span className="mt-0.5 block text-xs text-secondary-ink">
                      {stamp(m.occurred_at)} · {KIND_LABEL[m.kind]}
                      {reversal && " · estorno"}
                      {m.bank_transaction_id && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-paid-ink">
                          · ✓ conciliado
                        </span>
                      )}
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    <span
                      className={`block text-[15px] font-bold tabular-nums ${
                        isIn ? "text-paid-ink" : "text-overdue-ink"
                      }`}
                    >
                      {isIn ? "+" : "−"}
                      {currency.format(Number(m.amount))}
                    </span>
                    <span className="block text-[10.5px] tabular-nums text-secondary-ink">
                      saldo {currency.format(balance)}
                    </span>
                  </span>

                  {canReverse && <ReverseManualButton id={m.id} />}
                </div>
              );

              return href ? (
                <Link
                  key={m.id}
                  href={href}
                  className="block border-b border-hairline last:border-b-0 hover:bg-surface transition-colors"
                >
                  {row}
                </Link>
              ) : (
                <div key={m.id} className="border-b border-hairline last:border-b-0">
                  {row}
                </div>
              );
            })}
          </div>
        )}
    </>
  );
}
