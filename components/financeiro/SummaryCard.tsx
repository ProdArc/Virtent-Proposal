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
  className = "",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  href: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`${className} block rounded-3xl bg-white px-4 py-4 shadow-card transition-[box-shadow,transform] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
        active ? "ring-2 ring-brand/60" : "hover:shadow-float"
      }`}
    >
      <p className="mb-1 text-xs font-medium text-secondary-ink">{label}</p>
      <p className={`text-xl font-extrabold tracking-tight tabular-nums ${VALUE_CLASS[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11.5px] text-secondary-ink">{hint}</p>}
    </Link>
  );
}
