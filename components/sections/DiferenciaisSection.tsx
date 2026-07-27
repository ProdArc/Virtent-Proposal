"use client";

import { RevealMotion } from "@/components/ui/RevealMotion";
import { useContent } from "@/lib/content-context";
import type { Icon } from "@phosphor-icons/react";
import {
  TrendUp,
  SquaresFour,
  WhatsappLogo,
  Brain,
  BellRinging,
  Kanban,
  Megaphone,
} from "@phosphor-icons/react/dist/ssr";

const iconMap: Record<string, Icon> = {
  TrendUp,
  SquaresFour,
  WhatsappLogo,
  Brain,
  BellRinging,
  Kanban,
  Megaphone,
};

export default function DiferenciaisSection() {
  const content = useContent();
  const [featured, ...rest] = content.diferenciais.items;
  const FeaturedIcon = iconMap[featured.icon];

  return (
    <section id="diferenciais" className="py-12 sm:py-16 md:py-24 bg-[#F9FBF8]">
      <div className="max-w-7xl mx-auto px-6">
        <RevealMotion className="mb-8 sm:mb-12 md:mb-14">
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#18181B]"
            style={{ letterSpacing: "-0.02em" }}
          >
            {content.diferenciais.headline}
          </h2>
        </RevealMotion>

        {/* Destaque: o principal argumento de venda em largura dupla */}
        <RevealMotion blur className="mb-4 md:mb-5">
          <div
            className="card-hover relative overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white p-6 md:p-8 flex flex-col sm:flex-row sm:items-center gap-5 md:gap-7"
            style={{
              background:
                "radial-gradient(circle at 96% -20%, rgba(242,169,59,0.12), transparent 50%), #fff",
            }}
          >
            <div className="shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center bg-[#F2A93B]/15">
              {FeaturedIcon && <FeaturedIcon weight="duotone" size={30} color="#B45309" />}
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-[#18181B] mb-2">
                {featured.title}
              </h3>
              <p className="text-sm md:text-base text-[#52525B] leading-relaxed max-w-[72ch]">
                {featured.description}
              </p>
            </div>
          </div>
        </RevealMotion>

        {/* Demais diferenciais em grid padrão */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {rest.map((item, i) => {
            const Icon = iconMap[item.icon];
            return (
              <RevealMotion key={i} delay={0.1 + i * 0.07}>
                <div className="card-hover group h-full rounded-2xl border border-[#E4E4E7] bg-white p-5 md:p-6 flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-[#ECFDF5] group-hover:bg-[#D1FAE5] transition-colors duration-300 flex items-center justify-center mt-0.5">
                    {Icon && <Icon weight="duotone" size={19} color="#065F46" />}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#18181B] mb-1.5">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#71717A] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </RevealMotion>
            );
          })}
        </div>
      </div>
    </section>
  );
}
