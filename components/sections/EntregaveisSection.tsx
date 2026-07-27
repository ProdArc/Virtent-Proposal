"use client";

import { motion, useReducedMotion } from "motion/react";
import { RevealMotion, PAGE_EASE } from "@/components/ui/RevealMotion";
import { useContent } from "@/lib/content-context";
import type { Icon } from "@phosphor-icons/react";
import {
  ListChecks,
  WhatsappLogo,
  Rocket,
  UsersThree,
  ChartLineUp,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";

const iconMap: Record<string, Icon> = {
  ListChecks,
  WhatsappLogo,
  Rocket,
  UsersThree,
  ChartLineUp,
  ShieldCheck,
};

export default function EntregaveisSection() {
  const content = useContent();
  const reduce = useReducedMotion();

  return (
    <section id="entregaveis" className="py-12 sm:py-16 md:py-24 bg-[#F9FBF8]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <RevealMotion className="mb-8 sm:mb-12 md:mb-14">
          <p className="text-xs uppercase tracking-[0.18em] font-medium text-[#065F46] mb-3">
            {content.entregaveis.eyebrow}
          </p>
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#18181B]"
            style={{ letterSpacing: "-0.02em" }}
          >
            {content.entregaveis.headline}
          </h2>
        </RevealMotion>

        {/* 2-col grid, 3 rows - with accent left-border on each item */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
          {content.entregaveis.items.map((item, i) => {
            const Icon = iconMap[item.icon];
            return (
              <RevealMotion
                key={i}
                delay={i * 0.09}
                className="group flex items-start gap-3 sm:gap-5 pl-4 sm:pl-5 border-l-2 border-[#065F46]/20 hover:border-[#065F46] transition-all duration-300 hover:-translate-y-0.5"
              >
                {/* Ícone com micro-bounce sequencial — checklist sendo confirmada */}
                <motion.div
                  className="shrink-0 w-9 h-9 rounded-lg bg-[#F0F5F3] group-hover:bg-[#D1FAE5] transition-colors duration-300 flex items-center justify-center mt-0.5"
                  initial={reduce ? false : { scale: 0 }}
                  whileInView={reduce ? { scale: 1 } : { scale: [0, 1.06, 1] }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { delay: i * 0.09 + 0.25, duration: 0.45, times: [0, 0.7, 1], ease: PAGE_EASE }
                  }
                >
                  {Icon && <Icon weight="duotone" size={18} color="#065F46" />}
                </motion.div>
                <div>
                  <h3 className="text-sm font-semibold text-[#18181B] mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#71717A] leading-relaxed max-w-[40ch]">
                    {item.description}
                  </p>
                </div>
              </RevealMotion>
            );
          })}
        </div>
      </div>
    </section>
  );
}
