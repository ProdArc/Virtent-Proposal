import {
  GROUP_HINT,
  GROUP_LABEL,
  GROUP_TONE,
  type Tone,
  type UrgencyGroup,
} from "@/lib/urgency";

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
    <div className="flex items-center gap-2.5 px-1 pb-2.5 pt-7 first:pt-0">
      <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_CLASS[tone]}`} />
      <h2 className="text-[15px] font-bold tracking-tight text-ink">{GROUP_LABEL[group]}</h2>
      <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted shadow-card">
        {count}
      </span>
      <span className="hidden truncate text-xs text-secondary-ink sm:inline">{GROUP_HINT[group]}</span>
    </div>
  );
}
