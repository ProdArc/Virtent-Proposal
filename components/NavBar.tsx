"use client";

import { useEffect, useRef, useState } from "react";
import { useContent } from "@/lib/content-context";

const navLinks = [
  { label: "Solução", href: "#solucao" },
  { label: "Recursos", href: "#entregaveis" },
  { label: "Investimento", href: "#investimento" },
  { label: "Contato", href: "#contato" },
];

export default function NavBar() {
  const content = useContent();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [barVisible, setBarVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    function onScroll() {
      const y = window.scrollY;
      setScrolled(y > 24);

      // Não esconder a barra enquanto o menu mobile estiver aberto —
      // o hambúrguer ficaria inacessível para fechá-lo.
      if (!menuOpen) {
        const delta = y - lastScrollY.current;
        if (y > 120 && delta > 4) {
          setBarVisible(false);
        } else if (delta < -4 || y < 120) {
          setBarVisible(true);
        }
      }

      lastScrollY.current = y;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  return (
    <>
      {/* Logo — camada própria, sempre visível, independente da barra abaixo */}
      <div className="fixed top-0 inset-x-0 z-[60] pointer-events-none" style={{ height: "68px" }}>
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center">
          <a
            href="#hero"
            className="pointer-events-auto -ml-3 inline-flex items-center rounded-lg bg-[#F9FBF8]/70 backdrop-blur-md px-3 py-1.5 font-semibold text-[#18181B] text-lg tracking-tight"
          >
            {content.company.name}
          </a>
        </div>
      </div>

      {/* Barra — fundo + nav + CTA + hambúrguer deslizam juntos ao rolar pra baixo */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          scrolled ? "bg-[#F9FBF8]/55 backdrop-blur-md" : "bg-transparent"
        } ${barVisible ? "translate-y-0" : "-translate-y-full"}`}
        style={{ height: "68px" }}
      >
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-end gap-8">
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="link-underline text-sm text-[#52525B] hover:text-[#065F46] transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <a
            href={content.ctaFinal.ctaHref}
            className="cta-shine hidden md:inline-flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-[#065F46]/25 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200"
            style={{ background: "linear-gradient(120deg, #065F46, #047857)" }}
          >
            Falar com Consultor
          </a>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-[#52525B] hover:text-[#065F46]"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4l12 12M16 4L4 16" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 5h14M3 10h14M3 15h14" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-[#F9FBF8] border-b border-[#E4E4E7] px-6 pb-6 pt-2">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm text-[#52525B] hover:text-[#065F46] transition-colors py-1"
                >
                  {link.label}
                </a>
              ))}
              <a
                href={content.ctaFinal.ctaHref}
                className="mt-2 inline-flex items-center justify-center bg-[#065F46] text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-[#047857] transition-colors"
              >
                Falar com Consultor
              </a>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
