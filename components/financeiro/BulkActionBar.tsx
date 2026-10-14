"use client";

import { useState, useTransition } from "react";
import { bulkSetSegmentAction } from "@/app/financeiro/actions";
import { useBulkSelection } from "./BulkSelectionContext";

/**
 * Aparece só quando há seleção. Fica fora dos cards de propósito — pra
 * classificar vários clientes de uma vez sem precisar abrir um a um.
 */
export function BulkActionBar({
  visibleIds,
  segmentSuggestions,
}: {
  visibleIds: string[];
  segmentSuggestions: string[];
}) {
  const { selected, selectAll, clear } = useBulkSelection();
  const [segment, setSegment] = useState("");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok?: boolean; error?: string } | null>(null);

  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  function apply() {
    const ids = [...selected];
    setFeedback(null);
    startTransition(async () => {
      const result = await bulkSetSegmentAction(ids, segment);
      if (result.error) {
        setFeedback({ error: result.error });
        return;
      }
      setFeedback({ ok: true });
      setSegment("");
      clear();
    });
  }

  return (
    <div className="mb-5 hidden flex-col gap-2 sm:flex">
      <button
        type="button"
        onClick={() => (allVisibleSelected ? clear() : selectAll(visibleIds))}
        className="self-start px-1 py-1 text-xs font-semibold text-brand transition-colors hover:text-brand-hover"
      >
        {allVisibleSelected ? "Limpar seleção" : `Selecionar todos os ${visibleIds.length} visíveis`}
      </button>

      {selected.size > 0 && (
        <div className="sticky top-3 z-30 flex flex-wrap items-center gap-2 rounded-3xl bg-white px-4 py-3 shadow-float ring-1 ring-brand/25">
          <span className="text-xs font-semibold text-ink shrink-0">
            {selected.size} selecionado{selected.size === 1 ? "" : "s"}
          </span>
          <input
            type="text"
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            list="bulk-segment-suggestions"
            placeholder="Segmento pra aplicar (ex: Franquia)"
            className="min-w-[10rem] flex-1 rounded-2xl border border-hairline bg-white px-3 py-1.5 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <datalist id="bulk-segment-suggestions">
            {segmentSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={apply}
            disabled={pending || !segment.trim()}
            className="h-10 shrink-0 rounded-full bg-brand px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {pending ? "Aplicando..." : `Aplicar a ${selected.size}`}
          </button>
          <button
            type="button"
            onClick={clear}
            className="h-10 shrink-0 px-2 text-xs font-medium text-secondary-ink transition-colors hover:text-ink"
          >
            Cancelar
          </button>
        </div>
      )}

      {feedback?.error && (
        <p className="rounded-lg border border-overdue-line bg-overdue-bg px-3 py-2 text-xs text-overdue-ink">
          {feedback.error}
        </p>
      )}
      {feedback?.ok && (
        <p className="rounded-lg border border-paid-line bg-paid-bg px-3 py-2 text-xs text-paid-ink">
          Segmento atualizado.
        </p>
      )}
    </div>
  );
}
