"use client";

import { RevealMotion } from "@/components/ui/RevealMotion";
import { useContent } from "@/lib/content-context";
import { CheckCircle, MoonStars, ShieldCheck, TrendUp } from "@phosphor-icons/react/dist/ssr";

export default function InvestimentoSection() {
  const content = useContent();
  const { plan, margem } = content.investimento;

  return (
    <section id="investimento" className="py-12 sm:py-16 md:py-24 bg-[#F9FBF8] border-t border-[#E4E4E7]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <RevealMotion className="mb-8 sm:mb-12 md:mb-14 text-center max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-[0.18em] font-medium text-[#065F46] mb-3">
            {content.investimento.eyebrow}
          </p>
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#18181B] mb-4"
            style={{ letterSpacing: "-0.02em" }}
          >
            {content.investimento.headline}
          </h2>
          <p className="text-sm sm:text-base text-[#52525B] leading-relaxed">
            {content.investimento.description}
          </p>
        </RevealMotion>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.85fr] gap-5 md:gap-6 items-stretch max-w-5xl mx-auto">

          {/* Plano único */}
          <RevealMotion blur>
            <div
              className="card-hover h-full rounded-2xl p-6 sm:p-8 flex flex-col gap-6 text-white"
              style={{
                background:
                  "radial-gradient(circle at 92% -10%, rgba(242,169,59,0.16), transparent 55%), linear-gradient(135deg, #065F46, #0B4A38)",
              }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                  <p className="text-sm text-white/70">{plan.description}</p>
                </div>
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-full shrink-0"
                  style={{ background: "rgba(242,169,59,0.16)", color: "#F2A93B", border: "1px solid rgba(242,169,59,0.3)" }}
                >
                  <ShieldCheck weight="fill" size={13} />
                  {plan.noFidelityBadge}
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums"
                    style={{ letterSpacing: "-0.025em" }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-sm text-white/60">{plan.period}</span>
                </div>
                <div className="flex flex-col gap-1 mt-2">
                  <p className="text-xs text-white/50">
                    {plan.setupLabel}: <span className="font-semibold text-white/80 tabular-nums">{plan.setupPrice}</span>
                  </p>
                  {plan.commissionLabel && (
                    <p className="text-xs text-white/50">
                      {plan.commissionLabel}: <span className="font-semibold text-white/80 tabular-nums">{plan.commissionValue}</span>
                    </p>
                  )}
                </div>
              </div>

              <ul className="flex flex-col gap-2.5">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <CheckCircle weight="fill" size={16} className="shrink-0 mt-0.5 text-[#6EE7B7]" />
                    <span className="text-sm text-white/90">{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={content.ctaFinal.ctaHref}
                className="cta-shine mt-auto inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-3 rounded-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 bg-white text-[#065F46] hover:bg-white/90 hover:shadow-lg hover:shadow-black/10"
              >
                {content.investimento.ctaContratar}
              </a>
            </div>
          </RevealMotion>

          {/* Argumento de margem — o motivo pelo qual o investimento se paga sozinho */}
          <RevealMotion blur delay={0.12}>
            <div
              className="card-hover h-full rounded-2xl border border-[#E4E4E7] p-6 sm:p-8 flex flex-col gap-6"
              style={{
                background:
                  "radial-gradient(circle at 100% 0%, rgba(6,95,70,0.06), transparent 55%), #fff",
              }}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: "#ECFDF5" }}
              >
                <MoonStars weight="duotone" size={21} color="#065F46" />
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.14em] font-semibold text-[#065F46] mb-2">
                  {margem.eyebrow}
                </p>
                <h3 className="text-lg font-bold text-[#18181B] leading-snug mb-2.5">
                  {margem.title}
                </h3>
                <p className="text-sm text-[#52525B] leading-relaxed">
                  {margem.description}
                </p>
              </div>

              {/* Linha do tempo semanal — visualiza quando a operação humana para e a Virtent continua */}
              <div className="flex flex-col gap-2">
                {[
                  { label: "Seg – Sex, horário comercial", active: false },
                  { label: "Noites e fins de semana", active: true },
                  { label: "Feriados", active: true },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: row.active ? "#F2A93B" : "#D4D4D8" }}
                    />
                    <span className="text-xs text-[#71717A] flex-1">{row.label}</span>
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        background: row.active ? "rgba(242,169,59,0.14)" : "#F4F4F5",
                        color: row.active ? "#B45309" : "#A1A1AA",
                      }}
                    >
                      {row.active ? "Virtent ativa" : "Equipe presente"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-5 border-t border-[#E4E4E7] flex items-baseline gap-2.5">
                <span
                  className="text-3xl font-black text-[#065F46] tabular-nums"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {margem.stat.value}
                </span>
                <span className="text-sm text-[#71717A] leading-snug">{margem.stat.label}</span>
              </div>
            </div>
          </RevealMotion>
        </div>

        {/* Fechamento em destaque — badge com glow pulsante, fonte mono para contrastar
            com o resto da seção. A ideia é deixar claro: só existe ganho aqui. */}
        <RevealMotion delay={0.22} className="mt-5 md:mt-6 text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-[family-name:var(--font-geist-mono)] text-sm font-semibold tracking-tight"
            style={{
              background: "rgba(242,169,59,0.12)",
              color: "#B45309",
              border: "1px solid rgba(242,169,59,0.3)",
              boxShadow: "0 0 22px rgba(242,169,59,0.28)",
              animation: "pulseGlow 3s ease-in-out infinite",
            }}
          >
            <TrendUp weight="bold" size={15} />
            {content.investimento.closing}
          </span>
        </RevealMotion>
      </div>
    </section>
  );
}
