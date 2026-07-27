"use client";

import { RevealMotion } from "@/components/ui/RevealMotion";
import { useContent } from "@/lib/content-context";
import {
  ChatsCircle,
  MoonStars,
  Coins,
  ArrowsClockwise,
  Megaphone,
  ClockCounterClockwise,
} from "@phosphor-icons/react/dist/ssr";

const iconMap = {
  ChatsCircle,
  MoonStars,
  Coins,
  ArrowsClockwise,
  Megaphone,
  ClockCounterClockwise,
};

// Bento: os 2 itens estratégicos (Atendimento em escala, Cobrança e arrecadação)
// ganham cards largos; a ordem visual intercala destaque e apoio.
const FEATURED = new Set(["Atendimento em escala", "Cobrança e arrecadação"]);
const DISPLAY_ORDER = [0, 1, 3, 2, 4, 5];

export default function SolucaoSection() {
  const content = useContent();
  const features = content.solucao.features;

  return (
    <section id="solucao" className="relative py-16 sm:py-20 md:py-28 bg-[#ECFDF5]">
      {/* Soft blend into the white sections above/below instead of a hard color cut */}
      <div
        className="absolute inset-x-0 top-0 h-16 md:h-24 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, #F9FBF8, transparent)" }}
        aria-hidden
      />
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-8 md:gap-16 items-start">
          {/* Left: Headline + description */}
          <RevealMotion direction="left" className="md:sticky md:top-28">
            <h2
              className="text-3xl sm:text-4xl md:text-[2.75rem] font-extrabold tracking-tight text-[#18181B] mb-4 md:mb-5 leading-[1.1]"
              style={{ letterSpacing: "-0.025em" }}
            >
              {content.solucao.headline}
            </h2>
            <p className="text-base text-[#52525B] leading-relaxed max-w-[44ch]">
              {content.solucao.description}
            </p>
          </RevealMotion>

          {/* Right: bento grid de features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            {DISPLAY_ORDER.map((idx, pos) => {
              const feature = features[idx];
              const Icon = iconMap[feature.icon as keyof typeof iconMap];
              const featured = FEATURED.has(feature.title);

              return (
                <RevealMotion
                  key={idx}
                  delay={pos * 0.08}
                  blur={featured}
                  className={featured ? "sm:col-span-2" : ""}
                >
                  <div
                    className={`card-hover group h-full rounded-2xl transition-colors duration-300 ${
                      featured
                        ? "p-6 md:p-8 text-white"
                        : "p-5 md:p-6 bg-white/70 border border-[#D1FAE5] hover:bg-white"
                    }`}
                    style={
                      featured
                        ? {
                            background:
                              "radial-gradient(circle at 90% -10%, rgba(242,169,59,0.14), transparent 55%), linear-gradient(135deg, #065F46, #0B4A38)",
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center mt-0.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:-rotate-3 ${
                          featured
                            ? "bg-white/10 group-hover:bg-white/20"
                            : "group-hover:shadow-lg group-hover:shadow-[#065F46]/20"
                        }`}
                        style={
                          featured
                            ? undefined
                            : { background: "linear-gradient(135deg, #065F46, #0d3d30)" }
                        }
                      >
                        {Icon && (
                          <Icon
                            weight="duotone"
                            size={20}
                            color={featured ? "#F2A93B" : "#ECFDF5"}
                          />
                        )}
                      </div>
                      <div>
                        <h3
                          className={`text-base font-bold mb-1.5 ${
                            featured ? "text-white" : "text-[#18181B]"
                          }`}
                        >
                          {feature.title}
                        </h3>
                        <p
                          className={`text-sm leading-relaxed ${
                            featured ? "text-white/75 max-w-[52ch]" : "text-[#71717A] max-w-[40ch]"
                          }`}
                        >
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </RevealMotion>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
