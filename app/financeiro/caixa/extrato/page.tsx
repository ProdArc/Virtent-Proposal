import Link from "next/link";
import { listMovements, KIND_LABEL, type CashMovementRow, type MovementKind } from "@/lib/cash";
import { normalizeName } from "@/lib/payables";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { FinanceTabs } from "@/components/financeiro/FinanceTabs";
import { LedgerFilters } from "./LedgerFilters";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const stamp = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const KINDS: MovementKind[] = ["opening", "setup", "monthly", "payable"];

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
      <main className="min-h-screen flex items-center justify-center bg-surface px-6">
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
      </main>
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
    <main className="relative min-h-screen overflow-hidden bg-surface py-12 sm:py-16 px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,95,70,0.06),transparent_55%)]" />

      <div className="relative max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/financeiro/caixa"
            className="text-xs text-neutral-ink hover:text-ink transition-colors"
          >
            ← Caixa
          </Link>
          <LogoutButton />
        </div>

        <div className="mt-4 mb-5">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-brand mb-3">
            Virtent
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Extrato de caixa</h1>
          <p className="text-sm text-neutral-ink mt-1">
            Somente leitura. Toda linha nasce de uma baixa ou de um pagamento — para corrigir,
            ajuste na conta de origem.
          </p>
        </div>

        <div className="mb-5">
          <FinanceTabs active="caixa" />
        </div>

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
              className="text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
            >
              Exportar CSV
            </a>
          )}
        </div>

        {movements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-ink mb-1">Nenhuma movimentação ainda</p>
            <p className="text-sm text-neutral-ink">
              O extrato se preenche sozinho conforme você dá baixa em recebíveis e paga contas.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-ink mb-1">Nada neste filtro</p>
            <Link
              href="/financeiro/caixa/extrato"
              className="text-sm font-semibold text-brand hover:text-brand-hover transition-colors"
            >
              Limpar filtros
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
            {visible.map((m) => {
              const isIn = m.direction === "in";
              const href = sourceHref(m);
              const balance = runningById.get(m.id) ?? 0;
              const reversal = Boolean(m.reverses_id);

              const row = (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span
                    aria-hidden="true"
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      isIn ? "bg-paid-bg text-paid-ink" : "bg-overdue-bg text-overdue-ink"
                    }`}
                  >
                    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
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
                    <span className="block truncate text-sm font-medium text-ink">
                      {m.description}
                    </span>
                    <span className="block truncate text-[11.5px] text-secondary-ink">
                      {stamp(m.occurred_at)} · {KIND_LABEL[m.kind]}
                      {reversal && " · estorno"}
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    <span
                      className={`block text-sm font-bold tabular-nums ${
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
                </div>
              );

              return href ? (
                <Link
                  key={m.id}
                  href={href}
                  className="block border-b border-border last:border-b-0 hover:bg-surface transition-colors"
                >
                  {row}
                </Link>
              ) : (
                <div key={m.id} className="border-b border-border last:border-b-0">
                  {row}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
