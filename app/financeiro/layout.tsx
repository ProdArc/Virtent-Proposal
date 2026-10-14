import type { Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { getSessionUser } from "@/lib/auth";
import { logoutAction } from "@/app/logout/actions";
import {
  FinanceBottomNav,
  FinanceSidebarNav,
} from "@/components/financeiro/shell/FinanceNav";

// viewport-fit=cover deixa o conteúdo ocupar a tela inteira no iPhone com
// notch; a barra de abas respeita a área segura via env(safe-area-inset-*).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F0F3EF",
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Casca única do financeiro: menu lateral no desktop, barra de abas
 * flutuante no celular. As páginas só renderizam o conteúdo — nada de
 * cabeçalho com "Sair", abas ou container próprio.
 */
export default async function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const name = user ? capitalize(user) : "";
  const initial = name.charAt(0) || "V";

  return (
    <div className="fin-app min-h-dvh bg-canvas text-ink lg:pl-64">
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-hairline bg-white px-4 py-6 lg:flex">
        <Link href="/painel" className="flex items-center gap-3 px-2">
          <Image
            src="/images/virtent-logo-icon.png"
            alt="Virtent"
            width={36}
            height={36}
            className="rounded-xl"
          />
          <span>
            <span className="block text-sm font-bold leading-tight text-ink">Virtent</span>
            <span className="block text-xs text-secondary-ink">Financeiro</span>
          </span>
        </Link>

        <div className="mt-8">
          <FinanceSidebarNav />
        </div>

        <div className="mt-auto flex flex-col gap-1 border-t border-hairline pt-4">
          <Link
            href="/painel"
            className="flex h-10 items-center rounded-xl px-3 text-sm text-muted transition-colors hover:bg-neutral-bg hover:text-ink"
          >
            Painel da Virtent
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-neutral-bg hover:text-ink"
            >
              <SignOut size={18} aria-hidden="true" />
              Sair{name && <span className="text-secondary-ink">· {name}</span>}
            </button>
          </form>
        </div>
      </aside>

      {/* Celular */}
      <header className="flex items-center justify-between px-4 pb-1 pt-[max(0.875rem,env(safe-area-inset-top))] sm:px-6 lg:hidden">
        <Link href="/painel" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
            {initial}
          </span>
          <span>
            <span className="block text-[11px] leading-tight text-secondary-ink">Olá</span>
            <span className="block text-sm font-bold leading-tight text-ink">
              {name || "Virtent"}
            </span>
          </span>
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Sair"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-muted shadow-card transition-colors active:bg-neutral-bg"
          >
            <SignOut size={20} aria-hidden="true" />
          </button>
        </form>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 lg:px-10 lg:pb-14 lg:pt-10">
        {children}
      </main>

      <FinanceBottomNav />
    </div>
  );
}
