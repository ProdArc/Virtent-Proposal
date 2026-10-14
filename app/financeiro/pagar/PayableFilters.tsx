"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PayableFilter } from "@/lib/payables-status";

const ORDER: PayableFilter[] = ["", "urgent", "overdue", "upcoming", "paid"];

const ACTIVE_CLASS: Record<PayableFilter, string> = {
  "": "bg-ink text-white border-ink",
  urgent: "bg-overdue-ink text-white border-overdue-ink",
  overdue: "bg-overdue-ink text-white border-overdue-ink",
  upcoming: "bg-pending-ink text-white border-pending-ink",
  paid: "bg-paid-ink text-white border-paid-ink",
};

interface Current {
  q: string;
  supplier: string;
  category: string;
  from: string;
  to: string;
}

/**
 * Filtros combinados: status + fornecedor + categoria + período + busca, todos
 * na mesma query string, então valem ao mesmo tempo e a URL é compartilhável.
 */
export function PayableFilters({
  active,
  counts,
  labels,
  suppliers,
  categories,
  current,
}: {
  active: PayableFilter;
  counts: Record<PayableFilter, number>;
  labels: Record<PayableFilter, string>;
  suppliers: { id: string; name: string }[];
  categories: { id: string; name: string; archived: boolean }[];
  current: Current;
}) {
  const router = useRouter();
  const [q, setQ] = useState(current.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setQ(current.q), [current.q]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function urlWith(patch: Partial<Current & { status: PayableFilter }>) {
    const merged = { status: active, ...current, ...patch };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, String(v));
    const qs = params.toString();
    return qs ? `/financeiro/pagar?${qs}` : "/financeiro/pagar";
  }

  const go = (patch: Partial<Current & { status: PayableFilter }>) => router.push(urlWith(patch));

  const hasExtra = current.supplier || current.category || current.from || current.to || current.q;

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="fin-scroll-x -mx-4 flex items-center gap-2 px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {ORDER.map((filter) => {
          const isActive = filter === active;
          return (
            <button
              key={filter || "all"}
              type="button"
              onClick={() => go({ status: filter })}
              aria-pressed={isActive}
              className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                isActive
                  ? ACTIVE_CLASS[filter]
                  : "border-transparent bg-white text-muted shadow-card hover:text-ink"
              }`}
            >
              {labels[filter]}
              <span className={`tabular-nums ${isActive ? "opacity-80" : "text-secondary-ink"}`}>
                {counts[filter]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <input
            type="search"
            value={q}
            placeholder="Buscar por fornecedor, título ou categoria"
            aria-label="Buscar conta"
            onChange={(e) => {
              const next = e.target.value;
              setQ(next);
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => go({ q: next.trim() }), 300);
            }}
            className="w-full w-full rounded-2xl border-0 bg-white px-4 py-2.5 text-sm text-ink shadow-card placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        <select
          aria-label="Filtrar por fornecedor"
          value={current.supplier}
          onChange={(e) => go({ supplier: e.target.value })}
          className="w-full rounded-2xl border-0 bg-white px-4 py-2.5 text-sm text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">Todos os fornecedores</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por categoria"
          value={current.category}
          onChange={(e) => go({ category: e.target.value })}
          className="w-full rounded-2xl border-0 bg-white px-4 py-2.5 text-sm text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.archived ? " (arquivada)" : ""}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label="Vencimento a partir de"
            value={current.from}
            onChange={(e) => go({ from: e.target.value })}
            className="w-full min-w-0 rounded-2xl border-0 bg-white px-3 py-2.5 text-[13px] text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <span className="text-xs text-secondary-ink">até</span>
          <input
            type="date"
            aria-label="Vencimento até"
            value={current.to}
            onChange={(e) => go({ to: e.target.value })}
            className="w-full min-w-0 rounded-2xl border-0 bg-white px-3 py-2.5 text-[13px] text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
      </div>

      {hasExtra && (
        <button
          type="button"
          onClick={() => router.push("/financeiro/pagar")}
          className="self-start text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
