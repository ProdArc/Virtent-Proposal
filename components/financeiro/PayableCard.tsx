import Link from "next/link";
import type { CategoryRow, PayableRow, SupplierRow } from "@/lib/payables";
import {
  dueLabel,
  payableState,
  remainingAmount,
  PAYABLE_STATE_LABEL,
  PAYABLE_STATE_TONE,
  PAYMENT_METHOD_LABEL,
  RECURRENCE_LABEL,
} from "@/lib/payables-status";
import type { Tone } from "@/lib/urgency";
import { StatusBadge } from "./StatusBadge";
import { CategoryTag } from "./CategoryTag";
import { QuickPayButton } from "./QuickPayButton";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
const stampFmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const RAIL_CLASS: Record<Tone, string> = {
  paid: "bg-paid-ink",
  pending: "bg-pending-ink",
  overdue: "bg-overdue-ink",
  onboarding: "bg-onboarding-ink",
  neutral: "bg-neutral-line",
};

const DUE_CLASS: Record<Tone, string> = {
  paid: "text-paid-ink",
  pending: "text-pending-ink",
  overdue: "text-overdue-ink",
  onboarding: "text-onboarding-ink",
  neutral: "text-secondary-ink",
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

/** Card da conta a pagar — compacto por padrão, mesmo padrão do ClientCard. */
export function PayableCard({
  payable,
  supplier,
  category,
  today,
  quickPay,
}: {
  payable: PayableRow;
  supplier: SupplierRow | undefined;
  category: CategoryRow | undefined;
  today: string;
  quickPay: (id: string) => Promise<void>;
}) {
  const state = payableState(payable, today);
  const tone = PAYABLE_STATE_TONE[state];
  const remaining = remainingAmount(payable);
  const isOpen = payable.status === "pending";
  const partial = Number(payable.paid_amount) > 0 && payable.status !== "paid";

  return (
    <details className="group border-b border-border last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40">
        <span aria-hidden="true" className={`h-9 w-1 shrink-0 rounded-full ${RAIL_CLASS[tone]}`} />
        <Chevron />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">
            {supplier?.name ?? "Fornecedor removido"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`truncate text-[11.5px] font-medium ${DUE_CLASS[tone]}`}>
              {dueLabel(payable, today)}
            </span>
            <span className="hidden sm:inline truncate text-[11.5px] text-secondary-ink">
              · {payable.title}
            </span>
          </span>
        </span>

        <span className="hidden lg:block shrink-0">
          {category && <CategoryTag name={category.name} color={category.color} archived={category.archived} />}
        </span>

        <span className="shrink-0 text-right">
          <span className="block text-sm font-bold tabular-nums text-ink">
            {currency.format(remaining > 0 ? remaining : Number(payable.amount))}
          </span>
          <span className="hidden sm:block text-[10.5px] text-secondary-ink">
            {partial ? `de ${currency.format(Number(payable.amount))}` : dateFmt(payable.due_date)}
          </span>
        </span>

        <span className="hidden md:inline-flex shrink-0">
          <StatusBadge tone={tone} size="sm">
            {PAYABLE_STATE_LABEL[state]}
          </StatusBadge>
        </span>

        {isOpen && (
          <QuickPayButton
            id={payable.id}
            action={quickPay}
            label={partial ? "Quitar" : "Pagar"}
            title={`Marcar como paga (${currency.format(remaining)})`}
          />
        )}
      </summary>

      <div className="border-t border-border bg-surface px-4 py-4 sm:pl-[3.5rem]">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 mb-4">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink">
              Valor total
            </p>
            <p className="text-sm font-semibold tabular-nums text-ink">
              {currency.format(Number(payable.amount))}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink">
              Já pago
            </p>
            <p className="text-sm font-semibold tabular-nums text-ink">
              {currency.format(Number(payable.paid_amount))}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink">
              Restante
            </p>
            <p className="text-sm font-semibold tabular-nums text-ink">
              {currency.format(remaining)}
            </p>
          </div>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink">
              Vencimento
            </p>
            <p className="text-sm font-semibold tabular-nums text-ink">
              {dateFmt(payable.due_date)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {category && (
            <CategoryTag name={category.name} color={category.color} archived={category.archived} />
          )}
          {payable.payment_method && (
            <StatusBadge tone="neutral" size="sm">
              {PAYMENT_METHOD_LABEL[payable.payment_method] ?? payable.payment_method}
            </StatusBadge>
          )}
          {payable.account_origin && (
            <StatusBadge tone="neutral" size="sm">
              Origem: {payable.account_origin}
            </StatusBadge>
          )}
          {payable.cost_center && (
            <StatusBadge tone="neutral" size="sm">
              Centro de custo: {payable.cost_center}
            </StatusBadge>
          )}
          {payable.recurrence && (
            <StatusBadge tone="neutral" size="sm">
              Recorrente · {RECURRENCE_LABEL[payable.recurrence]}
            </StatusBadge>
          )}
          {payable.installment_total && (
            <StatusBadge tone="neutral" size="sm">
              Parcela {payable.installment_number}/{payable.installment_total}
            </StatusBadge>
          )}
          {payable.attachment_path && (
            <StatusBadge tone="paid" size="sm">
              Comprovante anexado
            </StatusBadge>
          )}
        </div>

        {payable.notes && (
          <p className="mb-4 whitespace-pre-line rounded-lg border border-border bg-white px-3 py-2 text-xs leading-relaxed text-neutral-ink">
            {payable.notes}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/financeiro/pagar/${payable.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand transition-colors hover:text-brand-hover"
          >
            Abrir conta →
          </Link>
          {payable.status_changed_at && (
            <span className="text-[11px] text-secondary-ink">
              Última atualização de status em {stampFmt(payable.status_changed_at)}
            </span>
          )}
        </div>
      </div>
    </details>
  );
}
