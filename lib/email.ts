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

/** "a@x.com, b@y.com; c@z.com" -> ["a@x.com", "b@y.com", "c@z.com"] — o campo aceita vírgula ou ponto-e-vírgula. */
function parseEmailList(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

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

// Aspas SIMPLES nos nomes com espaço: essas strings são interpoladas dentro de
// style="…" e uma aspa dupla aqui encerraria o atributo, quebrando o estilo
// inteiro do elemento (e todos os atributos seguintes).
const FONT_STACK = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`;
const MONO_STACK = `'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace`;

/**
 * Casca do e-mail. Montada com <table> e estilos inline de propósito: cliente
 * de e-mail (Gmail, Outlook) descarta <style> e não suporta flex/grid, então
 * layout em tabela é o único jeito confiável de manter a faixa e o card
 * inteiros em todos eles.
 *
 * `preheader` é o texto de prévia que o cliente mostra ao lado do assunto na
 * caixa de entrada — fica escondido no corpo.
 */
function emailShell(preheader: string, bodyHtml: string): string {
  const logoUrl = `${siteUrl()}/images/virtent-logo-icon.png`;
  return `<div style="background:#F1F3EF; margin:0; padding:32px 16px; font-family:${FONT_STACK}; color:#18181B;">
  <span style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; height:0; width:0;">${preheader}</span>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="width:100%; max-width:560px; margin:0 auto; background:#ffffff; border-radius:18px; overflow:hidden; border:1px solid #E1E4DD;">
    <tr>
      <td style="font-family:${FONT_STACK}; background:#0E1210; padding:26px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align:middle;" width="42">
              <img src="${logoUrl}" alt="Virtent" width="42" height="42" style="display:block; border-radius:11px;" />
            </td>
            <td style="vertical-align:middle; padding-left:14px;">
              <p style="margin:0; color:#ffffff; font-size:15px; font-weight:800; letter-spacing:0.24em; text-transform:uppercase; line-height:1.1;">Virtent</p>
              <p style="margin:4px 0 0; color:#8A938C; font-size:11.5px; line-height:1.3;">Operação virtual no WhatsApp</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="height:3px; background:#065F46; font-size:0; line-height:0;">&nbsp;</td>
    </tr>
    <tr>
      <td style="font-family:${FONT_STACK}; padding:32px;">${bodyHtml}</td>
    </tr>
    <tr>
      <td style="font-family:${FONT_STACK}; background:#F9FBF8; border-top:1px solid #E1E4DD; padding:20px 32px;">
        <p style="margin:0; font-size:11.5px; color:#71717A; line-height:1.6;">
          Este é um e-mail automático de cobrança da <strong style="color:#18181B;">Virtent</strong>.
          A nota fiscal referente a esta fatura segue em anexo.
        </p>
      </td>
    </tr>
  </table>
</div>`;
}

/** Valor em destaque — é o que o cliente procura primeiro ao abrir uma fatura. */
function amountBlock(value: string, dueLabel: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:0 0 24px;">
    <tr>
      <td style="font-family:${FONT_STACK}; background:#F0FAF6; border:1px solid #C9E9DA; border-radius:14px; padding:20px 22px;">
        <p style="margin:0 0 6px; font-size:10.5px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:#065F46;">Valor total</p>
        <p style="margin:0; font-size:30px; font-weight:800; color:#18181B; line-height:1.1; letter-spacing:-0.02em;">${value}</p>
        <p style="margin:10px 0 0; font-size:12.5px; color:#52525B; line-height:1.4;">${dueLabel}</p>
      </td>
    </tr>
  </table>`;
}

function detailsTable(rows: [string, string][]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:${FONT_STACK}; width:100%; font-size:13.5px; border-collapse:collapse; margin:0 0 26px;">
    ${rows
      .map(
        ([label, value], i) => `<tr>
          <td style="padding:11px 0; color:#71717A; ${i === 0 ? "" : "border-top:1px solid #F1F1EF;"}">${label}</td>
          <td style="padding:11px 0; text-align:right; font-weight:600; color:#18181B; ${i === 0 ? "" : "border-top:1px solid #F1F1EF;"}">${value}</td>
        </tr>`
      )
      .join("")}
  </table>`;
}

function paymentBlock(pixLink: string): string {
  const isUrl = /^https?:\/\//i.test(pixLink.trim());
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:0 0 26px;">
    <tr>
      <td style="font-family:${FONT_STACK}; border:1px solid #E1E4DD; border-radius:14px; padding:20px 22px;">
        <p style="margin:0 0 12px; font-size:10.5px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:#52525B;">Pagamento via PIX</p>
        ${
          isUrl
            ? `<a href="${escapeHtml(pixLink)}" style="display:inline-block; background:#065F46; color:#ffffff; text-decoration:none; font-size:14px; font-weight:700; padding:13px 28px; border-radius:10px;">Pagar via PIX</a>
               <p style="margin:12px 0 0; font-size:11.5px; color:#A1A1AA; line-height:1.5;">O botão abre a cobrança para pagamento.</p>`
            : `<p style="margin:0; font-size:12px; font-family:${MONO_STACK}; background:#F6F7F4; border:1px solid #E9EBE5; border-radius:10px; padding:14px; word-break:break-all; line-height:1.7; color:#18181B;">${escapeHtml(pixLink)}</p>
               <p style="margin:12px 0 0; font-size:11.5px; color:#A1A1AA; line-height:1.5;">Copie o código acima e cole na opção <strong style="color:#52525B;">PIX Copia e Cola</strong> do app do seu banco.</p>`
        }
      </td>
    </tr>
  </table>`;
}

function supportAndSignature(): string {
  const email = supportEmail();
  return `<p style="font-size:13px; color:#71717A; line-height:1.65; margin:0 0 26px;">
    Em caso de dúvidas, entre em contato pelo <a href="mailto:${email}" style="color:#065F46; text-decoration:none; font-weight:600;">${email}</a>.
  </p>
  <p style="font-size:13.5px; line-height:1.65; color:#52525B; margin:0;">
    Atenciosamente,<br />
    <strong style="color:#18181B;">Equipe Virtent</strong>
  </p>`;
}

function greeting(name: string, intro: string): string {
  return `<p style="font-size:14px; line-height:1.65; margin:0 0 14px; color:#18181B;">Prezado(a) <strong>${name}</strong>,</p>
  <p style="font-size:14px; line-height:1.65; margin:0 0 26px; color:#52525B;">${intro}</p>`;
}

/** Prévia da cobrança de implantação — enviada no máximo 1 vez por cliente (ver `client.setup_email_sent_at`). */
export function renderSetupEmail(client: FinancialClientRow): EmailPreview {
  const name = escapeHtml(client.name);
  const subject = `Fatura de implantação Virtent — ${client.name}`;
  const dueLabel = client.setup_due_date
    ? `Vencimento em <strong style="color:#18181B;">${dateFmt(client.setup_due_date)}</strong>`
    : `Vencimento <strong style="color:#18181B;">a combinar</strong>`;

  const html = emailShell(
    `Fatura de implantação · ${currency.format(client.setup_value)}`,
    `
    ${greeting(
      name,
      `Informamos que a fatura referente à implantação da Virtent para <strong style="color:#18181B;">${name}</strong> está disponível.`
    )}
    ${amountBlock(currency.format(client.setup_value), dueLabel)}
    ${detailsTable([
      ["Serviço", "Implantação Virtent"],
      ["Cobrança", "Parcela única"],
    ])}
    ${paymentBlock(client.setup_pix_link ?? "")}
    ${supportAndSignature()}
  `
  );
  return { to: parseEmailList(client.email).join(", "), subject, html };
}

/** Prévia da cobrança de mensalidade de um ciclo — enviada no máximo 1 vez por referência (ver `billing.email_sent_at`). */
export function renderBillingEmail(client: FinancialClientRow, billing: FinancialBillingRow): EmailPreview {
  const name = escapeHtml(client.name);
  const { total_value, commission_value } = calcBillingTotal(billing);
  const reference = capitalize(monthYearFmt.format(new Date(`${billing.due_date}T00:00:00`)));
  const subject = `Fatura de mensalidade Virtent — ${reference} — ${client.name}`;

  const rows: [string, string][] = [
    ["Serviço", "Mensalidade Virtent"],
    ["Referência", reference],
    ["Mensalidade", currency.format(billing.monthly_value)],
  ];
  // Só mostra a linha de comissão quando ela existe — senão vira ruído com "R$ 0,00".
  if (commission_value > 0) {
    rows.push([`Comissão (${billing.commission_pct}%)`, currency.format(commission_value)]);
  }

  const html = emailShell(
    `Fatura de ${reference} · ${currency.format(total_value)}`,
    `
    ${greeting(
      name,
      `Informamos que a fatura referente à mensalidade Virtent de <strong style="color:#18181B;">${name}</strong>, referente a ${reference}, está disponível.`
    )}
    ${amountBlock(
      currency.format(total_value),
      `Vencimento em <strong style="color:#18181B;">${dateFmt(billing.due_date)}</strong>`
    )}
    ${detailsTable(rows)}
    ${paymentBlock(billing.pix_link ?? "")}
    ${supportAndSignature()}
  `
  );
  return { to: parseEmailList(client.email).join(", "), subject, html };
}

/** Por que o botão de envio está desabilitado, ou null se está tudo pronto pra enviar. */
export function setupEmailBlockedReason(client: FinancialClientRow): string | null {
  if (parseEmailList(client.email).length === 0) return "cadastre o e-mail da unidade";
  if (!client.setup_nfe_path) return "anexe a NFe da implantação";
  if (!client.setup_pix_link) return "informe o link de cobrança PIX da implantação";
  return null;
}

export function billingEmailBlockedReason(
  client: FinancialClientRow,
  billing: FinancialBillingRow
): string | null {
  if (parseEmailList(client.email).length === 0) return "cadastre o e-mail da unidade";
  if (!billing.nfe_path) return "anexe a NFe desta cobrança";
  if (!billing.pix_link) return "informe o link de cobrança PIX desta cobrança";
  return null;
}

/**
 * Envia a cobrança de implantação por e-mail com a NFe em anexo, e marca
 * `setup_email_sent_at`. Reenviar é permitido (ex: e-mail cadastrado errado
 * na primeira vez) — a UI mostra a data do último envio e pede confirmação
 * com a prévia do destinatário antes de disparar de novo. Revalida as mesmas
 * condições da UI (email + NFe + link PIX) server-side, não confia só no
 * botão já estar desabilitado no cliente.
 */
export async function sendSetupEmail(client: FinancialClientRow): Promise<void> {
  const blockedReason = setupEmailBlockedReason(client);
  if (blockedReason) throw new Error(`Não é possível enviar: ${blockedReason}.`);

  const { subject, html } = renderSetupEmail(client);
  const attachment = await downloadNfe(client.setup_nfe_path!);

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: requireFromAddress(),
    to: parseEmailList(client.email),
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

  const { subject, html } = renderBillingEmail(client, billing);
  const attachment = await downloadNfe(billing.nfe_path!);

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: requireFromAddress(),
    to: parseEmailList(client.email),
    subject,
    html,
    attachments: [{ filename: attachment.filename, content: attachment.content }],
  });

  if (error) {
    throw new Error(`Falha ao enviar e-mail: ${error.message}`);
  }

  await markBillingEmailSent(billing.id);
}
