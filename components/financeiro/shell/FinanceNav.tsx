"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import {
  ChartLineUp,
  HandCoins,
  Receipt,
  Wallet,
  type Icon,
} from "@phosphor-icons/react";

type NavKey = "receber" | "pagar" | "caixa" | "dashboard";

const ITEMS: { key: NavKey; label: string; href: string; icon: Icon }[] = [
  { key: "receber", label: "A receber", href: "/financeiro", icon: HandCoins },
  { key: "pagar", label: "A pagar", href: "/financeiro/pagar", icon: Receipt },
  { key: "caixa", label: "Caixa", href: "/financeiro/caixa", icon: Wallet },
  { key: "dashboard", label: "Dashboard", href: "/financeiro/dashboard", icon: ChartLineUp },
];

/**
 * Qual item do menu a rota atual pertence. Tudo que não é pagar/caixa/dashboard
 * (lista de clientes, ficha do cliente, cadastro) é "A receber".
 */
function activeKey(pathname: string): NavKey {
  if (pathname.startsWith("/financeiro/pagar")) return "pagar";
  if (pathname.startsWith("/financeiro/caixa")) return "caixa";
  if (pathname.startsWith("/financeiro/dashboard")) return "dashboard";
  return "receber";
}

/** Menu lateral (desktop). */
export function FinanceSidebarNav() {
  const active = activeKey(usePathname());
  return (
    <nav aria-label="Financeiro" className="flex flex-col gap-1">
      {ITEMS.map(({ key, label, href, icon: IconCmp }) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
              isActive ? "bg-brand-light text-brand-ink" : "text-muted hover:bg-neutral-bg hover:text-ink"
            }`}
          >
            <IconCmp size={22} weight={isActive ? "fill" : "regular"} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Barra de abas flutuante (celular e tablet). O indicador "desliza" de uma
 * aba pra outra em vez de simplesmente trocar de cor — mesma ideia da barra
 * de abas "liquid glass" do iOS 26: mede a posição real do item ativo (em
 * pixel, via ref) e anima até lá com uma curva com leve "overshoot" de mola.
 */
export function FinanceBottomNav() {
  const active = activeKey(usePathname());
  const activeIndex = ITEMS.findIndex((item) => item.key === active);

  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    const el = itemRefs.current[activeIndex];
    if (!list || !el) return;

    const measure = () => setPill({ left: el.offsetLeft, width: el.offsetWidth });
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [activeIndex]);

  return (
    <nav
      aria-label="Financeiro"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-[1.75rem] bg-card/95 p-1.5 shadow-float ring-1 ring-hairline backdrop-blur lg:hidden"
    >
      <ul ref={listRef} className="relative grid grid-cols-4 gap-1">
        {pill && (
          <span
            aria-hidden="true"
            style={{
              left: pill.left,
              width: pill.width,
              transitionProperty: "left, width",
              transitionDuration: "420ms",
              transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
            className="absolute inset-y-0 z-0 rounded-[1.25rem] bg-brand-light"
          />
        )}
        {ITEMS.map(({ key, label, href, icon: IconCmp }, index) => {
          const isActive = key === active;
          return (
            <li key={key} ref={(node) => { itemRefs.current[index] = node; }} className="relative z-10">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] text-[10.5px] font-semibold transition duration-200 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                  isActive ? "text-brand-ink" : "text-secondary-ink"
                }`}
              >
                <IconCmp
                  size={22}
                  weight={isActive ? "fill" : "regular"}
                  aria-hidden="true"
                  style={{
                    transitionProperty: "transform",
                    transitionDuration: "420ms",
                    transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                  className={isActive ? "scale-110" : "scale-100"}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
