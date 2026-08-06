"use client";

import { useTransition } from "react";

/**
 * Ação rápida "marcar como paga" dentro do card compacto.
 *
 * É client component por um motivo concreto: o botão vive dentro do
 * <summary>, e sem stopPropagation o clique também abriria/fecharia o card.
 */
export function QuickPayButton({
  id,
  action,
  label = "Pagar",
  title,
  variant = "solid",
}: {
  id: string;
  action: (id: string) => Promise<void>;
  label?: string;
  title?: string;
  variant?: "solid" | "ghost";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title={title}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(() => {
          void action(id);
        });
      }}
      className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
        variant === "solid"
          ? "bg-brand text-white hover:bg-brand-hover"
          : "border border-border bg-white text-neutral-ink hover:text-ink"
      }`}
    >
      {pending ? "..." : label}
    </button>
  );
}
