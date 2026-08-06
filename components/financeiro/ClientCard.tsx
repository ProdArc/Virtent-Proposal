import Link from "next/link";
import type { FinancialBillingRow, FinancialClientRow } from "@/lib/financial";
import type { ClientStatus, Tone } from "@/lib/financeiro-status";
import { StatusBadge, MailIcon } from "./StatusBadge";
import { MonthTimeline, MonthTimelineLegend } from "./MonthTimeline";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const ACTION_CLASS: Record<Tone, string> = {
  paid: "text-paid-ink",
  pending: "text-pending-ink",
  overdue: "text-overdue-ink",
  onboarding: "text-onboarding-ink",
  neutral: "text-secondary-ink",
};

/** Faixa vertical na borda esquerda — dá a urgência sem gastar largura. */
const RAIL_CLASS: Record<Tone, string> = {
  paid: "bg-paid-ink",
  pending: "bg-pending-ink",
  overdue: "bg-overdue-ink",
  onboarding: "bg-onboarding-ink",
  neutral: "bg-transparent",
};

function Chevron() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-subtle transition-transform duration-200 group-open:rotate-90"
    >
      <path
        d="M7 4l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Card do cliente. Compacto por padrão (~64px): inicial, nome, valor em aberto
 * e o badge do que é mais urgente. Expande com <details> nativo — sem
 * JavaScript, o que mantém a lista inteira renderizada no servidor mesmo com
 * dezenas de clientes.
 */
export function ClientCard({
  client,
  billings,
  status,
}: {
  client: FinancialClientRow;
  billings: FinancialBillingRow[];
  status: ClientStatus;
}) {
  const initial = client.name.trim().charAt(0).toUpperCase() || "?";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <details className="group border-b border-border last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40">
        <span
          aria-hidden="true"
          className={`h-9 w-1 shrink-0 rounded-full ${RAIL_CLASS[status.action.tone]}`}
        />
        <Chevron />

        <span className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand text-xs font-bold">
          {initial}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{client.name}</span>
          <span className={`block truncate text-[11.5px] font-medium ${ACTION_CLASS[status.action.tone]}`}>
            {status.action.label}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="block text-sm font-bold tabular-nums text-ink">
            {status.openTotal > 0 ? currency.format(status.openTotal) : "—"}
          </span>
          {/* Contagem some no mobile pra devolver largura ao nome do cliente. */}
          <span className="hidden sm:block text-[10.5px] text-secondary-ink">
            {status.openItems.length > 0
              ? `${status.openItems.length} em aberto`
              : "nada em aberto"}
          </span>
        </span>

        {/* O responsivo fica no wrapper, não no badge: `hidden` e `inline-flex`
            são ambos utilitários de display e quem vence depende da ordem no
            CSS gerado, não da ordem no atributo — no badge, o `hidden` perdia. */}
        <span className="hidden md:inline-flex shrink-0">
          <StatusBadge
            tone={status.setupTone}
            size="sm"
            title={
              client.setup_email_sent_at
                ? `${status.setupLabel} · cobrança enviada em ${new Date(client.setup_email_sent_at).toLocaleDateString("pt-BR")}`
                : `${status.setupLabel} · cobrança ainda não enviada`
            }
            icon={client.setup_email_sent_at ? <MailIcon className="h-2.5 w-2.5" /> : undefined}
          >
            {client.setup_paid ? "Implantação ok" : "Implantação"}
          </StatusBadge>
        </span>
      </summary>

      {/* Detalhes — só no modo expandido, pra manter o card compacto. */}
      <div className="border-t border-border bg-surface px-4 py-4 sm:pl-[4.5rem]">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 mb-4">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink">
              Mensalidade
            </p>
            <p className="text-sm font-semibold tabular-nums text-ink">
              {currency.format(client.monthly_value)}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink">
              Comissão
            </p>
            <p className="text-sm font-semibold tabular-nums text-ink">{client.commission_pct}%</p>
          </div>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink">
              Já recebido
            </p>
            <p className="text-sm font-semibold tabular-nums text-ink">
              {currency.format(status.receivedTotal)}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink">
              Implantação
            </p>
            <p className="text-sm font-semibold tabular-nums text-ink">
              {currency.format(client.setup_value)}
            </p>
          </div>
        </div>

        {status.blockers.length > 0 && (
          <div className="mb-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink mb-1.5">
              Pendências administrativas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {status.blockers.map((b) => (
                <StatusBadge key={b} tone="neutral" size="sm">
                  Falta {b}
                </StatusBadge>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink mb-1.5">
            Histórico por referência{" "}
            <span className="font-normal normal-case tracking-normal">
              (mais recente primeiro)
            </span>
          </p>
          <MonthTimeline billings={billings} today={today} />
          {/* Legenda junto da timeline: fora daqui ela ficaria explicando algo
              que só aparece com o card expandido. */}
          <div className="mt-2.5">
            <MonthTimelineLegend />
          </div>
        </div>

        <Link
          href={`/financeiro/${client.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand transition-colors hover:text-brand-hover"
        >
          Abrir cliente →
        </Link>
      </div>
    </details>
  );
}
