"use client";

import { useEffect, useState } from "react";

// Mesma ordem de app/page.tsx — mantenha sincronizado ao adicionar/remover seções.
const SECTION_IDS = [
  "hero",
  "sobre",
  "origem",
  "problema",
  "solucao",
  "conversa",
  "resultados",
  "entregaveis",
  "cronograma",
  "investimento",
  "diferenciais",
  "contato",
];

// Seções com fundo escuro (petrol) — o índice precisa trocar de cor em cima delas.
const DARK_SECTION_IDS = new Set(["resultados", "contato"]);

export function SectionIndex() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      // Recalcula via getBoundingClientRect a cada scroll — evita cache de
      // posições que ficariam obsoletas com a altura dinâmica da Hero (vídeo).
      const centerY = window.innerHeight / 2;
      let idx = 0;
      for (let i = 0; i < SECTION_IDS.length; i++) {
        const el = document.getElementById(SECTION_IDS[i]);
        if (el && el.getBoundingClientRect().top <= centerY) idx = i;
      }
      setActive(idx);

      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const total = SECTION_IDS.length;
  const isDark = DARK_SECTION_IDS.has(SECTION_IDS[active]);

  return (
    <div className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-4 pointer-events-none">
      {/* Trilha com ponto de progresso — a posição na página inteira */}
      <div
        className="relative w-px h-20 transition-colors duration-300"
        style={{ background: isDark ? "rgba(255,255,255,0.18)" : "rgba(24,24,27,0.1)" }}
      >
        <div
          className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
          style={{
            top: `${progress * 100}%`,
            background: isDark ? "#F2A93B" : "#065F46",
            boxShadow: isDark ? "0 0 0 4px rgba(242,169,59,0.18)" : "0 0 0 4px rgba(6,95,70,0.12)",
            transition: "top 0.2s linear, background 0.3s ease, box-shadow 0.3s ease",
          }}
        />
      </div>

      {/* Contador de seção — estilo Apple: número atual em destaque, total em cinza */}
      <div className="flex items-baseline gap-[3px] font-[family-name:var(--font-geist-mono)] text-xs">
        <span
          key={active}
          className="font-semibold tabular-nums transition-colors duration-300"
          style={{ color: isDark ? "#FFFFFF" : "#18181B", animation: "sectionIndexFade 0.35s ease" }}
        >
          {active + 1}
        </span>
        <span
          className="transition-colors duration-300"
          style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#A1A1AA" }}
        >
          /{total}
        </span>
      </div>
    </div>
  );
}
