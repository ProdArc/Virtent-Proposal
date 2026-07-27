"use client";

import { RevealMotion } from "@/components/ui/RevealMotion";
import { useContent } from "@/lib/content-context";

export default function ProblemaSection() {
  const content = useContent();
  return (
    <section id="problema" className="relative py-12 sm:py-16 md:py-24 bg-[#F9FBF8]">
      {/* Bleed suave a partir do verde-claro da seção anterior — sem corte seco */}
      <div
        className="absolute inset-x-0 top-0 h-16 md:h-24 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, #F0F5F3, transparent)" }}
        aria-hidden
      />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section header */}
        <RevealMotion className="mb-8 sm:mb-12 md:mb-14">
          <p className="text-xs uppercase tracking-[0.18em] font-medium text-[#065F46] mb-3">
            {content.problema.eyebrow}
          </p>
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#18181B] max-w-[30ch]"
            style={{ letterSpacing: "-0.02em" }}
          >
            {content.problema.headline}
          </h2>
        </RevealMotion>

        {/* 2x2 grid of pain points - numbered, no card borders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-[#E4E4E7] rounded-2xl overflow-hidden">
          {content.problema.items.map((item, i) => (
            <RevealMotion
              key={i}
              delay={i * 0.08}
              className={`group relative overflow-hidden p-5 sm:p-7 md:p-10 bg-white hover:bg-[#F9FBF8] transition-colors duration-300 ${
                i === 0 || i === 2 ? "md:border-r border-[#E4E4E7]" : ""
              } ${
                i < 2 ? "border-b border-[#E4E4E7]" : ""
              }`}
            >
              {/* Border-left âmbar que cresce no hover — tensão sem tom de alarme */}
              <span
                className="absolute left-0 top-0 h-full w-[3px] bg-[#F2A93B] origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                aria-hidden
              />
              <span
                className="block text-3xl sm:text-4xl md:text-5xl font-semibold text-[#065F46]/12 group-hover:text-[#065F46]/25 transition-colors duration-300 font-[family-name:var(--font-geist-mono)] mb-4 leading-none select-none"
                aria-hidden
              >
                {item.number}
              </span>
              <h3 className="text-lg font-semibold text-[#18181B] mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-[#71717A] leading-relaxed max-w-[38ch]">
                {item.description}
              </p>
            </RevealMotion>
          ))}
        </div>
      </div>
    </section>
  );
}
