import Link from "next/link";
import type { Tone } from "@/lib/urgency";

const VALUE_CLASS: Record<Tone, string> = {
  paid: "text-paid-ink",
  pending: "text-pending-ink",
  overdue: "text-overdue-ink",
  onboarding: "text-onboarding-ink",
  neutral: "text-ink",
};

/**
 * Card de resumo. Clicável: cada um aplica o filtro correspondente na lista
 * abaixo — é o que liga o número ao conjunto de clientes que ele representa.
 */
export function SummaryCard({
  label,
  value,
  hint,
  tone = "neutral",
  href,
  active = false,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`block rounded-xl border bg-white px-4 py-3 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
        active ? "border-brand ring-1 ring-brand/30" : "border-border hover:border-brand/40"
      }`}
    >
      <p className="text-[11px] font-semibold text-neutral-ink mb-1">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${VALUE_CLASS[tone]}`}>{value}</p>
      {hint && <p className="text-[11px] text-secondary-ink mt-0.5">{hint}</p>}
    </Link>
  );
}
