import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPayable,
  getPayableAttachmentUrl,
  listCategories,
  listSuppliers,
} from "@/lib/payables";
import {
  dueLabel,
  payableState,
  remainingAmount,
  PAYABLE_STATE_LABEL,
  PAYABLE_STATE_TONE,
} from "@/lib/payables-status";
import { todayIso } from "@/lib/urgency";
import { StatusBadge } from "@/components/financeiro/StatusBadge";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmButton } from "@/app/financeiro/[id]/ConfirmButton";
import { EditPayableForm } from "./EditPayableForm";
import {
  cancelPayableAction,
  deleteAttachmentAction,
  deletePayableAction,
  duplicatePayableAction,
  partialPayAction,
  reopenPayableAction,
  uploadAttachmentAction,
} from "../actions";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
const stampFmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export const dynamic = "force-dynamic";

export default async function PayableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payable = await getPayable(id);
  if (!payable) notFound();

  const [suppliers, categories] = await Promise.all([listSuppliers(), listCategories(true)]);
  const supplier = suppliers.find((s) => s.id === payable.supplier_id);
  const category = categories.find((c) => c.id === payable.category_id);
  const attachmentUrl = payable.attachment_path
    ? await getPayableAttachmentUrl(payable.attachment_path)
    : null;

  const today = todayIso();
  const state = payableState(payable, today);
  const remaining = remainingAmount(payable);

  return (
    <main className="min-h-screen bg-surface py-12 sm:py-16 px-6">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/financeiro/pagar"
          className="text-xs text-neutral-ink hover:text-ink transition-colors"
        >
          ← Contas a pagar
        </Link>

        <div className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-brand mb-2">
              Virtent
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink truncate">
              {supplier?.name ?? "Fornecedor removido"}
            </h1>
            <p className="text-sm text-neutral-ink">{payable.title}</p>
          </div>
          <StatusBadge tone={PAYABLE_STATE_TONE[state]}>{PAYABLE_STATE_LABEL[state]}</StatusBadge>
        </div>

        {/* Resumo financeiro */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm mb-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink">
                Valor
              </p>
              <p className="text-lg font-bold tabular-nums text-ink">
                {currency.format(Number(payable.amount))}
              </p>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink">
                Já pago
              </p>
              <p className="text-lg font-bold tabular-nums text-ink">
                {currency.format(Number(payable.paid_amount))}
              </p>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink">
                Restante
              </p>
              <p className="text-lg font-bold tabular-nums text-ink">{currency.format(remaining)}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink">
                Vencimento
              </p>
              <p className="text-lg font-bold tabular-nums text-ink">{dateFmt(payable.due_date)}</p>
              <p className="text-[11px] text-secondary-ink">{dueLabel(payable, today)}</p>
            </div>
          </div>

          {payable.status === "pending" && (
            <div className="border-t border-border pt-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink mb-2">
                Registrar pagamento
              </p>
              <form action={partialPayAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={payable.id} />
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-ink mb-1">
                    Valor pago agora
                  </label>
                  <CurrencyInput name="amount" defaultValue={remaining} className="w-40" />
                </div>
                <SubmitButton
                  pendingLabel="Registrando..."
                  className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-hover"
                >
                  Registrar
                </SubmitButton>
                <p className="w-full text-[11px] text-secondary-ink">
                  Valor menor que o restante registra pagamento parcial e mantém a conta em aberto.
                </p>
              </form>
            </div>
          )}

          {payable.status === "paid" && (
            <div className="border-t border-border pt-4">
              <form action={reopenPayableAction}>
                <input type="hidden" name="id" value={payable.id} />
                <SubmitButton
                  pendingLabel="Reabrindo..."
                  className="rounded-lg border border-border bg-white px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface"
                >
                  Reabrir conta
                </SubmitButton>
              </form>
            </div>
          )}

          {payable.status_changed_at && (
            <p className="mt-4 text-[11px] text-secondary-ink">
              Última mudança de status em {stampFmt(payable.status_changed_at)}
              {payable.paid_at && ` · quitada em ${stampFmt(payable.paid_at)}`}
            </p>
          )}
        </section>

        {/* Comprovante */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm mb-5">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-secondary-ink mb-3">
            Comprovante / nota fiscal
          </p>
          {payable.attachment_path ? (
            <div className="flex items-center gap-4">
              <a
                href={attachmentUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
              >
                Ver anexo
              </a>
              <form action={deleteAttachmentAction}>
                <input type="hidden" name="id" value={payable.id} />
                <input type="hidden" name="path" value={payable.attachment_path} />
                <ConfirmButton
                  confirmText="Excluir o anexo desta conta?"
                  className="text-xs font-medium text-overdue-ink hover:opacity-80 transition-opacity"
                >
                  Excluir
                </ConfirmButton>
              </form>
            </div>
          ) : (
            <form
              action={uploadAttachmentAction}
              encType="multipart/form-data"
              className="flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="id" value={payable.id} />
              <input
                type="file"
                name="file"
                accept=".pdf,.xml,.jpg,.jpeg,.png"
                required
                className="text-xs text-neutral-ink file:mr-2 file:rounded-lg file:border file:border-border file:bg-white file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-ink hover:file:bg-surface file:cursor-pointer"
              />
              <SubmitButton
                pendingLabel="Enviando..."
                className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface"
              >
                Enviar
              </SubmitButton>
            </form>
          )}
        </section>

        {/* Edição */}
        <EditPayableForm
          payable={payable}
          supplierName={supplier?.name ?? ""}
          categoryName={category?.name ?? ""}
          suppliers={suppliers.map((s) => s.name)}
          categories={categories.filter((c) => !c.archived).map((c) => c.name)}
        />

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <form action={duplicatePayableAction}>
            <input type="hidden" name="id" value={payable.id} />
            <SubmitButton
              pendingLabel="Duplicando..."
              className="rounded-lg border border-border bg-white px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface"
            >
              Duplicar conta
            </SubmitButton>
          </form>

          {payable.status !== "canceled" && (
            <form action={cancelPayableAction}>
              <input type="hidden" name="id" value={payable.id} />
              <ConfirmButton
                confirmText="Cancelar esta conta? Ela sai dos totais mas fica no histórico."
                className="text-xs font-medium text-neutral-ink hover:text-ink transition-colors"
              >
                Cancelar conta
              </ConfirmButton>
            </form>
          )}

          <form action={deletePayableAction}>
            <input type="hidden" name="id" value={payable.id} />
            <ConfirmButton
              confirmText="Excluir esta conta definitivamente? Não dá pra desfazer."
              className="text-xs font-medium text-overdue-ink hover:opacity-80 transition-opacity"
            >
              Excluir
            </ConfirmButton>
          </form>
        </div>
      </div>
    </main>
  );
}
