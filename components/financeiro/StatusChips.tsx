import Link from "next/link";
import { FILTER_LABEL, type StatusFilter } from "@/lib/financeiro-status";

const ORDER: StatusFilter[] = ["", "urgent", "overdue", "upcoming", "ok"];

const ACTIVE_CLASS: Record<StatusFilter, string> = {
  "": "bg-ink text-white border-ink",
  urgent: "bg-overdue-ink text-white border-overdue-ink",
  overdue: "bg-overdue-ink text-white border-overdue-ink",
  upcoming: "bg-pending-ink text-white border-pending-ink",
  ok: "bg-paid-ink text-white border-paid-ink",
};

/**
 * Filtro rápido por status. São links (não JS) pra manter a lista renderizada
 * no servidor e o filtro compartilhável pela URL. Preserva a busca ativa.
 */
export function StatusChips({
  active,
  counts,
  search,
  reference,
  view,
}: {
  active: StatusFilter;
  counts: Record<StatusFilter, number>;
  search: string;
  reference?: string;
  view?: string;
}) {
  const hrefFor = (filter: StatusFilter) => {
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    if (search) params.set("q", search);
    if (reference) params.set("ref", reference);
    if (view) params.set("view", view);
    const query = params.toString();
    return query ? `/financeiro?${query}` : "/financeiro";
  };

  return (
    <div className="fin-scroll-x -mx-4 flex items-center gap-2 px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {ORDER.map((filter) => {
        const isActive = filter === active;
        return (
          <Link
            key={filter || "all"}
            href={hrefFor(filter)}
            aria-current={isActive ? "true" : undefined}
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
              isActive
                ? ACTIVE_CLASS[filter]
                : "border-transparent bg-white text-muted shadow-card hover:text-ink"
            }`}
          >
            {FILTER_LABEL[filter]}
            <span className={`tabular-nums ${isActive ? "opacity-80" : "text-secondary-ink"}`}>
              {counts[filter]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
