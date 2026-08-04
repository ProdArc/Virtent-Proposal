import Link from "next/link";
import { notFound } from "next/navigation";
import {
  calcBillingTotal,
  ensureCurrentBilling,
  getComprovanteSignedUrl,
  getFinancialClient,
  getNfeSignedUrl,
  listBillingsForClient,
  type FinancialBillingRow,
} from "@/lib/financial";
import { billingEmailBlockedReason, renderBillingEmail, renderSetupEmail, setupEmailBlockedReason } from "@/lib/email";
import { EditClientForm } from "./EditClientForm";
import { ConfirmButton } from "./ConfirmButton";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { SendEmailButton } from "@/components/ui/SendEmailButton";
import { LogoutButton } from "@/components/ui/LogoutButton";
import {
  deleteBillingAction,
  deleteBillingComprovanteAction,
  deleteClientAction,
  deleteNfeAction,
  deleteSetupComprovanteAction,
  deleteSetupNfeAction,
  sendBillingEmailAction,
  sendSetupEmailAction,
  toggleBillingPaidAction,
  toggleSetupPaidAction,
  updateBillingPixLinkAction,
  updateBillingRevenueAction,
  updateSetupPixLinkAction,
  uploadBillingComprovanteAction,
  uploadNfeAction,
  uploadSetupComprovanteAction,
  uploadSetupNfeAction,
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

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4 shrink-0 text-[#A1A1AA] transition-transform duration-200 group-open:rotate-90"
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
  const comprovanteUrls: Record<string, string> = {};
  await Promise.all([
    ...billings
      .filter((b) => b.nfe_path)
      .map(async (b) => {
        const url = await getNfeSignedUrl(b.nfe_path!);
        if (url) nfeUrls[b.id] = url;
      }),
    ...billings
      .filter((b) => b.comprovante_path)
      .map(async (b) => {
        const url = await getComprovanteSignedUrl(b.comprovante_path!);
        if (url) comprovanteUrls[b.id] = url;
      }),
  ]);

  const setupComprovanteUrl = client.setup_comprovante_path
    ? await getComprovanteSignedUrl(client.setup_comprovante_path)
    : null;
  const setupNfeUrl = client.setup_nfe_path ? await getNfeSignedUrl(client.setup_nfe_path) : null;

  const setupEmailPreview = renderSetupEmail(client);
  const setupEmailBlocked = setupEmailBlockedReason(client);

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);

  const openBillings = billings.filter((b) => !b.paid);
  const overdueBillings = openBillings.filter((b) => isOverdue(b, todayIso));
  const paidBillings = billings.filter((b) => b.paid);
  const openTotal = openBillings.reduce((sum, b) => sum + calcBillingTotal(b).total_value, 0);
  const receivedTotal = paidBillings.reduce((sum, b) => sum + calcBillingTotal(b).total_value, 0);

  // Ciclo atual e pendências sempre visíveis (e abertas por padrão); ciclos
  // passados já pagos vão pro histórico colapsado.
  const visibleBillings = billings.filter((b) => !b.paid || isSameCycle(b.due_date, now));
  const historicalBillings = billings.filter((b) => b.paid && !isSameCycle(b.due_date, now));

  function billingCard(b: FinancialBillingRow) {
    const { commission_value, total_value } = calcBillingTotal(b);
    const overdue = isOverdue(b, todayIso);
    const future = isFuture(b, todayIso);
    const current = isSameCycle(b.due_date, now);
    const billingEmailPreview = renderBillingEmail(client, b);
    const billingEmailBlocked = billingEmailBlockedReason(client, b);
    const statusLabel = b.paid ? "Paga" : overdue ? "Atrasada" : future ? "Futura" : "Pendente";
    const statusClass = b.paid
      ? "bg-[#ECFDF5] text-[#065F46]"
      : overdue
        ? "bg-[#FEF2F2] text-[#B91C1C]"
        : future
          ? "bg-[#F4F4F5] text-[#71717A]"
          : "bg-[#FFF7ED] text-[#B45309]";

    return (
      <details
        key={b.id}
        open={!b.paid || current}
        className="group rounded-xl border border-[#E4E4E7] bg-white overflow-hidden open:shadow-sm transition-shadow"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 select-none hover:bg-[#F9FBF8] transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <ChevronIcon />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#18181B] truncate">{cycleLabel(b.due_date)}</p>
                {current && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] shrink-0">
                    Ciclo atual
                  </span>
                )}
              </div>
              <p className="text-xs text-[#A1A1AA] truncate">Vencimento {dateFmt(b.due_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-semibold text-[#18181B] tabular-nums hidden sm:inline">
              {currency.format(total_value)}
            </span>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusClass}`}>
              {statusLabel}
            </span>
          </div>
        </summary>

        <div className="px-4 pb-4">
          <div className="border-t border-[#E4E4E7] pt-4 flex flex-wrap items-end gap-3 mb-4">
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

            <div className="text-xs text-[#71717A] ml-auto text-right">
              <p>
                Mensalidade {currency.format(b.monthly_value)} · comissão {b.commission_pct}% ={" "}
                {currency.format(commission_value)}
              </p>
              <p className="font-semibold text-[#18181B] tabular-nums">
                Total a cobrar: {currency.format(total_value)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
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

          <div className="rounded-xl bg-[#F9FBF8] border border-[#E4E4E7] p-4">
            <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-[#52525B] mb-3">
              Anexos e pagamento
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
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
                  <form action={uploadNfeAction} encType="multipart/form-data" className="flex flex-wrap items-center gap-2">
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
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E4E4E7] bg-white text-[#18181B] hover:bg-[#F9FBF8] transition-colors"
                    >
                      Enviar
                    </SubmitButton>
                  </form>
                )}
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#52525B] mb-1.5">Comprovante de pagamento</p>
                {b.comprovante_path ? (
                  <div className="flex items-center gap-3">
                    <a
                      href={comprovanteUrls[b.id] ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#065F46] hover:text-[#047857] transition-colors"
                    >
                      Ver comprovante
                    </a>
                    <form action={deleteBillingComprovanteAction}>
                      <input type="hidden" name="billingId" value={b.id} />
                      <input type="hidden" name="clientId" value={client.id} />
                      <input type="hidden" name="path" value={b.comprovante_path} />
                      <ConfirmButton
                        confirmText="Excluir o comprovante desta cobrança?"
                        className="text-xs font-medium text-[#B91C1C] hover:text-[#991B1B] transition-colors"
                      >
                        Excluir
                      </ConfirmButton>
                    </form>
                  </div>
                ) : (
                  <form
                    action={uploadBillingComprovanteAction}
                    encType="multipart/form-data"
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="billingId" value={b.id} />
                    <input type="hidden" name="clientId" value={client.id} />
                    <input
                      type="file"
                      name="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      required
                      className="text-xs text-[#71717A] file:mr-2 file:text-xs file:font-semibold file:px-2.5 file:py-1.5 file:rounded-lg file:border file:border-[#E4E4E7] file:bg-white file:text-[#18181B] hover:file:bg-[#F9FBF8] file:cursor-pointer"
                    />
                    <SubmitButton
                      pendingLabel="Enviando..."
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E4E4E7] bg-white text-[#18181B] hover:bg-[#F9FBF8] transition-colors"
                    >
                      Enviar
                    </SubmitButton>
                  </form>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#E4E4E7]">
              <form action={updateBillingPixLinkAction} className="flex items-end gap-2">
                <input type="hidden" name="billingId" value={b.id} />
                <input type="hidden" name="clientId" value={client.id} />
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-[#52525B] mb-1">
                    Link de cobrança PIX
                  </label>
                  <input
                    name="pixLink"
                    type="text"
                    defaultValue={b.pix_link ?? ""}
                    placeholder="Link ou código copia-e-cola"
                    className="w-full rounded-lg border border-[#E4E4E7] bg-white px-3 py-2 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
                  />
                </div>
                <SubmitButton
                  pendingLabel="Salvando..."
                  className="text-xs font-semibold px-3 py-2 rounded-lg border border-[#E4E4E7] bg-white text-[#18181B] hover:bg-[#F9FBF8] transition-colors"
                >
                  Salvar
                </SubmitButton>
              </form>
            </div>

            <div className="mt-4 pt-4 border-t border-[#E4E4E7]">
              <SendEmailButton
                action={sendBillingEmailAction}
                hiddenFields={{ billingId: b.id, clientId: client.id }}
                to={billingEmailPreview.to}
                subject={billingEmailPreview.subject}
                previewHtml={billingEmailPreview.html}
                blockedReason={billingEmailBlocked}
                sentAt={b.email_sent_at}
                triggerLabel="Enviar cobrança por e-mail"
              />
            </div>
          </div>
        </div>
      </details>
    );
  }

  const initial = client.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F9FBF8] py-12 sm:py-16 px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,95,70,0.06),transparent_55%)]" />

      <div className="relative max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/financeiro"
            className="text-xs text-[#71717A] hover:text-[#18181B] transition-colors"
          >
            ← Financeiro
          </Link>
          <LogoutButton />
        </div>

        <div className="flex items-start justify-between gap-4 mt-4 mb-1">
          <div className="flex items-start gap-3 min-w-0">
            <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#065F46] text-white text-lg font-bold">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#065F46] mb-1">
                Virtent
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#18181B] truncate">
                {client.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                {client.cnpj && <p className="text-xs text-[#A1A1AA]">CNPJ {client.cnpj}</p>}
                {client.email && <p className="text-xs text-[#A1A1AA]">{client.email}</p>}
              </div>
            </div>
          </div>
          <form action={deleteClientAction} className="shrink-0">
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
        <details
          open={!client.setup_paid}
          className="group rounded-2xl border border-[#E4E4E7] bg-white mt-8 shadow-sm overflow-hidden"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-6 sm:p-8 select-none hover:bg-[#F9FBF8] transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <ChevronIcon />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#52525B] mb-1">
                  Implantação
                </p>
                <p className="text-lg font-bold text-[#18181B] tabular-nums">
                  {currency.format(client.setup_value)}
                </p>
                {client.setup_due_date && (
                  <p className="text-xs text-[#A1A1AA]">
                    Vencimento: {dateFmt(client.setup_due_date)}
                  </p>
                )}
              </div>
            </div>
            <span
              className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                client.setup_paid ? "bg-[#ECFDF5] text-[#065F46]" : "bg-[#FFF7ED] text-[#B45309]"
              }`}
            >
              {client.setup_paid ? "Paga" : "Pendente"}
            </span>
          </summary>

          <div className="px-6 sm:px-8 pb-6 sm:pb-8">
            <form action={toggleSetupPaidAction} className="border-t border-[#E4E4E7] pt-4">
              <input type="hidden" name="id" value={client.id} />
              <input type="hidden" name="paid" value={(!client.setup_paid).toString()} />
              <SubmitButton
                pendingLabel="Salvando..."
                className="text-sm font-semibold px-3 py-1.5 rounded-lg border border-[#E4E4E7] text-[#18181B] hover:bg-[#F9FBF8] transition-colors"
              >
                {client.setup_paid ? "Desfazer baixa" : "Dar baixa"}
              </SubmitButton>
            </form>

          <div className="mt-4 rounded-xl bg-[#F9FBF8] border border-[#E4E4E7] p-4">
            <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-[#52525B] mb-3">
              Anexos e pagamento
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-semibold text-[#52525B] mb-1.5">NFe</p>
                {client.setup_nfe_path ? (
                  <div className="flex items-center gap-3">
                    <a
                      href={setupNfeUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#065F46] hover:text-[#047857] transition-colors"
                    >
                      Ver NFe
                    </a>
                    <form action={deleteSetupNfeAction}>
                      <input type="hidden" name="clientId" value={client.id} />
                      <input type="hidden" name="path" value={client.setup_nfe_path} />
                      <ConfirmButton
                        confirmText="Excluir a NFe da implantação?"
                        className="text-xs font-medium text-[#B91C1C] hover:text-[#991B1B] transition-colors"
                      >
                        Excluir
                      </ConfirmButton>
                    </form>
                  </div>
                ) : (
                  <form
                    action={uploadSetupNfeAction}
                    encType="multipart/form-data"
                    className="flex flex-wrap items-center gap-2"
                  >
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
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E4E4E7] bg-white text-[#18181B] hover:bg-[#F9FBF8] transition-colors"
                    >
                      Enviar
                    </SubmitButton>
                  </form>
                )}
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#52525B] mb-1.5">Comprovante de pagamento</p>
                {client.setup_comprovante_path ? (
                  <div className="flex items-center gap-3">
                    <a
                      href={setupComprovanteUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#065F46] hover:text-[#047857] transition-colors"
                    >
                      Ver comprovante
                    </a>
                    <form action={deleteSetupComprovanteAction}>
                      <input type="hidden" name="clientId" value={client.id} />
                      <input type="hidden" name="path" value={client.setup_comprovante_path} />
                      <ConfirmButton
                        confirmText="Excluir o comprovante da implantação?"
                        className="text-xs font-medium text-[#B91C1C] hover:text-[#991B1B] transition-colors"
                      >
                        Excluir
                      </ConfirmButton>
                    </form>
                  </div>
                ) : (
                  <form
                    action={uploadSetupComprovanteAction}
                    encType="multipart/form-data"
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="clientId" value={client.id} />
                    <input
                      type="file"
                      name="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      required
                      className="text-xs text-[#71717A] file:mr-2 file:text-xs file:font-semibold file:px-2.5 file:py-1.5 file:rounded-lg file:border file:border-[#E4E4E7] file:bg-white file:text-[#18181B] hover:file:bg-[#F9FBF8] file:cursor-pointer"
                    />
                    <SubmitButton
                      pendingLabel="Enviando..."
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E4E4E7] bg-white text-[#18181B] hover:bg-[#F9FBF8] transition-colors"
                    >
                      Enviar
                    </SubmitButton>
                  </form>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#E4E4E7]">
              <form action={updateSetupPixLinkAction} className="flex items-end gap-2">
                <input type="hidden" name="clientId" value={client.id} />
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-[#52525B] mb-1">
                    Link de cobrança PIX
                  </label>
                  <input
                    name="pixLink"
                    type="text"
                    defaultValue={client.setup_pix_link ?? ""}
                    placeholder="Link ou código copia-e-cola"
                    className="w-full rounded-lg border border-[#E4E4E7] bg-white px-3 py-2 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
                  />
                </div>
                <SubmitButton
                  pendingLabel="Salvando..."
                  className="text-xs font-semibold px-3 py-2 rounded-lg border border-[#E4E4E7] bg-white text-[#18181B] hover:bg-[#F9FBF8] transition-colors"
                >
                  Salvar
                </SubmitButton>
              </form>
            </div>

            <div className="mt-4 pt-4 border-t border-[#E4E4E7]">
              <SendEmailButton
                action={sendSetupEmailAction}
                hiddenFields={{ clientId: client.id }}
                to={setupEmailPreview.to}
                subject={setupEmailPreview.subject}
                previewHtml={setupEmailPreview.html}
                blockedReason={setupEmailBlocked}
                sentAt={client.setup_email_sent_at}
                triggerLabel="Enviar cobrança por e-mail"
              />
            </div>
          </div>
          </div>
        </details>

        {/* Cobranças mensais */}
        <section className="rounded-2xl border border-[#E4E4E7] bg-white p-6 sm:p-8 mt-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#52525B] mb-4">
            Cobranças mensais
          </p>
          <p className="text-xs text-[#A1A1AA] mb-5">
            Total cobrado por ciclo = mensalidade ({currency.format(client.monthly_value)}) +
            comissão de {client.commission_pct}% sobre o valor arrecadado informado abaixo. Clique numa
            referência pra ver ou esconder os detalhes.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl border border-[#E4E4E7] px-4 py-3">
              <p className="text-[11px] font-semibold text-[#52525B] mb-1">Em aberto</p>
              <p className="text-base font-bold text-[#18181B] tabular-nums">{currency.format(openTotal)}</p>
              <p className="text-[11px] text-[#A1A1AA]">
                {openBillings.length} cobrança{openBillings.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="rounded-xl border border-[#E4E4E7] px-4 py-3">
              <p className="text-[11px] font-semibold text-[#52525B] mb-1">Atrasadas</p>
              <p
                className={`text-base font-bold tabular-nums ${overdueBillings.length > 0 ? "text-[#B91C1C]" : "text-[#18181B]"}`}
              >
                {overdueBillings.length}
              </p>
            </div>
            <div className="rounded-xl border border-[#E4E4E7] px-4 py-3">
              <p className="text-[11px] font-semibold text-[#52525B] mb-1">Recebido (histórico)</p>
              <p className="text-base font-bold text-[#18181B] tabular-nums">
                {currency.format(receivedTotal)}
              </p>
              <p className="text-[11px] text-[#A1A1AA]">
                {paidBillings.length} cobrança{paidBillings.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">{visibleBillings.map(billingCard)}</div>

          {historicalBillings.length > 0 && (
            <details className="group mt-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-[#065F46] hover:text-[#047857] transition-colors">
                <ChevronIcon />
                Ver histórico ({historicalBillings.length})
              </summary>
              <div className="flex flex-col gap-3 mt-3">{historicalBillings.map(billingCard)}</div>
            </details>
          )}
        </section>
      </div>
    </main>
  );
}
