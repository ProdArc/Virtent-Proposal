"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface BulkSelectionValue {
  selected: Set<string>;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
}

const BulkSelectionContext = createContext<BulkSelectionValue | null>(null);

/**
 * Seleção compartilhada entre os checkboxes de cada ClientCard e a barra de
 * ação em massa — os cards continuam sendo Server Components (renderizados
 * inteiros no servidor), só o checkbox em si é um Client Component que lê
 * este contexto.
 */
export function BulkSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const value = useMemo<BulkSelectionValue>(
    () => ({
      selected,
      toggle: (id) =>
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      selectAll: (ids) => setSelected(new Set(ids)),
      clear: () => setSelected(new Set()),
    }),
    [selected]
  );

  return <BulkSelectionContext.Provider value={value}>{children}</BulkSelectionContext.Provider>;
}

export function useBulkSelection(): BulkSelectionValue {
  const ctx = useContext(BulkSelectionContext);
  if (!ctx) throw new Error("useBulkSelection precisa estar dentro de um BulkSelectionProvider.");
  return ctx;
}
