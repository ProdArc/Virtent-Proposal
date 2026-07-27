"use client";

import { useRef, useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Buildings } from "@phosphor-icons/react/dist/ssr";
import { useContent } from "@/lib/content-context";

const SCROLL_PX_PER_SECOND = 250;

export default function HeroSection() {
  const content = useContent();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    function applyDuration(dur: number) {
      if (!dur || isNaN(dur) || reduce) return;
      durationRef.current = dur;
      container!.style.height = `calc(100vh + ${dur * SCROLL_PX_PER_SECOND}px)`;
    }

    if (video.readyState >= 1) applyDuration(video.duration);
    video.addEventListener("loadedmetadata", () => applyDuration(video.duration));

    let rafId = 0;

    function update() {
      rafId = 0;
      const dur = durationRef.current;
      if (!dur) return;

      const containerTop = container!.offsetTop;
      const totalScroll = container!.offsetHeight - window.innerHeight;
      const scrolled = window.scrollY - containerTop;
      const p = Math.max(0, Math.min(1, scrolled / totalScroll));
      const videoTime = p * dur;

      video!.currentTime = videoTime;

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${p * 100}%`;
      }

      if (scrollIndicatorRef.current) {
        scrollIndicatorRef.current.style.opacity = p > 0.04 ? "0" : "1";
      }

      // Background starts #FFFFFF and switches to #FBFDFB once the video passes the 3s mark
      if (sectionRef.current) {
        sectionRef.current.style.backgroundColor = videoTime >= 3 ? "#FBFDFB" : "#FFFFFF";
      }
    }

    // Agrupa os updates no frame de render (no máximo 1x por frame) em vez de
    // rodar a cada evento nativo de scroll, que em alguns WebViews restritos
    // (navegador embutido do WhatsApp etc.) dispara com uma frequência bem
    // maior que 60fps e sobrecarrega o decodificador de vídeo.
    function onScroll() {
      if (rafId) return;
      rafId = requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [reduce]);

  function stagger(i: number) {
    return {
      initial: reduce ? {} : { opacity: 0, y: 24 },
      animate: { opacity: 1, y: 0 },
      transition: {
        duration: 0.7,
        delay: i * 0.1,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      },
    };
  }

  return (
    <div ref={containerRef} style={{ height: "100vh" }}>
      <section
        ref={sectionRef}
        id="hero"
        className="sticky top-0 h-screen bg-white flex items-start overflow-hidden"
        style={{ transition: "background-color 0.6s ease" }}
      >
        {/* Ambient background glow — purely decorative, sits behind video and content */}
        <div
          className="ambient-glow"
          style={{
            inset: "-10% -10% auto -20%",
            height: "70%",
            background: "radial-gradient(ellipse at center, rgba(6,95,70,0.07), transparent 65%)",
            animationDelay: "0s",
          }}
          aria-hidden
        />
        <div
          className="ambient-glow"
          style={{
            inset: "auto -15% -10% 40%",
            height: "60%",
            background: "radial-gradient(ellipse at center, rgba(242,169,59,0.08), transparent 65%)",
            animationDelay: "2.5s",
          }}
          aria-hidden
        />

        <video
          ref={videoRef}
          src="/video/hero.mp4"
          poster="/video/hero-poster.jpg"
          muted
          playsInline
          preload="auto"
          className="hero-video"
          style={{
            position: "absolute",
            top: "50%",
            left: "70%",
            transform: "translate(-50%, -50%)",
            width: "55vw",
            height: "auto",
            // Fundo permanente com o poster — não é só o placeholder inicial.
            // Alguns WebViews restritos (navegador embutido do WhatsApp,
            // Instagram etc.) descartam o frame decodificado do vídeo durante
            // o scrubbing contínuo do scroll. Com isso como background real,
            // sempre tem algo desenhado ali, mesmo se o <video> parar de
            // pintar frames no meio do scroll.
            backgroundImage: "url(/video/hero-poster.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            maskImage:
              "linear-gradient(to right, transparent 0%, #000 4%, #000 96%, transparent 100%), " +
              "linear-gradient(to bottom, transparent 0%, #000 4%, #000 96%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, #000 4%, #000 96%, transparent 100%), " +
              "linear-gradient(to bottom, transparent 0%, #000 4%, #000 96%, transparent 100%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
          }}
        />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-[88px] sm:pt-[100px] md:pt-[16vh]">
          <div className="flex flex-col gap-4 sm:gap-5 max-w-lg">
            <motion.div {...stagger(0)}>
              <span className="inline-flex items-center gap-2 bg-[#ECFDF5] text-[#065F46] text-xs font-medium px-3 py-1.5 rounded-full border border-[#065F46]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 animate-pulse" />
                {content.proposal.badge} · {content.proposal.number}
              </span>
            </motion.div>

            <motion.h1
              {...stagger(1)}
              className="text-3xl sm:text-4xl md:text-[3.25rem] font-semibold leading-[1.08] text-[#18181B]"
              style={{ letterSpacing: "-0.025em" }}
            >
              A operação do
              <span
                className="block"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, #065F46 30%, #6ee7b7 45%, #d1fae5 50%, #6ee7b7 55%, #065F46 70%)",
                  backgroundSize: "300% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: "shine 9s linear infinite",
                  animationDelay: "0.8s",
                }}
              >
                Cartão de TODOS
              </span>
              centralizada em um só{" "}
              <span className="text-[#065F46]">WhatsApp</span>
              .
            </motion.h1>

            <motion.p
              {...stagger(2)}
              className="text-base text-[#52525B] leading-relaxed max-w-[42ch]"
            >
              {(() => {
                const [before, after] = content.hero.body.split("{clientName}");
                return (
                  <>
                    {before}
                    <span
                      className="font-medium text-[#065F46]"
                      style={{
                        background: "linear-gradient(transparent 52%, rgba(110,231,183,0.45) 52%)",
                      }}
                    >
                      {content.client.name}
                    </span>
                    {after}
                  </>
                );
              })()}
            </motion.p>
          </div>
        </div>

        {/* Client badge — grounds the proposal, fills the empty bottom-left corner */}
        <motion.div
          {...stagger(3)}
          className="absolute z-10 bottom-6 sm:bottom-10 left-6 sm:left-10 flex items-center gap-2.5 rounded-2xl bg-white/70 backdrop-blur-sm border border-black/5 pl-2 pr-3.5 py-2 shadow-sm"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#ECFDF5] flex items-center justify-center shrink-0">
            <Buildings weight="duotone" size={16} color="#065F46" />
          </div>
          <div className="flex flex-col leading-none min-w-0">
            <span className="text-[9px] uppercase tracking-[0.14em] text-[#A1A1AA] font-medium mb-0.5">
              Proposta para
            </span>
            <span className="text-xs sm:text-[13px] font-semibold text-[#18181B] truncate max-w-[180px] sm:max-w-[220px]">
              {content.client.name}
            </span>
          </div>
        </motion.div>

        {!reduce && (
          <div
            ref={scrollIndicatorRef}
            className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            style={{ transition: "opacity 0.5s ease" }}
          >
            <div
              className="relative flex justify-center"
              style={{
                width: "22px",
                height: "34px",
                borderRadius: "11px",
                border: "1.5px solid #A1A1AA",
              }}
            >
              <motion.div
                className="rounded-full bg-[#52525B]"
                style={{ width: "3px", height: "6px", marginTop: "5px" }}
                animate={{ y: [0, 14], opacity: [1, 1, 0] }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                  ease: "easeIn",
                  times: [0, 0.6, 1],
                }}
              />
            </div>

            <div className="flex flex-col items-center" style={{ gap: "2px" }}>
              {[0, 1, 2].map((i) => (
                <motion.svg
                  key={i}
                  width="12"
                  height="7"
                  viewBox="0 0 12 7"
                  fill="none"
                  stroke="#A1A1AA"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animate={{ opacity: [0.2, 0.9, 0.2] }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    delay: i * 0.18,
                    ease: "easeInOut",
                  }}
                >
                  <path d="M1 1.5l5 4 5-4" />
                </motion.svg>
              ))}
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E4E4E7]">
          <div
            ref={progressBarRef}
            className="h-full bg-[#065F46]"
            style={{ width: "0%" }}
          />
        </div>
      </section>
    </div>
  );
}
