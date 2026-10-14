"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Tone } from "@/lib/urgency";

export interface CycleTab {
  key: string;
  /** "Out/26" */
  label: string;
  tone: Tone;
  /** "Paga", "Atrasada"... — aparece embaixo do mês. */
  hint: string;
}

// Escritas por extenso: o Tailwind precisa ver a string inteira no código-fonte.
const IDLE: Record<Tone, string> = {
  paid: "bg-paid-bg text-paid-ink",
  pending: "bg-pending-bg text-pending-ink",
  overdue: "bg-overdue-bg text-overdue-ink",
  onboarding: "bg-onboarding-bg text-onboarding-ink",
  neutral: "bg-neutral-bg text-neutral-ink",
};

const SELECTED: Record<Tone, string> = {
  paid: "bg-paid-ink text-white shadow-card",
  pending: "bg-pending-ink text-white shadow-card",
  overdue: "bg-overdue-ink text-white shadow-card",
  onboarding: "bg-onboarding-ink text-white shadow-card",
  neutral: "bg-ink text-white shadow-card",
};

/**
 * Faixa de meses + só o ciclo escolhido embaixo. Evita a pilha de cobranças
 * que obrigava a rolar a página pra achar uma referência: cada mês é um chip
 * colorido pelo status (dá pra ver o histórico inteiro de relance) e a troca é
 * instantânea — os painéis já vêm renderizados pelo servidor.
 */
export function CycleSwitcher({
  tabs,
  initial,
  panels,
}: {
  tabs: CycleTab[];
  initial: string;
  panels: Record<string, ReactNode>;
}) {
  const [selected, setSelected] = useState(initial);
  const stripRef = useRef<HTMLDivElement>(null);

  // Centraliza o mês selecionado na faixa (só rola a faixa, nunca a página).
  useEffect(() => {
    const strip = stripRef.current;
    const el = strip?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!strip || !el) return;
    strip.scrollTo({
      left: el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2,
      behavior: "smooth",
    });
  }, [selected]);

  if (tabs.length === 0) {
    return <p className="text-sm text-[#71717A]">Nenhuma referência gerada ainda.</p>;
  }

  return (
    <div>
      <div
        ref={stripRef}
        role="tablist"
        aria-label="Referências de cobrança"
        className="fin-scroll-x -mx-1 mb-4 flex gap-2 px-1 pb-1"
      >
        {tabs.map((t) => {
          const isSelected = t.key === selected;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelected(t.key)}
              className={`flex h-14 min-w-[4.75rem] shrink-0 flex-col items-center justify-center rounded-2xl px-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
                isSelected ? SELECTED[t.tone] : IDLE[t.tone]
              }`}
            >
              <span className="text-[13px] font-bold leading-tight">{t.label}</span>
              <span className="text-[10.5px] font-medium leading-tight opacity-90">{t.hint}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel">{panels[selected]}</div>
    </div>
  );
}
