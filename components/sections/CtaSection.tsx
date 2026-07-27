"use client";

import { motion, useReducedMotion } from "motion/react";
import { PAGE_EASE } from "@/components/ui/RevealMotion";
import { useContent } from "@/lib/content-context";

export default function CtaSection() {
  const content = useContent();
  const reduce = useReducedMotion();
  const lines = content.ctaFinal.headline.split("\n");
  const lastLine = lines.length - 1;

  const reveal = (delay: number) => ({
    initial: reduce ? false : ({ opacity: 0, y: 24 } as const),
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true } as const,
    transition: { duration: 0.7, delay, ease: PAGE_EASE },
  });

  return (
    /* Finale — eco do pico, fechando o arco da página */
    <section
      id="contato"
      className="relative overflow-hidden flex items-center min-h-[72vh] py-20 sm:py-24 md:py-32"
      style={{
        background:
          "radial-gradient(ellipse 65% 85% at 50% 55%, rgba(6,95,70,0.40) 0%, transparent 70%)," +
          "radial-gradient(ellipse 45% 40% at 88% 4%, rgba(242,169,59,0.11) 0%, transparent 60%)," +
          "radial-gradient(ellipse 40% 45% at 8% 96%, rgba(16,185,129,0.10) 0%, transparent 60%)," +
          "#08211B",
      }}
    >
      {/* Bleed suave a partir da seção clara anterior */}
      <div
        className="absolute inset-x-0 top-0 h-20 md:h-28 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, #F9FBF8, transparent)" }}
        aria-hidden
      />

      {/* Anéis de radar — a operação nunca para de emitir */}
      {!reduce &&
        [0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full border border-[#10B981]/15 pointer-events-none"
            style={{ width: 320, height: 320, x: "-50%", y: "-50%" }}
            animate={{ scale: [1, 3.1], opacity: [0.45, 0] }}
            transition={{
              duration: 6,
              repeat: Infinity,
              delay: i * 2,
              ease: "easeOut",
            }}
            aria-hidden
          />
        ))}
      {reduce && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#10B981]/10 pointer-events-none"
          style={{ width: 560, height: 560 }}
          aria-hidden
        />
      )}

      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center">
        {/* Badge — eco do pin do hero, agora "ao vivo" */}
        <motion.div {...reveal(0)} className="mb-6 sm:mb-8">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-medium tracking-wide text-emerald-200">
            <span className="relative flex w-2 h-2 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
            </span>
            {content.ctaFinal.badge}
          </span>
        </motion.div>

        {/* Headline — linha final em gradiente verde→âmbar com shine, eco do hero e do pico */}
        <h2
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.08] text-white mb-4 sm:mb-6"
          style={{ letterSpacing: "-0.03em" }}
        >
          {lines.map((line, i) => (
            <motion.span
              key={i}
              className="block"
              initial={
                reduce
                  ? false
                  : i === lastLine
                    ? { opacity: 0, y: 28, filter: "blur(6px)" }
                    : { opacity: 0, y: 24 }
              }
              whileInView={
                i === lastLine
                  ? { opacity: 1, y: 0, filter: "blur(0px)" }
                  : { opacity: 1, y: 0 }
              }
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 + i * 0.16, ease: PAGE_EASE }}
              {...(i === lastLine
                ? {
                    style: {
                      backgroundImage:
                        "linear-gradient(100deg, #34D399 12%, #A7F3D0 32%, #F2C063 55%, #F2A93B 74%, #34D399 94%)",
                      backgroundSize: "220% auto",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      animation: "shine 8s linear infinite",
                      animationDelay: "1.2s",
                    },
                  }
                : {})}
            >
              {line}
            </motion.span>
          ))}
        </h2>

        <motion.p
          {...reveal(0.45)}
          className="text-sm sm:text-base text-white/60 leading-relaxed mb-8 sm:mb-10 max-w-[42ch] mx-auto"
        >
          {content.ctaFinal.body}
        </motion.p>

        {/* CTA — âmbar, a cor de decisão da página */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20, scale: 0.94 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={
            reduce
              ? { duration: 0.2 }
              : { type: "spring", stiffness: 260, damping: 22, delay: 0.6 }
          }
        >
          <a
            href={content.ctaFinal.ctaHref}
            className="cta-shine-white group inline-flex items-center gap-2.5 rounded-xl px-7 sm:px-9 py-3.5 sm:py-4 text-sm sm:text-base font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0"
            style={{
              background: "linear-gradient(120deg, #F2A93B, #EFB558)",
              color: "#08211B",
              boxShadow:
                "0 12px 40px -8px rgba(242,169,59,0.45), 0 4px 14px -4px rgba(0,0,0,0.35)",
            }}
          >
            {content.ctaFinal.cta}
            <svg
              width="15"
              height="15"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            >
              <path d="M2 7h10M8 3l4 4-4 4" />
            </svg>
          </a>
        </motion.div>

        {/* Contato direto — reforço discreto sob o CTA */}
        <motion.p {...reveal(0.75)} className="mt-7 text-xs text-white/35">
          {content.company.email} · {content.company.phone}
        </motion.p>
      </div>
    </section>
  );
}
