import Link from "next/link";
import { notFound } from "next/navigation";
import {
  calcBillingTotal,
  ensureCurrentBilling,
  getFinancialClient,
  getNfeSignedUrl,
  listBillingsForClient,
  type FinancialBillingRow,
} from "@/lib/financial";
import { EditClientForm } from "./EditClientForm";
import { ConfirmButton } from "./ConfirmButton";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import {
  deleteBillingAction,
  deleteClientAction,
  deleteNfeAction,
  toggleBillingPaidAction,
  toggleSetupPaidAction,
  updateBillingRevenueAction,
  uploadNfeAction,
} from "./actions";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthYearFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const dateFmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function cycleLabel(iso: string): string {
  return capitalize(monthYearFmt.format(new Date(`${iso}T00:00:00`)));
}

function isSameCycle(iso: string, reference: Date): boolean {
  const d = new Date(`${iso}T00:00:00`);
  return d.getFullYear() === reference.getFullYear() && d.getMonth() === reference.getMonth();
}

function isOverdue(b: FinancialBillingRow, todayIso: string): boolean {
  return !b.paid && b.due_date < todayIso;
}

function isFuture(b: FinancialBillingRow, todayIso: string): boolean {
  return !b.paid && b.due_date > todayIso;
}

// Status de pagamento muda a cada baixa; e a cobrança do ciclo atual precisa
// ser gerada (ensureCurrentBilling) sempre que a página é aberta.
export const dynamic = "force-dynamic";

export default async function FinanceiroClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const clientRow = await getFinancialClient(id);
  if (!clientRow) notFound();
  const client = clientRow;

  await ensureCurrentBilling(client);
  const billings = await listBillingsForClient(id);

  const nfeUrls: Record<string, string> = {};
  await Promise.all(
    billings
      .filter((b) => b.nfe_path)
      .map(async (b) => {
        const url = await getNfeSignedUrl(b.nfe_path!);
        if (url) nfeUrls[b.id] = url;
      })
  );

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);

  const openBillings = billings.filter((b) => !b.paid);
  const overdueBillings = openBillings.filter((b) => isOverdue(b, todayIso));
  const paidBillings = billings.filter((b) => b.paid);
  const openTotal = openBillings.reduce((sum, b) => sum + calcBillingTotal(b).total_value, 0);
  const receivedTotal = paidBillings.reduce((sum, b) => sum + calcBillingTotal(b).total_value, 0);

  // Ciclo atual e pendências sempre visíveis; ciclos passados já pagos vão pro histórico colapsado.
  const visibleBillings = billings.filter((b) => !b.paid || isSameCycle(b.due_date, now));
  const historicalBillings = billings.filter((b) => b.paid && !isSameCycle(b.due_date, now));

  function billingCard(b: FinancialBillingRow) {
    const { commission_value, total_value } = calcBillingTotal(b);
    const overdue = isOverdue(b, todayIso);
    const future = isFuture(b, todayIso);
    const current = isSameCycle(b.due_date, now);
    const statusLabel = b.paid ? "Paga" : overdue ? "Atrasada" : future ? "Futura" : "Pendente";
    const statusClass = b.paid
      ? "bg-[#ECFDF5] text-[#065F46]"
      : overdue
        ? "bg-[#FEF2F2] text-[#B91C1C]"
        : future
          ? "bg-[#F4F4F5] text-[#71717A]"
          : "bg-[#FFF7ED] text-[#B45309]";

    return (
      <div key={b.id} className="rounded-xl border border-[#E4E4E7] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[#18181B]">{cycleLabel(b.due_date)}</p>
              {current && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8]">
                  Ciclo atual
                </span>
              )}
            </div>
            <p className="text-xs text-[#A1A1AA]">
              Vencimento {dateFmt(b.due_date)} · mensalidade {currency.format(b.monthly_value)} ·
              comissão {b.commission_pct}%
            </p>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-3 mb-3">
          <form action={updateBillingRevenueAction} className="flex items-end gap-2">
            <input type="hidden" name="billingId" value={b.id} />
            <input type="hidden" name="clientId" value={client.id} />
            <div>
              <label className="block text-[11px] font-semibold text-[#52525B] mb-1">
                Valor arrecadado
              </label>
              <CurrencyInput name="revenueAmount" defaultValue={b.revenue_amount} className="w-36" />
            </div>
            <SubmitButton
              pendingLabel="Salvando..."
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E4E4E7] text-[#18181B] hover:bg-[#F9FBF8] transition-colors"
            >
              Salvar
            </SubmitButton>
          </form>

          <div className="text-xs text-[#71717A] ml-auto">
            <p>Comissão: {currency.format(commission_value)}</p>
            <p className="font-semibold text-[#18181B]">
              Total a cobrar: {currency.format(total_value)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <form action={toggleBillingPaidAction}>
            <input type="hidden" name="billingId" value={b.id} />
            <input type="hidden" name="clientId" value={client.id} />
            <input type="hidden" name="paid" value={(!b.paid).toString()} />
            <SubmitButton
              pendingLabel="Salvando..."
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#065F46] text-white hover:bg-[#047857] transition-colors"
            >
              {b.paid ? "Desfazer baixa" : "Dar baixa"}
            </SubmitButton>
          </form>
          <form action={deleteBillingAction}>
            <input type="hidden" name="billingId" value={b.id} />
            <input type="hidden" name="clientId" value={client.id} />
            <ConfirmButton
              confirmText="Excluir esta cobrança?"
              className="text-xs font-medium text-[#B91C1C] hover:text-[#991B1B] transition-colors"
            >
              Excluir
            </ConfirmButton>
          </form>
        </div>

        <div className="mt-3 pt-3 border-t border-[#E4E4E7]">
          <p className="text-[11px] font-semibold text-[#52525B] mb-1.5">NFe</p>
          {b.nfe_path ? (
            <div className="flex items-center gap-3">
              <a
                href={nfeUrls[b.id] ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[#065F46] hover:text-[#047857] transition-colors"
              >
                Ver NFe
              </a>
              <form action={deleteNfeAction}>
                <input type="hidden" name="billingId" value={b.id} />
                <input type="hidden" name="clientId" value={client.id} />
                <input type="hidden" name="path" value={b.nfe_path} />
                <ConfirmButton
                  confirmText="Excluir a NFe desta cobrança?"
                  className="text-xs font-medium text-[#B91C1C] hover:text-[#991B1B] transition-colors"
                >
                  Excluir
                </ConfirmButton>
              </form>
            </div>
          ) : (
            <form action={uploadNfeAction} encType="multipart/form-data" className="flex items-center gap-2">
              <input type="hidden" name="billingId" value={b.id} />
              <input type="hidden" name="clientId" value={client.id} />
              <input
                type="file"
                name="file"
                accept=".pdf,.xml"
                required
                className="text-xs text-[#71717A] file:mr-2 file:text-xs file:font-semibold file:px-2.5 file:py-1.5 file:rounded-lg file:border file:border-[#E4E4E7] file:bg-white file:text-[#18181B] hover:file:bg-[#F9FBF8] file:cursor-pointer"
              />
              <SubmitButton
                pendingLabel="Enviando..."
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E4E4E7] text-[#18181B] hover:bg-[#F9FBF8] transition-colors"
              >
                Enviar
              </SubmitButton>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F9FBF8] py-12 sm:py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/financeiro"
          className="text-xs text-[#71717A] hover:text-[#18181B] transition-colors"
        >
          ← Financeiro
        </Link>

        <div className="flex items-start justify-between gap-4 mt-4 mb-1">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#065F46] mb-3">
              Virtent
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#18181B]">
              {client.name}
            </h1>
            {client.cnpj && <p className="text-xs text-[#A1A1AA] mt-1">CNPJ {client.cnpj}</p>}
          </div>
          <form action={deleteClientAction}>
            <input type="hidden" name="id" value={client.id} />
            <ConfirmButton
              confirmText={`Excluir "${client.name}" e todas as cobranças associadas? Essa ação não pode ser desfeita.`}
              className="text-xs font-medium text-[#B91C1C] hover:text-[#991B1B] transition-colors"
            >
              Excluir cliente
            </ConfirmButton>
          </form>
        </div>

        <EditClientForm client={client} />

        {/* Implantação */}
        <section className="rounded-2xl border border-[#E4E4E7] bg-white p-6 sm:p-8 mt-8">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#52525B] mb-4">
            Implantação
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-[#18181B]">
                {currency.format(client.setup_value)}
              </p>
              {client.setup_due_date && (
                <p className="text-xs text-[#A1A1AA]">Vencimento: {dateFmt(client.setup_due_date)}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                  client.setup_paid ? "bg-[#ECFDF5] text-[#065F46]" : "bg-[#FFF7ED] text-[#B45309]"
                }`}
              >
                {client.setup_paid ? "Paga" : "Pendente"}
              </span>
              <form action={toggleSetupPaidAction}>
                <input type="hidden" name="id" value={client.id} />
                <input type="hidden" name="paid" value={(!client.setup_paid).toString()} />
                <SubmitButton
                  pendingLabel="Salvando..."
                  className="text-sm font-semibold px-3 py-1.5 rounded-lg border border-[#E4E4E7] text-[#18181B] hover:bg-[#F9FBF8] transition-colors"
                >
                  {client.setup_paid ? "Desfazer baixa" : "Dar baixa"}
                </SubmitButton>
              </form>
            </div>
          </div>
        </section>

        {/* Cobranças mensais */}
        <section className="rounded-2xl border border-[#E4E4E7] bg-white p-6 sm:p-8 mt-6">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#52525B] mb-4">
            Cobranças mensais
          </p>
          <p className="text-xs text-[#A1A1AA] mb-5">
            Total cobrado por ciclo = mensalidade ({currency.format(client.monthly_value)}) +
            comissão de {client.commission_pct}% sobre o valor arrecadado informado abaixo.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl border border-[#E4E4E7] px-4 py-3">
              <p className="text-[11px] font-semibold text-[#52525B] mb-1">Em aberto</p>
              <p className="text-base font-bold text-[#18181B]">{currency.format(openTotal)}</p>
              <p className="text-[11px] text-[#A1A1AA]">
                {openBillings.length} cobrança{openBillings.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="rounded-xl border border-[#E4E4E7] px-4 py-3">
              <p className="text-[11px] font-semibold text-[#52525B] mb-1">Atrasadas</p>
              <p
                className={`text-base font-bold ${overdueBillings.length > 0 ? "text-[#B91C1C]" : "text-[#18181B]"}`}
              >
                {overdueBillings.length}
              </p>
            </div>
            <div className="rounded-xl border border-[#E4E4E7] px-4 py-3">
              <p className="text-[11px] font-semibold text-[#52525B] mb-1">Recebido (histórico)</p>
              <p className="text-base font-bold text-[#18181B]">{currency.format(receivedTotal)}</p>
              <p className="text-[11px] text-[#A1A1AA]">
                {paidBillings.length} cobrança{paidBillings.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">{visibleBillings.map(billingCard)}</div>

          {historicalBillings.length > 0 && (
            <details className="mt-4 group">
              <summary className="cursor-pointer text-xs font-semibold text-[#065F46] hover:text-[#047857] transition-colors list-none">
                Ver histórico ({historicalBillings.length})
              </summary>
              <div className="flex flex-col gap-4 mt-4">{historicalBillings.map(billingCard)}</div>
            </details>
          )}
        </section>
      </div>
    </main>
  );
}
