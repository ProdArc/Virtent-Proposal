"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { RevealMotion } from "@/components/ui/RevealMotion";
import { CountUp } from "@/components/ui/CountUp";
import { useContent } from "@/lib/content-context";
import { Coins, Robot, Target, Student, CreditCard } from "@phosphor-icons/react/dist/ssr";

const CARD =
  "card-hover h-full rounded-2xl border border-white/10 bg-white/[0.04] transition-colors duration-300";

export default function ResultadosSection() {
  const content = useContent();
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const r = content.resultados;

  return (
    <section
      ref={sectionRef}
      id="resultados"
      className="relative py-12 sm:py-13 md:py-14 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 75% 60% at 50% -10%, rgba(242,169,59,0.13) 0%, transparent 60%)," +
          "radial-gradient(ellipse 60% 50% at 0% 100%, rgba(16,185,129,0.13) 0%, transparent 65%)," +
          "radial-gradient(ellipse 60% 50% at 100% 100%, rgba(16,185,129,0.10) 0%, transparent 65%)," +
          "#08211B",
      }}
    >
      {/* Transições suaves contra as seções claras vizinhas — curtas o bastante
          para nunca alcançar o conteúdo (ficam dentro do padding da seção) */}
      <div
        className="absolute inset-x-0 top-0 h-8 md:h-10 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, #ECFDF5, transparent)" }}
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 h-8 md:h-10 pointer-events-none"
        style={{ background: "linear-gradient(to top, #F9FBF8, transparent)" }}
        aria-hidden
      />

      {/* Glow ambiente pulsando lentamente atrás do bento */}
      <div
        className="ambient-glow"
        style={{
          inset: "28% 8% auto 8%",
          height: "55%",
          background: "radial-gradient(ellipse at center, rgba(242,169,59,0.07), transparent 65%)",
        }}
        aria-hidden
      />

      <div className="relative z-20 max-w-6xl mx-auto px-6">
        {/* Header centrado e compacto — a seção inteira enquadra no viewport */}
        <RevealMotion className="text-center max-w-3xl mx-auto mb-7 md:mb-8">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#F2A93B] mb-2.5">
            {r.eyebrow}
          </p>
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3"
            style={{ letterSpacing: "-0.025em" }}
          >
            {r.headline}
          </h2>
          <p className="text-sm md:text-base text-white/60 leading-relaxed max-w-[52ch] mx-auto">
            {r.description}
          </p>
        </RevealMotion>

        {/* Bento de provas — 4 cards assimétricos e compactos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">

          {/* 1 — Arrecadação 100% IA (hero) */}
          <RevealMotion blur className="md:col-span-2 lg:col-span-7">
            <div
              className={`${CARD} hover:border-[#F2A93B]/30 p-6 md:p-7 flex flex-col justify-between gap-6`}
              style={{
                background:
                  "radial-gradient(circle at 90% -12%, rgba(242,169,59,0.16), transparent 55%), rgba(255,255,255,0.04)",
              }}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(242,169,59,0.14)" }}
                >
                  <Coins weight="duotone" size={19} color="#F2A93B" />
                </div>
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-full"
                  style={{
                    background: "rgba(242,169,59,0.13)",
                    color: "#F2A93B",
                    border: "1px solid rgba(242,169,59,0.25)",
                  }}
                >
                  <Robot weight="fill" size={13} />
                  {r.arrecadacao.badge}
                </span>
              </div>
              <div>
                <p
                  className="metric-shine font-black leading-none mb-2"
                  style={{ fontVariantNumeric: "tabular-nums", fontSize: "clamp(2.5rem, 3.5vw, 3.25rem)" }}
                >
                  <CountUp value={r.arrecadacao.value} active={visible} delayMs={300} />
                </p>
                <p className="text-sm text-white/60 max-w-[46ch] leading-relaxed">
                  {r.arrecadacao.label}
                </p>
              </div>
            </div>
          </RevealMotion>

          {/* 2 — Meta batida (anel de progresso) */}
          <RevealMotion blur delay={0.1} className="md:col-span-2 lg:col-span-5">
            <div className={`${CARD} hover:border-white/20 p-5 md:p-6 flex items-center gap-5 md:gap-6`}>
              <MetaRing pct={r.meta.pct} display={r.meta.display} active={visible} />
              <div className="min-w-0">
                <p className="text-base md:text-lg font-semibold text-white leading-snug mb-2.5">
                  {r.meta.title}
                </p>
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-full"
                  style={{
                    background: "rgba(16,185,129,0.13)",
                    color: "#6EE7B7",
                    border: "1px solid rgba(16,185,129,0.25)",
                  }}
                >
                  <Target weight="fill" size={13} />
                  {r.meta.badge}
                </span>
              </div>
            </div>
          </RevealMotion>

          {/* 3 — Matrículas convertidas (horizontal, compacto) */}
          <RevealMotion direction="left" delay={0.18} className="lg:col-span-5">
            <div className={`${CARD} hover:border-white/20 p-5 md:p-6 flex items-center gap-5`}>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(16,185,129,0.14)" }}
              >
                <Student weight="duotone" size={20} color="#6EE7B7" />
              </div>
              <div className="min-w-0">
                <p
                  className="text-3xl md:text-4xl font-black text-white leading-none mb-1.5"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  <CountUp value={r.matriculas.value} active={visible} delayMs={450} />
                </p>
                <p className="text-sm font-semibold text-white/90">{r.matriculas.title}</p>
                <p className="text-xs text-white/50 leading-relaxed">{r.matriculas.label}</p>
              </div>
            </div>
          </RevealMotion>

          {/* 4 — Abordagens sobre forma de pagamento (horizontal, compacto) */}
          <RevealMotion direction="right" delay={0.26} className="lg:col-span-7">
            <div className={`${CARD} hover:border-white/20 p-5 md:p-6 flex items-center gap-5`}>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(16,185,129,0.14)" }}
              >
                <CreditCard weight="duotone" size={20} color="#6EE7B7" />
              </div>
              <div className="min-w-0">
                <p
                  className="text-3xl md:text-4xl font-black text-white leading-none mb-1.5"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  <CountUp value={r.abordagens.value} active={visible} delayMs={550} />
                </p>
                <p className="text-sm font-semibold text-white/90 max-w-[56ch]">{r.abordagens.title}</p>
                <p className="text-xs text-white/50 leading-relaxed max-w-[60ch]">{r.abordagens.label}</p>
              </div>
            </div>
          </RevealMotion>
        </div>

        {/* Fechamento — entra por último, sozinho, com peso */}
        <RevealMotion delay={0.25} blur className="mt-7 md:mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-base sm:text-lg md:text-xl font-semibold text-white max-w-3xl mx-auto leading-snug">
            &ldquo;{r.closing}&rdquo;
          </p>
        </RevealMotion>
      </div>
    </section>
  );
}

/** Anel de progresso da meta — desenha até o percentual quando entra em vista. */
function MetaRing({ pct, display, active }: { pct: number; display: string; active: boolean }) {
  const reduce = useReducedMotion();
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (!active) return;
    if (reduce) {
      setDrawn(true);
      return;
    }
    const t = setTimeout(() => setDrawn(true), 350);
    return () => clearTimeout(t);
  }, [active, reduce]);

  const R = 50;
  const C = 2 * Math.PI * R;
  const offset = drawn ? C * (1 - pct / 100) : C;

  return (
    <div className="relative shrink-0 w-28 h-28 md:w-32 md:h-32">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="url(#metaRingGrad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{
            transition: reduce ? "none" : "stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s",
            filter: "drop-shadow(0 0 6px rgba(242,169,59,0.45))",
          }}
        />
        <defs>
          <linearGradient id="metaRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F2A93B" />
            <stop offset="100%" stopColor="#F6C36B" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-2xl md:text-[1.75rem] font-black text-white"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          <CountUp value={display} active={active} delayMs={400} duration={1400} />
        </span>
      </div>
    </div>
  );
}
