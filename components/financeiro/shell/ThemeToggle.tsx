"use client";

import { Moon, Sun } from "@phosphor-icons/react";

/**
 * Alterna claro/escuro. O tema efetivo pode vir do cookie ou do sistema
 * ("auto"), então a conta é feita em cima do que está valendo agora:
 * `data-theme` no .fin-app + preferência do aparelho. O novo valor é gravado no
 * cookie (lido pelo layout no servidor, sem piscar na próxima abertura) e
 * aplicado na hora no DOM.
 *
 * Os dois ícones ficam no HTML e o CSS mostra um só (.fin-when-*), pra não
 * haver diferença entre servidor e cliente na hidratação.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.querySelector<HTMLElement>(".fin-app");
    if (!root) return;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const current = root.dataset.theme;
    const isDark = current === "dark" || (current !== "light" && systemDark);
    const next = isDark ? "light" : "dark";
    root.dataset.theme = next;
    document.cookie = `fin_theme=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema claro e escuro"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-muted shadow-card transition-colors active:bg-neutral-bg"
    >
      <Moon size={20} aria-hidden="true" className="fin-when-light" />
      <Sun size={20} aria-hidden="true" className="fin-when-dark" />
    </button>
  );
}
