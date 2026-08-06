import {
  GROUP_HINT,
  GROUP_LABEL,
  GROUP_TONE,
  type Tone,
  type UrgencyGroup,
} from "@/lib/financeiro-status";

const DOT_CLASS: Record<Tone, string> = {
  paid: "bg-paid-ink",
  pending: "bg-pending-ink",
  overdue: "bg-overdue-ink",
  onboarding: "bg-onboarding-ink",
  neutral: "bg-neutral-ink",
};

/** Separador entre as faixas de urgência da lista. */
export function UrgencyGroupHeader({ group, count }: { group: UrgencyGroup; count: number }) {
  const tone = GROUP_TONE[group];
  return (
    <div className="flex items-baseline gap-2.5 px-1 pt-6 pb-2 first:pt-0">
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${DOT_CLASS[tone]}`} />
      <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-ink">
        {GROUP_LABEL[group]}
      </h2>
      <span className="text-[11px] font-semibold text-neutral-ink tabular-nums">({count})</span>
      <span className="hidden sm:inline text-[11px] text-secondary-ink">{GROUP_HINT[group]}</span>
    </div>
  );
}
