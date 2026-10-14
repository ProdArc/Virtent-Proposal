"use client";

import { useBulkSelection } from "./BulkSelectionContext";

/** Fica dentro do <summary> do ClientCard — precisa parar a propagação, senão o clique também abre/fecha o card. */
export function ClientCheckbox({ id, name }: { id: string; name: string }) {
  const { selected, toggle } = useBulkSelection();

  return (
    // O <label> amplia a área de toque (o checkbox sozinho tem 20px). Precisa
    // parar a propagação no label também, senão o clique na margem abre o card.
    <label
      onClick={(e) => e.stopPropagation()}
      className="-m-2 hidden shrink-0 cursor-pointer items-center justify-center p-2 sm:flex"
    >
      <input
        type="checkbox"
        checked={selected.has(id)}
        onChange={() => toggle(id)}
        aria-label={`Selecionar ${name}`}
        className="!min-h-0 h-5 w-5 shrink-0 cursor-pointer rounded-md border-border text-brand focus:ring-brand/30"
      />
    </label>
  );
}
