/**
 * Formas de cobrança de um cliente. Fica fora de lib/financial.ts (que é
 * server-only) pra poder ser usado também nos formulários client-side.
 *
 * As formas combinam: um cliente pode ter mensalidade fixa + % sobre a
 * arrecadação (vão juntos no mesmo boleto, `kind = "monthly"`) e, à parte, o
 * repasse Meta (boleto separado, `kind = "meta"`).
 */

export type BillingKind = "monthly" | "meta";

export const BILLING_KIND_LABEL: Record<BillingKind, string> = {
  monthly: "Mensalidade",
  meta: "Repasse Meta",
};

export interface BillingMethodsConfig {
  bill_fixed: boolean;
  bill_commission: boolean;
  bill_meta: boolean;
  monthly_value: number;
  commission_pct: number;
  meta_fee_per_dispatch: number;
}

export interface BillingMethodTag {
  key: "fixed" | "commission" | "meta";
  /** Rótulo curto, pra chip em lista. */
  short: string;
  /** Rótulo com o valor, pra tela do cliente. */
  label: string;
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
// O adicional por disparo é fração de centavo (R$ 0,005): currency padrão arredondaria pra R$ 0,01.
const feeCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});
const pctFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function formatFee(value: number): string {
  return feeCurrency.format(value);
}

export function billingMethodTags(c: BillingMethodsConfig): BillingMethodTag[] {
  const tags: BillingMethodTag[] = [];
  if (c.bill_fixed) {
    tags.push({
      key: "fixed",
      short: "Fixo",
      label: `Mensalidade fixa · ${currency.format(Number(c.monthly_value))}`,
    });
  }
  if (c.bill_commission) {
    const pct = `${pctFmt.format(Number(c.commission_pct))}%`;
    tags.push({ key: "commission", short: pct, label: `${pct} sobre a arrecadação` });
  }
  if (c.bill_meta) {
    tags.push({
      key: "meta",
      short: "Meta",
      label: `Repasse Meta + ${formatFee(Number(c.meta_fee_per_dispatch))}/disparo`,
    });
  }
  return tags;
}

/** O boleto de mensalidade (kind "monthly") só existe se houver fixo ou %. */
export function hasMonthlyBilling(c: Pick<BillingMethodsConfig, "bill_fixed" | "bill_commission">): boolean {
  return c.bill_fixed || c.bill_commission;
}

export function billingKindOf(b: { kind?: BillingKind | null }): BillingKind {
  // Linhas anteriores à migration 011 não têm `kind`: eram todas mensalidade.
  return b.kind ?? "monthly";
}

/**
 * Número decimal "simples" (sem separador de milhar): aceita "0,005", "0.005",
 * "5,5" e "5.5". Diferente de `parseDecimalInput`, que trata "." como milhar
 * (formato do CurrencyInput) — usar aquele em `<input type="number">` faz
 * "5.5" virar 55.
 */
export function parsePlainDecimal(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/** Quantidade inteira digitada com ou sem separador de milhar ("100.000" / "100000"). */
export function parseIntegerInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return null;
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}
