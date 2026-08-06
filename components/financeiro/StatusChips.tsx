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
}: {
  active: StatusFilter;
  counts: Record<StatusFilter, number>;
  search: string;
}) {
  const hrefFor = (filter: StatusFilter) => {
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    if (search) params.set("q", search);
    const query = params.toString();
    return query ? `/financeiro?${query}` : "/financeiro";
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ORDER.map((filter) => {
        const isActive = filter === active;
        return (
          <Link
            key={filter || "all"}
            href={hrefFor(filter)}
            aria-current={isActive ? "true" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
              isActive
                ? ACTIVE_CLASS[filter]
                : "border-border bg-white text-neutral-ink hover:border-brand/40 hover:text-ink"
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
