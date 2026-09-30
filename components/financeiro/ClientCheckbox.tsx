"use client";

import { useBulkSelection } from "./BulkSelectionContext";

/** Fica dentro do <summary> do ClientCard — precisa parar a propagação, senão o clique também abre/fecha o card. */
export function ClientCheckbox({ id, name }: { id: string; name: string }) {
  const { selected, toggle } = useBulkSelection();

  return (
    <input
      type="checkbox"
      checked={selected.has(id)}
      onChange={() => toggle(id)}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Selecionar ${name}`}
      className="h-4 w-4 shrink-0 rounded border-border text-brand focus:ring-brand/30"
    />
  );
}
