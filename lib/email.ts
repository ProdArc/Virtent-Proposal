import "server-only";
import { Resend } from "resend";
import {
  calcBillingTotal,
  downloadNfe,
  markBillingEmailSent,
  markSetupEmailSent,
  type FinancialBillingRow,
  type FinancialClientRow,
} from "@/lib/financial";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada. Veja .env.local.example.");
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

function requireFromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL não configurada. Veja .env.local.example.");
  }
  return from;
}

/** Canal de suporte citado no e-mail — mesmo endereço do remetente, extraído de "Nome <email>" ou usado puro. */
function supportEmail(): string {
  const from = process.env.RESEND_FROM_EMAIL ?? "";
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from || "contact@virtent.com.br";
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtent-proposal.vercel.app";
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthYearFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const dateFmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface EmailPreview {
  to: string;
  subject: string;
  html: string;
}

function emailShell(bodyHtml: string): string {
  const logoUrl = `${siteUrl()}/images/virtent-logo-icon.png`;
  return `<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; background:#F9FBF8; padding:32px 16px; color:#18181B;">
  <div style="max-width:480px; margin:0 auto; background:#ffffff; border:1px solid #E4E4E7; border-radius:16px; padding:32px;">
    <img src="${logoUrl}" alt="Virtent" width="40" height="40" style="display:block; margin:0 0 24px; border-radius:10px;" />
    ${bodyHtml}
  </div>
  <p style="text-align:center; font-size:11px; color:#A1A1AA; margin:20px 0 0;">Virtent · Operação virtual no WhatsApp</p>
</div>`;
}

function detailsTable(rows: [string, string][]): string {
  return `<table style="width:100%; font-size:14px; border-collapse:collapse; margin:0 0 24px;">
    ${rows
      .map(
        ([label, value]) => `<tr>
          <td style="padding:8px 0; color:#71717A; border-bottom:1px solid #F4F4F5;">${label}</td>
          <td style="padding:8px 0; text-align:right; font-weight:600; border-bottom:1px solid #F4F4F5;">${value}</td>
        </tr>`
      )
      .join("")}
  </table>`;
}

function paymentBlock(pixLink: string): string {
  const isUrl = /^https?:\/\//i.test(pixLink.trim());
  return `<div style="margin:0 0 24px;">
    <p style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#52525B; margin:0 0 8px;">Pagamento via PIX</p>
    ${
      isUrl
        ? `<a href="${escapeHtml(pixLink)}" style="display:inline-block; background:#065F46; color:#ffffff; text-decoration:none; font-size:14px; font-weight:700; padding:10px 20px; border-radius:8px;">Pagar via PIX</a>`
        : `<p style="font-size:13px; font-family:ui-monospace, monospace; background:#F4F4F5; border-radius:8px; padding:12px; word-break:break-all; margin:0; color:#18181B;">${escapeHtml(pixLink)}</p>`
    }
  </div>`;
}

function supportAndSignature(): string {
  const email = supportEmail();
  return `<p style="font-size:13px; color:#71717A; line-height:1.6; margin:0 0 24px;">
    Em caso de dúvidas, entre em contato pelo <a href="mailto:${email}" style="color:#065F46; text-decoration:none;">${email}</a>.
  </p>
  <p style="font-size:14px; line-height:1.6; color:#18181B; margin:0;">
    Atenciosamente,<br />
    <strong>Equipe Virtent</strong>
  </p>`;
}

/** Prévia da cobrança de implantação — enviada no máximo 1 vez por cliente (ver `client.setup_email_sent_at`). */
export function renderSetupEmail(client: FinancialClientRow): EmailPreview {
  const name = escapeHtml(client.name);
  const subject = `Fatura de implantação Virtent — ${client.name}`;
  const html = emailShell(`
    <p style="font-size:14px; line-height:1.6; margin:0 0 16px;">Prezado(a) <strong>${name}</strong>,</p>
    <p style="font-size:14px; line-height:1.6; margin:0 0 24px;">
      Informamos que a fatura referente à implantação da Virtent para <strong>${name}</strong> está disponível.
    </p>
    ${detailsTable([
      ["Serviço", "Implantação Virtent"],
      ["Valor", currency.format(client.setup_value)],
      ["Vencimento", client.setup_due_date ? dateFmt(client.setup_due_date) : "a combinar"],
    ])}
    ${paymentBlock(client.setup_pix_link ?? "")}
    ${supportAndSignature()}
  `);
  return { to: client.email ?? "", subject, html };
}

/** Prévia da cobrança de mensalidade de um ciclo — enviada no máximo 1 vez por referência (ver `billing.email_sent_at`). */
export function renderBillingEmail(client: FinancialClientRow, billing: FinancialBillingRow): EmailPreview {
  const name = escapeHtml(client.name);
  const { total_value } = calcBillingTotal(billing);
  const reference = capitalize(monthYearFmt.format(new Date(`${billing.due_date}T00:00:00`)));
  const subject = `Fatura de mensalidade Virtent — ${reference} — ${client.name}`;
  const html = emailShell(`
    <p style="font-size:14px; line-height:1.6; margin:0 0 16px;">Prezado(a) <strong>${name}</strong>,</p>
    <p style="font-size:14px; line-height:1.6; margin:0 0 24px;">
      Informamos que a fatura referente à mensalidade Virtent de <strong>${name}</strong>, referente a ${reference}, está disponível.
    </p>
    ${detailsTable([
      ["Serviço", "Mensalidade Virtent"],
      ["Referência", reference],
      ["Valor", currency.format(total_value)],
      ["Vencimento", dateFmt(billing.due_date)],
    ])}
    ${paymentBlock(billing.pix_link ?? "")}
    ${supportAndSignature()}
  `);
  return { to: client.email ?? "", subject, html };
}

/** Por que o botão de envio está desabilitado, ou null se está tudo pronto pra enviar. */
export function setupEmailBlockedReason(client: FinancialClientRow): string | null {
  if (!client.email) return "cadastre o e-mail da unidade";
  if (!client.setup_nfe_path) return "anexe a NFe da implantação";
  if (!client.setup_pix_link) return "informe o link de cobrança PIX da implantação";
  return null;
}

export function billingEmailBlockedReason(
  client: FinancialClientRow,
  billing: FinancialBillingRow
): string | null {
  if (!client.email) return "cadastre o e-mail da unidade";
  if (!billing.nfe_path) return "anexe a NFe desta cobrança";
  if (!billing.pix_link) return "informe o link de cobrança PIX desta cobrança";
  return null;
}

/**
 * Envia a cobrança de implantação por e-mail com a NFe em anexo, e marca
 * `setup_email_sent_at` — próxima tentativa é bloqueada (implantação é
 * cobrada 1 única vez). Revalida as mesmas condições da UI (email + NFe +
 * link PIX) server-side, não confia só no botão já estar desabilitado no
 * cliente.
 */
export async function sendSetupEmail(client: FinancialClientRow): Promise<void> {
  const blockedReason = setupEmailBlockedReason(client);
  if (blockedReason) throw new Error(`Não é possível enviar: ${blockedReason}.`);
  if (client.setup_email_sent_at) throw new Error("A cobrança de implantação já foi enviada.");

  const { to, subject, html } = renderSetupEmail(client);
  const attachment = await downloadNfe(client.setup_nfe_path!);

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: requireFromAddress(),
    to,
    subject,
    html,
    attachments: [{ filename: attachment.filename, content: attachment.content }],
  });

  if (error) {
    throw new Error(`Falha ao enviar e-mail: ${error.message}`);
  }

  await markSetupEmailSent(client.id);
}

/** Mesma lógica de `sendSetupEmail`, mas pra cobrança de mensalidade de um ciclo específico. */
export async function sendBillingEmail(
  client: FinancialClientRow,
  billing: FinancialBillingRow
): Promise<void> {
  const blockedReason = billingEmailBlockedReason(client, billing);
  if (blockedReason) throw new Error(`Não é possível enviar: ${blockedReason}.`);
  if (billing.email_sent_at) throw new Error("A cobrança desta referência já foi enviada.");

  const { to, subject, html } = renderBillingEmail(client, billing);
  const attachment = await downloadNfe(billing.nfe_path!);

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: requireFromAddress(),
    to,
    subject,
    html,
    attachments: [{ filename: attachment.filename, content: attachment.content }],
  });

  if (error) {
    throw new Error(`Falha ao enviar e-mail: ${error.message}`);
  }

  await markBillingEmailSent(billing.id);
}
