import Link from "next/link";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
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

/** Avatar redondo: a cor da inicial já diz a urgência, sem precisar ler. */
const AVATAR_CLASS: Record<Tone, string> = {
  paid: "bg-paid-bg text-paid-ink",
  pending: "bg-pending-bg text-pending-ink",
  overdue: "bg-overdue-bg text-overdue-ink",
  onboarding: "bg-onboarding-bg text-onboarding-ink",
  neutral: "bg-neutral-bg text-neutral-ink",
};

const DUE_CLASS: Record<Tone, string> = {
  paid: "text-paid-ink",
  pending: "text-pending-ink",
  overdue: "text-overdue-ink",
  onboarding: "text-onboarding-ink",
  neutral: "text-secondary-ink",
};

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
    <details className="group border-b border-hairline last:border-b-0">
      <summary className="flex min-h-[4.5rem] cursor-pointer list-none items-start gap-3 px-4 py-3.5 transition-colors hover:bg-wash focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 sm:px-5">
        <span
          aria-hidden="true"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold ${AVATAR_CLASS[tone]}`}
        >
          {(supplier?.name ?? "?").trim().charAt(0).toUpperCase() || "?"}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <span className="line-clamp-2 min-w-0 break-words text-[15px] font-semibold leading-snug text-ink">
              {supplier?.name ?? "Fornecedor removido"}
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-[15px] font-bold tabular-nums text-ink">
                {currency.format(remaining > 0 ? remaining : Number(payable.amount))}
              </span>
              <span className="hidden text-[11px] text-secondary-ink sm:block">
                {partial ? `de ${currency.format(Number(payable.amount))}` : dateFmt(payable.due_date)}
              </span>
            </span>
          </span>
          <span className={`mt-1 line-clamp-2 text-[12.5px] font-medium leading-snug ${DUE_CLASS[tone]}`}>
            {dueLabel(payable, today)}
            <span className="font-normal text-secondary-ink"> · {payable.title}</span>
          </span>
        </span>

        <span className="hidden shrink-0 lg:block">
          {category && <CategoryTag name={category.name} color={category.color} archived={category.archived} />}
        </span>

        <span className="hidden shrink-0 md:inline-flex">
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

        <CaretDown
          size={16}
          weight="bold"
          aria-hidden="true"
          className="mt-3 hidden shrink-0 text-subtle transition-transform duration-200 group-open:rotate-180 sm:block"
        />
      </summary>

      <div className="border-t border-hairline bg-wash px-4 py-5 sm:px-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 mb-4">
          <div>
            <p className="text-xs font-medium text-secondary-ink">
              Valor total
            </p>
            <p className="text-sm font-semibold tabular-nums text-ink">
              {currency.format(Number(payable.amount))}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-secondary-ink">
              Já pago
            </p>
            <p className="text-sm font-semibold tabular-nums text-ink">
              {currency.format(Number(payable.paid_amount))}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-secondary-ink">
              Restante
            </p>
            <p className="text-sm font-semibold tabular-nums text-ink">
              {currency.format(remaining)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-secondary-ink">
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
          <p className="mb-4 whitespace-pre-line rounded-2xl bg-card px-4 py-3 text-xs leading-relaxed text-neutral-ink">
            {payable.notes}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/financeiro/pagar/${payable.id}`}
            className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Abrir conta
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
