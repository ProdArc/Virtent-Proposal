"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MovementKind } from "@/lib/cash";

interface Current {
  type: string;
  kind: string;
  q: string;
  from: string;
  to: string;
}

const FIELD =
  "w-full rounded-2xl border-0 bg-white px-4 py-2.5 text-sm text-ink shadow-card placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand/30";

export function LedgerFilters({
  current,
  kinds,
  kindLabels,
}: {
  current: Current;
  kinds: MovementKind[];
  kindLabels: Record<MovementKind, string>;
}) {
  const router = useRouter();
  const [q, setQ] = useState(current.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setQ(current.q), [current.q]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function go(patch: Partial<Current>) {
    const merged = { ...current, ...patch };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    router.push(qs ? `/financeiro/caixa/extrato?${qs}` : "/financeiro/caixa/extrato");
  }

  const chips = [
    { value: "", label: "Tudo", active: "bg-ink text-white border-ink" },
    { value: "in", label: "Entradas", active: "bg-paid-ink text-white border-paid-ink" },
    { value: "out", label: "Saídas", active: "bg-overdue-ink text-white border-overdue-ink" },
  ];

  const hasFilter = current.type || current.kind || current.q || current.from || current.to;

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="fin-scroll-x -mx-4 flex items-center gap-2 px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {chips.map((c) => (
          <button
            key={c.value || "all"}
            type="button"
            onClick={() => go({ type: c.value })}
            aria-pressed={current.type === c.value}
            className={`inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
              current.type === c.value
                ? c.active
                : "border-transparent bg-white text-muted shadow-card hover:text-ink"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          value={q}
          placeholder="Buscar por descrição ou nome"
          aria-label="Buscar movimentação"
          onChange={(e) => {
            const next = e.target.value;
            setQ(next);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => go({ q: next.trim() }), 300);
          }}
          className={FIELD}
        />

        <select
          aria-label="Filtrar por tipo de movimentação"
          value={current.kind}
          onChange={(e) => go({ kind: e.target.value })}
          className={FIELD}
        >
          <option value="">Todas as origens</option>
          {kinds.map((k) => (
            <option key={k} value={k}>
              {kindLabels[k]}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 sm:col-span-2">
          <input
            type="date"
            aria-label="De"
            value={current.from}
            onChange={(e) => go({ from: e.target.value })}
            className={`${FIELD} min-w-0 !px-3 !text-[13px]`}
          />
          <span className="text-xs text-secondary-ink">até</span>
          <input
            type="date"
            aria-label="Até"
            value={current.to}
            onChange={(e) => go({ to: e.target.value })}
            className={`${FIELD} min-w-0 !px-3 !text-[13px]`}
          />
        </div>
      </div>

      {hasFilter && (
        <button
          type="button"
          onClick={() => router.push("/financeiro/caixa/extrato")}
          className="self-start text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
