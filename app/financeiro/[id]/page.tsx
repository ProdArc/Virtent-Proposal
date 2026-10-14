import { notFound } from "next/navigation";
import {
  calcBillingTotal,
  distinctSegments,
  ensureCurrentBilling,
  getComprovanteSignedUrl,
  getFinancialClient,
  getNfeSignedUrl,
  listBillingsForClient,
  listFinancialClients,
  nextCycleDueDate,
  type FinancialBillingRow,
} from "@/lib/financial";
import { billingEmailBlockedReason, renderBillingEmail, renderSetupEmail, setupEmailBlockedReason } from "@/lib/email";
import { billingKindOf, billingMethodTags, formatFee, hasMonthlyBilling } from "@/lib/billing-methods";
import { CycleSwitcher, type CycleTab } from "@/components/financeiro/CycleSwitcher";
import type { Tone } from "@/lib/urgency";
import { EditClientForm } from "./EditClientForm";
import { ConfirmButton } from "./ConfirmButton";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { SendEmailButton } from "@/components/ui/SendEmailButton";
import { PageHeader } from "@/components/financeiro/ui";
import {
  deleteBillingAction,
  deleteBillingComprovanteAction,
  deleteClientAction,
  deleteNfeAction,
  deleteSetupComprovanteAction,
  deleteSetupNfeAction,
  generateNextBillingAction,
  sendBillingEmailAction,
  sendSetupEmailAction,
  setClientCanceledAction,
  toggleBillingPaidAction,
  toggleSetupPaidAction,
  updateBillingMetaAction,
  updateBillingMonthlyValueAction,
  updateBillingPixLinkAction,
  updateBillingRevenueAction,
  updateSetupPixLinkAction,
  uploadBillingComprovanteAction,
  uploadNfeAction,
  uploadSetupComprovanteAction,
  uploadSetupNfeAction,
} from "./actions";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const intFmt = new Intl.NumberFormat("pt-BR");
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { id } = await params;
  const { ref } = await searchParams;

  const clientRow = await getFinancialClient(id);
  if (!clientRow) notFound();
  const client = clientRow;

  await ensureCurrentBilling(client);
  const billings = await listBillingsForClient(id);

  let segmentSuggestions: string[] = [];
  try {
    segmentSuggestions = distinctSegments(await listFinancialClients());
  } catch {
    segmentSuggestions = [];
  }

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

  // Ciclo que o botão "Gerar próxima mensalidade" criaria — além do que
  // ensureCurrentBilling já adianta automaticamente, pra quando o usuário
  // quer forçar a mão (ver lib/financial.ts).
  const lastDueDate = billings.reduce(
    (latest, b) => (b.due_date > latest ? b.due_date : latest),
    client.first_billing_date
  );
  const nextCycleDate =
    billings.length === 0 ? client.first_billing_date : nextCycleDueDate(lastDueDate, client.due_day);
  const nextCycleAlreadyExists = billings.some((b) => b.due_date.slice(0, 7) === nextCycleDate.slice(0, 7));

  const methodTags = billingMethodTags(client);
  const hasMetaBillings = billings.some((b) => billingKindOf(b) === "meta");

  function billingCard(b: FinancialBillingRow) {
    const { commission_value, meta_fee_value, pass_through_value, total_value } = calcBillingTotal(b);
    const isMeta = billingKindOf(b) === "meta";
    // Valor arrecadado só importa pra quem cobra % — em cliente de valor fixo vira ruído.
    const showRevenue = Number(b.commission_pct) > 0 || Number(b.revenue_amount) > 0;
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
        open
        className="group rounded-2xl border border-hairline bg-white overflow-hidden open:shadow-sm transition-shadow"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 select-none hover:bg-[#F9FBF8] transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <ChevronIcon />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-[15px] font-semibold text-[#18181B]">{cycleLabel(b.due_date)}</p>
                {isMeta ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F3FF] text-[#6D28D9] shrink-0">
                    Repasse Meta
                  </span>
                ) : (
                  hasMetaBillings && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F4F4F5] text-[#52525B] shrink-0">
                      Mensalidade
                    </span>
                  )
                )}
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
          {future && (
            <p className="mt-1 mb-3 rounded-lg bg-[#FFF7ED] px-3 py-2 text-xs text-[#B45309]">
              Ciclo futuro ({cycleLabel(b.due_date)}). O que for lançado aqui entra no faturamento
              de {cycleLabel(b.due_date).toLowerCase()}, não no do mês atual.
            </p>
          )}
          <div className="border-t border-[#E4E4E7] pt-4 flex flex-wrap items-end gap-3 mb-4">
            {isMeta ? (
              <>
                <form action={updateBillingMetaAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="billingId" value={b.id} />
                  <input type="hidden" name="clientId" value={client.id} />
                  <div>
                    <label className="block text-[11px] font-semibold text-[#52525B] mb-1">
                      Contatos disparados
                    </label>
                    <input
                      name="metaDispatches"
                      type="text"
                      inputMode="numeric"
                      defaultValue={b.meta_dispatches ? intFmt.format(b.meta_dispatches) : ""}
                      placeholder="Ex: 100.000"
                      className="w-36 rounded-lg border border-[#E4E4E7] bg-white px-3 py-2 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#52525B] mb-1">
                      Custo Meta no mês
                    </label>
                    <CurrencyInput name="metaCost" defaultValue={b.meta_cost} className="w-36" />
                  </div>
                  <SubmitButton
                    pendingLabel="Salvando..."
                    className="text-xs font-semibold px-4 py-1.5 rounded-full border border-[#E4E4E7] text-[#18181B] hover:bg-[#F9FBF8] transition-colors min-h-10"
                  >
                    Salvar
                  </SubmitButton>
                </form>

                <div className="text-xs text-[#71717A] ml-auto text-right">
                  <p>
                    Custo Meta {currency.format(pass_through_value)} · {intFmt.format(b.meta_dispatches)}{" "}
                    disparos × {formatFee(b.meta_fee_per_dispatch)} = {currency.format(meta_fee_value)}
                  </p>
                  <p className="font-semibold text-[#18181B] tabular-nums">
                    Total a cobrar: {currency.format(total_value)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <form action={updateBillingMonthlyValueAction} className="flex items-end gap-2">
                  <input type="hidden" name="billingId" value={b.id} />
                  <input type="hidden" name="clientId" value={client.id} />
                  <div>
                    <label className="block text-[11px] font-semibold text-[#52525B] mb-1">
                      Mensalidade deste ciclo
                    </label>
                    <CurrencyInput name="monthlyValue" defaultValue={b.monthly_value} className="w-36" />
                  </div>
                  <SubmitButton
                    pendingLabel="Salvando..."
                    className="text-xs font-semibold px-4 py-1.5 rounded-full border border-[#E4E4E7] text-[#18181B] hover:bg-[#F9FBF8] transition-colors min-h-10"
                  >
                    Salvar
                  </SubmitButton>
                </form>

                {showRevenue && (
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
                      className="text-xs font-semibold px-4 py-1.5 rounded-full border border-[#E4E4E7] text-[#18181B] hover:bg-[#F9FBF8] transition-colors min-h-10"
                    >
                      Salvar
                    </SubmitButton>
                  </form>
                )}

                <div className="text-xs text-[#71717A] ml-auto text-right">
                  <p>
                    Mensalidade {currency.format(b.monthly_value)}
                    {showRevenue && (
                      <>
                        {" "}
                        · comissão {b.commission_pct}% = {currency.format(commission_value)}
                      </>
                    )}
                  </p>
                  <p className="font-semibold text-[#18181B] tabular-nums">
                    Total a cobrar: {currency.format(total_value)}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <form action={toggleBillingPaidAction}>
              <input type="hidden" name="billingId" value={b.id} />
              <input type="hidden" name="clientId" value={client.id} />
              <input type="hidden" name="paid" value={(!b.paid).toString()} />
              <SubmitButton
                pendingLabel="Salvando..."
                className="text-xs font-semibold px-4 py-1.5 rounded-full bg-[#065F46] text-white hover:bg-[#047857] transition-colors min-h-10"
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

          <div className="rounded-2xl bg-[#F6F8F5] p-4">
            <p className="text-xs font-semibold text-[#71717A] mb-3">
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
                      className="text-xs text-[#71717A] file:mr-2 file:text-xs file:font-semibold file:px-2.5 file:py-1.5 file:rounded-full file:border file:border-[#E4E4E7] file:bg-white file:text-[#18181B] hover:file:bg-[#F9FBF8] file:cursor-pointer min-h-10"
                    />
                    <SubmitButton
                      pendingLabel="Enviando..."
                      className="text-xs font-semibold px-4 py-1.5 rounded-full border border-[#E4E4E7] bg-white text-[#18181B] hover:bg-[#F9FBF8] transition-colors min-h-10"
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
                      className="text-xs text-[#71717A] file:mr-2 file:text-xs file:font-semibold file:px-2.5 file:py-1.5 file:rounded-full file:border file:border-[#E4E4E7] file:bg-white file:text-[#18181B] hover:file:bg-[#F9FBF8] file:cursor-pointer min-h-10"
                    />
                    <SubmitButton
                      pendingLabel="Enviando..."
                      className="text-xs font-semibold px-4 py-1.5 rounded-full border border-[#E4E4E7] bg-white text-[#18181B] hover:bg-[#F9FBF8] transition-colors min-h-10"
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
                  className="text-xs font-semibold px-4 py-2 rounded-full border border-[#E4E4E7] bg-white text-[#18181B] hover:bg-[#F9FBF8] transition-colors min-h-10"
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

  // Faixa de meses: um chip por referência, na ordem do tempo. Quando o mês tem
  // mensalidade + repasse Meta, vale o estado que mais pede ação.
  const monthKeys = [...new Set(billings.map((b) => b.due_date.slice(0, 7)))].sort();
  const cycleState = (b: FinancialBillingRow): "overdue" | "pending" | "future" | "paid" =>
    b.paid ? "paid" : isOverdue(b, todayIso) ? "overdue" : isFuture(b, todayIso) ? "future" : "pending";
  const STATE_RANK = ["overdue", "pending", "future", "paid"] as const;
  const STATE_TONE: Record<(typeof STATE_RANK)[number], Tone> = {
    overdue: "overdue",
    pending: "pending",
    future: "neutral",
    paid: "paid",
  };
  const STATE_HINT: Record<(typeof STATE_RANK)[number], string> = {
    overdue: "Atrasada",
    pending: "Pendente",
    future: "Futura",
    paid: "Paga",
  };
  const monthShort = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });

  const cycleTabs: CycleTab[] = monthKeys.map((key) => {
    const rows = billings.filter((b) => b.due_date.slice(0, 7) === key);
    const states = rows.map(cycleState);
    const worst = STATE_RANK.find((st) => states.includes(st)) ?? "paid";
    return {
      key,
      label: capitalize(monthShort.format(new Date(`${key}-01T00:00:00`)).replace(".", "")),
      tone: STATE_TONE[worst],
      hint: STATE_HINT[worst],
    };
  });

  const cyclePanels: Record<string, React.ReactNode> = {};
  for (const key of monthKeys) {
    cyclePanels[key] = (
      <div className="flex flex-col gap-3">
        {billings.filter((b) => b.due_date.slice(0, 7) === key).map(billingCard)}
      </div>
    );
  }

  // Mês aberto de início: o da URL (?ref=2026-10), senão o ciclo atual, senão
  // a pendência mais antiga, senão o último gerado.
  const currentKey = todayIso.slice(0, 7);
  const firstUnpaidKey = cycleTabs.find((t) => t.tone !== "paid")?.key;
  const initialCycle =
    ref && monthKeys.includes(ref)
      ? ref
      : monthKeys.includes(currentKey)
        ? currentKey
        : (firstUnpaidKey ?? monthKeys[monthKeys.length - 1] ?? "");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: "/financeiro", label: "Voltar para A receber" }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {client.name}
            {client.canceled_at && (
              <span className="rounded-full bg-[#F4F4F5] px-2.5 py-0.5 text-xs font-semibold text-[#71717A]">
                Cancelado
              </span>
            )}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap gap-x-3 gap-y-0.5">
            {client.cnpj && <span>CNPJ {client.cnpj}</span>}
            {client.email && <span className="break-all">{client.email}</span>}
            {client.segment && <span>{client.segment}</span>}
          </span>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {methodTags.map((t) => (
          <span
            key={t.key}
            className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${t.key === "meta" ? "bg-[#F5F3FF] text-[#6D28D9]" : "bg-[#ECFDF5] text-[#065F46]"}`}
          >
            {t.label}
          </span>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-x-5">
        <form action={setClientCanceledAction}>
          <input type="hidden" name="id" value={client.id} />
          <input type="hidden" name="canceled" value={(!client.canceled_at).toString()} />
          <ConfirmButton
            confirmText={
              client.canceled_at
                ? `Reativar "${client.name}"? A geração automática de mensalidade volta a valer a partir de agora.`
                : `Cancelar "${client.name}"? Para de gerar mensalidade nova (automática ou manual), mas o histórico e o que já está em aberto continuam intactos.`
            }
            className="min-h-10 text-sm font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
          >
            {client.canceled_at ? "Reativar cliente" : "Cancelar cliente"}
          </ConfirmButton>
        </form>
        <form action={deleteClientAction}>
          <input type="hidden" name="id" value={client.id} />
          <ConfirmButton
            confirmText={`Excluir "${client.name}" e todas as cobranças associadas? Essa ação não pode ser desfeita.`}
            className="min-h-10 text-sm font-medium text-[#B91C1C] transition-colors hover:text-[#991B1B]"
          >
            Excluir cliente
          </ConfirmButton>
        </form>
      </div>

        <EditClientForm client={client} segmentSuggestions={segmentSuggestions} />

        {/* Implantação */}
        <details
          open={!client.setup_paid}
          className="group rounded-3xl bg-white shadow-card mt-8 overflow-hidden"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-6 sm:p-8 select-none hover:bg-[#F9FBF8] transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <ChevronIcon />
              <div className="min-w-0">
                <p className="text-[15px] font-bold tracking-tight text-[#18181B] mb-1">
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
                className="text-sm font-semibold px-4 py-1.5 rounded-full border border-[#E4E4E7] text-[#18181B] hover:bg-[#F9FBF8] transition-colors min-h-10"
              >
                {client.setup_paid ? "Desfazer baixa" : "Dar baixa"}
              </SubmitButton>
            </form>

          <div className="mt-4 rounded-2xl bg-[#F6F8F5] p-4">
            <p className="text-xs font-semibold text-[#71717A] mb-3">
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
                      className="text-xs text-[#71717A] file:mr-2 file:text-xs file:font-semibold file:px-2.5 file:py-1.5 file:rounded-full file:border file:border-[#E4E4E7] file:bg-white file:text-[#18181B] hover:file:bg-[#F9FBF8] file:cursor-pointer min-h-10"
                    />
                    <SubmitButton
                      pendingLabel="Enviando..."
                      className="text-xs font-semibold px-4 py-1.5 rounded-full border border-[#E4E4E7] bg-white text-[#18181B] hover:bg-[#F9FBF8] transition-colors min-h-10"
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
                      className="text-xs text-[#71717A] file:mr-2 file:text-xs file:font-semibold file:px-2.5 file:py-1.5 file:rounded-full file:border file:border-[#E4E4E7] file:bg-white file:text-[#18181B] hover:file:bg-[#F9FBF8] file:cursor-pointer min-h-10"
                    />
                    <SubmitButton
                      pendingLabel="Enviando..."
                      className="text-xs font-semibold px-4 py-1.5 rounded-full border border-[#E4E4E7] bg-white text-[#18181B] hover:bg-[#F9FBF8] transition-colors min-h-10"
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
                  className="text-xs font-semibold px-4 py-2 rounded-full border border-[#E4E4E7] bg-white text-[#18181B] hover:bg-[#F9FBF8] transition-colors min-h-10"
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
        <section className="rounded-3xl bg-white shadow-card p-6 sm:p-8 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-[15px] font-bold tracking-tight text-[#18181B]">
              Cobranças mensais
            </p>
            {client.canceled_at ? (
              <span className="text-xs text-[#A1A1AA]">Cliente cancelado — sem geração de ciclo novo</span>
            ) : nextCycleAlreadyExists ? (
              <span className="text-xs text-[#A1A1AA]">
                {cycleLabel(nextCycleDate)} já foi gerada
              </span>
            ) : (
              <form action={generateNextBillingAction}>
                <input type="hidden" name="clientId" value={client.id} />
                <button
                  type="submit"
                  className="text-xs font-semibold px-4 py-1.5 rounded-full border border-[#E4E4E7] text-[#18181B] hover:bg-[#F9FBF8] transition-colors min-h-10"
                >
                  Gerar {cycleLabel(nextCycleDate)}
                </button>
              </form>
            )}
          </div>
          <div className="text-xs text-[#A1A1AA] mb-5 space-y-0.5">
            {hasMonthlyBilling(client) && (
              <p>
                Mensalidade por ciclo ={" "}
                {[
                  client.bill_fixed && `valor fixo (${currency.format(client.monthly_value)})`,
                  client.bill_commission &&
                    `${client.commission_pct}% sobre o valor arrecadado informado no ciclo`,
                ]
                  .filter(Boolean)
                  .join(" + ")}
                .
              </p>
            )}
            {client.bill_meta && (
              <p>
                Repasse Meta (boleto separado) = custo da Meta no mês +{" "}
                {formatFee(client.meta_fee_per_dispatch)} por contato disparado.
              </p>
            )}
            <p>Escolha o mês abaixo pra ver ou editar aquela cobrança.</p>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl bg-[#F6F8F5] px-3 py-3 sm:px-4">
              <p className="text-[11px] font-semibold text-[#52525B] mb-1">Em aberto</p>
              <p className="text-[13px] font-bold sm:text-base text-[#18181B] tabular-nums">{currency.format(openTotal)}</p>
              <p className="text-[11px] text-[#A1A1AA]">
                {openBillings.length} cobrança{openBillings.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="rounded-2xl bg-[#F6F8F5] px-3 py-3 sm:px-4">
              <p className="text-[11px] font-semibold text-[#52525B] mb-1">Atrasadas</p>
              <p
                className={`text-[13px] font-bold sm:text-base tabular-nums ${overdueBillings.length > 0 ? "text-[#B91C1C]" : "text-[#18181B]"}`}
              >
                {overdueBillings.length}
              </p>
            </div>
            <div className="rounded-2xl bg-[#F6F8F5] px-3 py-3 sm:px-4">
              <p className="text-[11px] font-semibold text-[#52525B] mb-1">Recebido</p>
              <p className="text-[13px] font-bold sm:text-base text-[#18181B] tabular-nums">
                {currency.format(receivedTotal)}
              </p>
              <p className="text-[11px] text-[#A1A1AA]">
                {paidBillings.length} cobrança{paidBillings.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <CycleSwitcher tabs={cycleTabs} initial={initialCycle} panels={cyclePanels} />
        </section>
    </div>
  );
}
