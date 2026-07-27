"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { RevealMotion } from "@/components/ui/RevealMotion";
import { useContent } from "@/lib/content-context";

// Duração do desenho da linha — linear para os dots acenderem em sincronia
// exata com a frente da linha (easing curvo dessincronizaria os delays).
const LINE_DURATION = 1.2;

export default function CronogramaSection() {
  const content = useContent();
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const inView = useInView(trackRef, { once: true, amount: 0.3 });
  const [lit, setLit] = useState(0);

  const steps = content.cronograma.steps;

  // Cada dot acende quando a linha o alcança (posições uniformes na timeline)
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setLit(steps.length);
      return;
    }
    const timers = steps.map((_, i) =>
      setTimeout(
        () => setLit((prev) => Math.max(prev, i + 1)),
        (i / Math.max(steps.length - 1, 1)) * LINE_DURATION * 1000
      )
    );
    return () => timers.forEach(clearTimeout);
  }, [inView, reduce, steps]);

  return (
    <section id="cronograma" className="py-12 sm:py-16 md:py-24 bg-[#F9FBF8]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <RevealMotion className="mb-10 sm:mb-14 md:mb-16 max-w-[50ch]">
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#18181B] mb-4"
            style={{ letterSpacing: "-0.02em" }}
          >
            {content.cronograma.headline}
          </h2>
          <p className="text-sm sm:text-base text-[#52525B] leading-relaxed">
            {content.cronograma.description}
          </p>
        </RevealMotion>

        {/* Horizontal timeline - collapses to vertical on mobile */}
        <div ref={trackRef} className="relative">
          {/* Trilha estática - desktop only */}
          <div
            className="hidden md:block absolute top-[22px] left-0 right-0 h-px bg-[#E4E4E7]"
            aria-hidden
          />
          {/* Linha que se desenha da esquerda para a direita — o plano se materializando */}
          <motion.div
            className="hidden md:block absolute top-[22px] left-0 right-0 h-[2px] bg-[#065F46] origin-left"
            initial={reduce ? { scaleX: 1 } : { scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={reduce ? { duration: 0 } : { duration: LINE_DURATION, ease: "linear" }}
            aria-hidden
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
            {steps.map((step, i) => {
              const isLit = lit > i;
              return (
                <div key={i} className="relative">
                  {/* Dot — "acende" quando a linha o alcança */}
                  <div className="flex items-center gap-3 mb-4 md:mb-6">
                    <motion.div
                      className={`relative z-10 w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 ${
                        isLit ? "bg-[#065F46]" : "bg-[#E4E4E7]"
                      }`}
                      animate={
                        isLit && !reduce ? { scale: [1, 1.18, 1] } : { scale: 1 }
                      }
                      transition={{ duration: 0.35, times: [0, 0.6, 1] }}
                    >
                      <span
                        className={`text-xs font-semibold font-[family-name:var(--font-geist-mono)] transition-colors duration-300 ${
                          isLit ? "text-white" : "text-[#A1A1AA]"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </motion.div>
                    <span className="text-xs text-[#A1A1AA] font-[family-name:var(--font-geist-mono)] md:hidden">
                      {step.phase}
                    </span>
                  </div>

                  {/* Conteúdo — entra logo após o dot acender */}
                  <motion.div
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={
                      isLit
                        ? { opacity: 1, y: 0 }
                        : reduce
                          ? { opacity: 1, y: 0 }
                          : {}
                    }
                    transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <p className="hidden md:block text-xs text-[#A1A1AA] font-[family-name:var(--font-geist-mono)] mb-2">
                      {step.phase}
                    </p>
                    <h3 className="text-base font-semibold text-[#18181B] mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-[#71717A] leading-relaxed">
                      {step.description}
                    </p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
