"use client";

import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion, AnimatePresence } from "motion/react";
import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { RevealMotion, PAGE_EASE } from "@/components/ui/RevealMotion";
import { WhatsAppChat } from "@/components/sections/WhatsAppChat";
import { useContent } from "@/lib/content-context";

export default function ConversaSection() {
  const content = useContent();
  const reduce = useReducedMotion();
  const phoneRef = useRef<HTMLDivElement>(null);
  const inView = useInView(phoneRef, { once: true, amount: 0.3 });
  const [runId, setRunId] = useState(0);
  const [ended, setEnded] = useState(false);

  function replay() {
    setEnded(false);
    setRunId((r) => r + 1);
  }

  return (
    <section id="conversa" className="relative py-16 sm:py-20 md:py-28 bg-[#ECFDF5]">
      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header */}
        <RevealMotion className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <p className="text-xs uppercase tracking-[0.18em] font-medium text-[#065F46] mb-3">
            {content.conversa.eyebrow}
          </p>
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#18181B] mb-4"
            style={{ letterSpacing: "-0.02em" }}
          >
            {content.conversa.headline}
          </h2>
          <p className="text-sm sm:text-base text-[#52525B] leading-relaxed max-w-[48ch] mx-auto">
            {content.conversa.description}
          </p>
        </RevealMotion>

        {/* Phone */}
        <RevealMotion blur className="relative mx-auto w-fit">
          <div ref={phoneRef} className="relative w-[290px] sm:w-[320px] h-[560px] sm:h-[620px]">
            {/* Glow verde-suave pulsando lentamente atrás do celular */}
            <motion.div
              className="absolute -inset-12 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(16,185,129,0.28) 0%, transparent 65%)",
                filter: "blur(24px)",
              }}
              animate={
                reduce
                  ? { opacity: 0.6 }
                  : { opacity: [0.45, 0.85, 0.45], scale: [1, 1.04, 1] }
              }
              transition={
                reduce
                  ? undefined
                  : { duration: 6.5, repeat: Infinity, ease: "easeInOut" }
              }
              aria-hidden
            />

            {/* Chip flutuante âmbar — ancorado no topo do frame */}
            <AnimatePresence>
              {inView && (
                <motion.span
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={
                    reduce
                      ? { duration: 0.2 }
                      : { type: "spring", stiffness: 320, damping: 22, delay: 0.5 }
                  }
                  className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg whitespace-nowrap"
                  style={{
                    background: "#F2A93B",
                    color: "#08211B",
                    fontVariantNumeric: "tabular-nums",
                    boxShadow: "0 8px 24px rgba(242,169,59,0.35)",
                  }}
                >
                  {content.conversa.chip}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Frame do celular */}
            <div className="relative h-full rounded-[2.75rem] p-2.5 bg-[#101613] shadow-2xl ring-1 ring-black/10">
              {/* Dynamic island */}
              <span
                className="absolute top-[18px] left-1/2 -translate-x-1/2 w-16 h-[15px] rounded-full bg-black z-20"
                aria-hidden
              />
              {/* Tela */}
              <div className="h-full w-full rounded-[2.1rem] overflow-hidden bg-[#0B120F]">
                <WhatsAppChat
                  key={runId}
                  visible={inView}
                  frameless
                  onComplete={() => setEnded(true)}
                />
              </div>
            </div>
          </div>

          {/* Replay — aparece quando a conversa termina */}
          <div className="h-12 flex items-center justify-center mt-4">
            <AnimatePresence>
              {ended && (
                <motion.button
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: PAGE_EASE }}
                  onClick={replay}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#065F46] hover:text-[#047857] transition-colors duration-200"
                >
                  <ArrowCounterClockwise size={15} weight="bold" />
                  {content.conversa.replay}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </RevealMotion>
      </div>
    </section>
  );
}
