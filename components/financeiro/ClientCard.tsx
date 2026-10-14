import Link from "next/link";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import type { FinancialBillingRow, FinancialClientRow } from "@/lib/financial";
import type { ClientStatus, Tone } from "@/lib/financeiro-status";
import { StatusBadge, MailIcon } from "./StatusBadge";
import { MonthTimeline, MonthTimelineLegend } from "./MonthTimeline";
import { ClientCheckbox } from "./ClientCheckbox";
import { billingMethodTags, type BillingMethodTag } from "@/lib/billing-methods";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const METHOD_TAG_CLASS: Record<BillingMethodTag["key"], string> = {
  fixed: "bg-paid-bg text-paid-ink",
  commission: "bg-paid-bg text-paid-ink",
  meta: "bg-[#F5F3FF] text-[#6D28D9]",
};

const ACTION_CLASS: Record<Tone, string> = {
  paid: "text-paid-ink",
  pending: "text-pending-ink",
  overdue: "text-overdue-ink",
  onboarding: "text-onboarding-ink",
  neutral: "text-secondary-ink",
};

/** Avatar redondo: a cor da inicial já diz a urgência, sem precisar ler. */
const AVATAR_CLASS: Record<Tone, string> = {
  paid: "bg-paid-bg text-paid-ink",
  pending: "bg-pending-bg text-pending-ink",
  overdue: "bg-overdue-bg text-overdue-ink",
  onboarding: "bg-onboarding-bg text-onboarding-ink",
  neutral: "bg-neutral-bg text-neutral-ink",
};

/**
 * Card do cliente, no formato de linha de extrato: avatar, nome, situação e
 * valor em aberto. Expande com <details> nativo — sem JavaScript, o que mantém
 * a lista inteira renderizada no servidor mesmo com dezenas de clientes.
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
  const methodTags = billingMethodTags(client);

  return (
    <details className="group border-b border-hairline last:border-b-0">
      <summary className="flex min-h-[3.75rem] cursor-pointer list-none items-start gap-3 px-4 py-3 transition-colors sm:items-center hover:bg-[#F8FAF7] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 sm:px-5">
        <ClientCheckbox id={client.id} name={client.name} />

        <span
          aria-hidden="true"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${AVATAR_CLASS[status.action.tone]}`}
        >
          {initial}
        </span>

        {/* Nome e valor na 1ª linha, situação na 2ª ocupando a largura toda. O
            nome quebra em 2 linhas em vez de cortar: os clientes começam todos
            com "Cartão de TODOS - ", e a cidade, que os distingue, ficava no fim. */}
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="line-clamp-2 min-w-0 break-words text-[15px] font-semibold leading-snug text-ink sm:line-clamp-1 sm:break-normal">
                {client.name}
              </span>
              {client.canceled_at && (
                <span className="shrink-0 rounded-full bg-neutral-bg px-1.5 py-0.5 text-[10px] font-semibold text-secondary-ink">
                  Cancelado
                </span>
              )}
              {/* Forma de cobrança à vista na lista; a descrição completa fica no expandido. */}
              {methodTags.map((t) => (
                <span
                  key={t.key}
                  title={t.label}
                  className={`hidden shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:inline-flex ${METHOD_TAG_CLASS[t.key]}`}
                >
                  {t.short}
                </span>
              ))}
            </span>
            <span className="shrink-0 text-right">
              <span
                title={
                  status.openItems.length > 0
                    ? `${status.openItems.length} cobrança${status.openItems.length === 1 ? "" : "s"} em aberto`
                    : "nada em aberto"
                }
                className={`block text-[15px] font-bold tabular-nums ${status.openTotal > 0 ? "text-ink" : "text-subtle"}`}
              >
                {status.openTotal > 0 ? currency.format(status.openTotal) : "—"}
              </span>
            </span>
          </span>
          <span
            className={`mt-0.5 line-clamp-2 text-[12.5px] font-medium leading-snug sm:line-clamp-1 ${ACTION_CLASS[status.action.tone]}`}
          >
            {status.action.label}
          </span>
        </span>

        {/* Últimos 6 meses na própria linha: cada quadradinho leva à referência. */}
        <span className="hidden shrink-0 lg:block">
          <MonthTimeline billings={billings} today={today} limit={6} order="asc" clientId={client.id} />
        </span>

        {/* O responsivo fica no wrapper, não no badge: `hidden` e `inline-flex`
            são ambos utilitários de display e quem vence depende da ordem no
            CSS gerado, não da ordem no atributo — no badge, o `hidden` perdia. */}
        <span className="hidden shrink-0 xl:inline-flex">
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

        <CaretDown
          size={16}
          weight="bold"
          aria-hidden="true"
          className="hidden shrink-0 text-subtle transition-transform duration-200 group-open:rotate-180 sm:block"
        />
      </summary>

      {/* Detalhes — só no modo expandido, pra manter o card compacto. */}
      <div className="border-t border-hairline bg-[#F8FAF7] px-4 py-5 sm:px-5">
        <div className="mb-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <div className="col-span-2">
            <p className="mb-1.5 text-xs font-medium text-secondary-ink">Forma de cobrança</p>
            <div className="flex flex-wrap gap-1.5">
              {methodTags.map((t) => (
                <span
                  key={t.key}
                  className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${METHOD_TAG_CLASS[t.key]}`}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-secondary-ink">Já recebido</p>
            <p className="mt-0.5 text-[15px] font-bold tabular-nums text-ink">
              {currency.format(status.receivedTotal)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-secondary-ink">Implantação</p>
            <p className="mt-0.5 text-[15px] font-bold tabular-nums text-ink">
              {currency.format(client.setup_value)}
            </p>
          </div>
          {client.segment && (
            <div>
              <p className="text-xs font-medium text-secondary-ink">Segmento</p>
              <p className="mt-0.5 text-[15px] font-bold text-ink">{client.segment}</p>
            </div>
          )}
        </div>

        {status.blockers.length > 0 && (
          <div className="mb-5">
            <p className="mb-1.5 text-xs font-medium text-secondary-ink">Pendências administrativas</p>
            <div className="flex flex-wrap gap-1.5">
              {status.blockers.map((b) => (
                <StatusBadge key={b} tone="neutral" size="sm">
                  Falta {b}
                </StatusBadge>
              ))}
            </div>
          </div>
        )}

        <div className="mb-5">
          <p className="mb-2 text-xs font-medium text-secondary-ink">
            Histórico por referência{" "}
            <span className="font-normal text-subtle">(mais recente primeiro)</span>
          </p>
          <MonthTimeline billings={billings} today={today} />
          {/* Legenda junto da timeline: fora daqui ela ficaria explicando algo
              que só aparece com o card expandido. */}
          <div className="mt-3">
            <MonthTimelineLegend />
          </div>
        </div>

        <Link
          href={`/financeiro/${client.id}`}
          className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          Abrir cliente
        </Link>
      </div>
    </details>
  );
}
