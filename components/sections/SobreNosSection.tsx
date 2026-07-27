"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";
import { RevealMotion } from "@/components/ui/RevealMotion";
import { useContent } from "@/lib/content-context";
import { Buildings, SealCheck, Strategy } from "@phosphor-icons/react/dist/ssr";

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
const PANEL_BG = "#08211B"; // mesmo petrol do Resultados

function useCountUp(target: number, active: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }
    const duration = 1100;
    let raf: number;
    const timeout = setTimeout(() => {
      const t0 = performance.now();
      function tick(now: number) {
        const p = Math.min((now - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setCount(Math.floor(eased * target));
        if (p < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }, 500);
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
  }, [active, target]);

  return count;
}

export default function SobreNosSection() {
  const content = useContent();
  const panelRef = useRef<HTMLDivElement>(null);
  const panelInView = useInView(panelRef, { once: false, amount: 0.3 });
  const { franquias, gestores, estrategias } = content.sobreNos.panel;
  const count = useCountUp(franquias.value, panelInView);

  const [before, after] = content.sobreNos.headline.split(content.sobreNos.headlineHighlight);

  const cardBase = "rounded-2xl border border-white/[0.07] hover:border-white/[0.16] transition-colors duration-300 h-full";

  return (
    <section
      id="sobre"
      style={{
        background: "#FCFCF7",
        padding: "80px 24px",
        fontFamily: FONT,
        borderTop: "1px solid #e5e5de",
      }}
    >
      <div style={{ maxWidth: "1160px", margin: "0 auto" }}>
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.25fr] gap-10 lg:gap-14 items-center">

          {/* Left: text */}
          <div className="text-center lg:text-left">
            <RevealMotion once={false}>
              <p style={{ fontSize: "12px", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 500, color: "#065F46", marginBottom: "16px", fontFamily: FONT }}>
                {content.sobreNos.eyebrow}
              </p>
            </RevealMotion>

            <RevealMotion delay={0.1} once={false}>
              <h2 style={{ fontWeight: 800, letterSpacing: "-0.02em", color: "#0a0a0a", marginBottom: "16px", lineHeight: 1.25, fontFamily: FONT, fontSize: "clamp(22px, 3vw, 32px)" }}>
                {before}
                <span style={{ color: "#065F46" }}>{content.sobreNos.headlineHighlight}</span>
                {after}
              </h2>
            </RevealMotion>

            <RevealMotion delay={0.2} once={false}>
              <p style={{ fontSize: "14px", color: "#888", lineHeight: 1.65, fontFamily: FONT }}>
                {content.sobreNos.description}
              </p>
            </RevealMotion>
          </div>

          {/* Right: painel de provas — número forte, aprovação e estratégias */}
          <div ref={panelRef} className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">

            {/* Card 1 — o número forte, ocupa a coluna inteira à esquerda */}
            <RevealMotion delay={0.25} blur once={false} className="sm:row-span-2">
              <div
                className={`${cardBase} flex flex-col justify-between p-6 md:p-7`}
                style={{
                  background: `radial-gradient(circle at 88% -6%, rgba(242,169,59,0.13), transparent 55%), ${PANEL_BG}`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(242,169,59,0.12)" }}
                >
                  <Buildings weight="duotone" size={20} color="#F2A93B" />
                </div>

                <div className="mt-8 sm:mt-0">
                  <div
                    style={{
                      fontSize: "clamp(52px, 6vw, 72px)",
                      fontWeight: 800,
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                      color: "#F2A93B",
                      textShadow: "0 0 32px rgba(242,169,59,0.35)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {count}
                    {franquias.suffix}
                  </div>
                  <p className="text-white font-semibold text-base mt-3 leading-snug" style={{ fontFamily: FONT }}>
                    {franquias.title}
                  </p>
                  <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "#B9C9C2", fontFamily: FONT }}>
                    {franquias.label}
                  </p>
                </div>
              </div>
            </RevealMotion>

            {/* Card 2 — gestores aprovam */}
            <RevealMotion delay={0.4} once={false}>
              <div className={`${cardBase} p-5 md:p-6`} style={{ background: PANEL_BG }}>
                <div className="flex items-center justify-between mb-4">
                  {/* Avatares de gestores */}
                  <div className="flex items-center">
                    {["G", "M", "R"].map((initial, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                        style={{
                          background: `linear-gradient(135deg, ${["#065F46", "#0B7A5C", "#10B981"][i]}, #08211B)`,
                          border: "2px solid #0E2C23",
                          marginLeft: i === 0 ? 0 : "-8px",
                          zIndex: 3 - i,
                          position: "relative",
                        }}
                      >
                        {initial}
                      </div>
                    ))}
                  </div>
                  {/* Selo de metas batidas */}
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
                    style={{ background: "rgba(242,169,59,0.14)", color: "#F2A93B" }}
                  >
                    <SealCheck weight="fill" size={11} />
                    {gestores.badge}
                  </span>
                </div>
                <p className="text-white font-semibold text-[15px] leading-snug" style={{ fontFamily: FONT }}>
                  {gestores.title}
                </p>
                <p className="text-[13px] mt-1 leading-relaxed" style={{ color: "#B9C9C2", fontFamily: FONT }}>
                  {gestores.label}
                </p>
              </div>
            </RevealMotion>

            {/* Card 3 — estratégias prontas */}
            <RevealMotion delay={0.5} once={false}>
              <div className={`${cardBase} p-5 md:p-6`} style={{ background: PANEL_BG }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(16,185,129,0.14)" }}
                  >
                    <Strategy weight="duotone" size={17} color="#6EE7B7" />
                  </div>
                  <p className="text-white font-semibold text-[15px]" style={{ fontFamily: FONT }}>
                    {estrategias.title}
                  </p>
                </div>
                <p className="text-[13px] leading-relaxed mb-3.5" style={{ color: "#B9C9C2", fontFamily: FONT }}>
                  {estrategias.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {estrategias.chips.map((chip) => (
                    <span
                      key={chip}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        color: "#D7E4DE",
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </RevealMotion>

          </div>
        </div>
      </div>
    </section>
  );
}
