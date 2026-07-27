"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from "motion/react";
import { RevealMotion, PAGE_EASE } from "@/components/ui/RevealMotion";
import { useContent } from "@/lib/content-context";

export default function PorQueNasceuSection() {
  const content = useContent();
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const thresholdsRef = useRef<number[]>([]);
  const [passed, setPassed] = useState(0);

  const items = content.porQueNasceu.items;

  // Linha desenha enquanto a lista atravessa a zona de leitura do viewport
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 0.78", "end 0.45"],
  });

  // Posição real de cada número dentro da lista → thresholds da linha
  useEffect(() => {
    function measure() {
      const list = listRef.current;
      if (!list) return;
      const h = list.offsetHeight || 1;
      thresholdsRef.current = itemRefs.current.map((el) =>
        el ? (el.offsetTop + 14) / h : 1
      );
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const n = thresholdsRef.current.filter((t) => v >= t).length;
    setPassed((prev) => (prev === n ? prev : n));
  });

  const allPassed = reduce ? items.length : passed;

  // Sweep de sublinhado âmbar na palavra final da citação
  const closing = content.porQueNasceu.closing;
  const cut = closing.lastIndexOf(" ");
  const closingHead = closing.slice(0, cut + 1);
  const closingTail = closing.slice(cut + 1);

  return (
    <section id="origem" className="relative py-12 sm:py-16 md:py-24 bg-[#F0F5F3]">
      {/* Bleed suave a partir do fundo da seção anterior — sem corte seco */}
      <div
        className="absolute inset-x-0 top-0 h-16 md:h-24 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, #FCFCF7, transparent)" }}
        aria-hidden
      />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8 md:gap-16">
          {/* Left: eyebrow + heading + intro */}
          <RevealMotion direction="left" className="md:sticky md:top-28 self-start">
            <p className="text-xs uppercase tracking-[0.18em] font-medium text-[#065F46] mb-3">
              {content.porQueNasceu.eyebrow}
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#18181B] mb-4 md:mb-5"
              style={{ letterSpacing: "-0.02em" }}
            >
              {content.porQueNasceu.headline}
            </h2>
            <p className="text-sm text-[#52525B] leading-relaxed max-w-[44ch]">
              {content.porQueNasceu.intro}
            </p>
          </RevealMotion>

          {/* Right: numbered list connected by a scroll-drawn progress line */}
          <div ref={listRef} className="relative">
            {/* Trilha */}
            <div
              className="absolute left-[9px] top-2 bottom-2 w-px bg-[#065F46]/10"
              aria-hidden
            />
            {/* Progresso — desenha com o scroll */}
            <motion.div
              className="absolute left-[8.5px] top-2 bottom-2 w-[2px] rounded-full bg-[#065F46] origin-top"
              style={{ scaleY: reduce ? 1 : scrollYProgress }}
              aria-hidden
            />

            {items.map((item, i) => (
              <div
                key={i}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
              >
                <RevealMotion
                  delay={i * 0.09}
                  className="grid grid-cols-[auto_1fr] gap-5 md:gap-8 py-4 md:py-6"
                >
                  <span
                    className={`relative z-10 inline-flex justify-center font-[family-name:var(--font-geist-mono)] text-xs pt-0.5 w-5 shrink-0 bg-[#F0F5F3] py-1 -my-1 transition-colors duration-300 ${
                      i < allPassed ? "text-[#065F46] font-semibold" : "text-[#A1A1AA]"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-[#18181B] mb-1.5">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#71717A] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </RevealMotion>
              </div>
            ))}
          </div>
        </div>

        {/* Closing statement — o beat emocional da seção */}
        <RevealMotion delay={0.2} blur className="mt-10 md:mt-14">
          <div className="rounded-2xl bg-[#ECFDF5] border-l-4 border-[#065F46] p-5 sm:p-7 md:p-8">
            <p className="text-base sm:text-lg font-medium text-[#065F46] leading-relaxed max-w-[56ch]">
              &ldquo;{closingHead}
              <span className="relative inline-block">
                {closingTail}
                <motion.span
                  className="absolute left-0 -bottom-0.5 h-[3px] w-full rounded-full bg-[#F2A93B] origin-left"
                  initial={reduce ? false : { scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.55, duration: 0.6, ease: PAGE_EASE }}
                  aria-hidden
                />
              </span>
              &rdquo;
            </p>
          </div>
        </RevealMotion>
      </div>
    </section>
  );
}
