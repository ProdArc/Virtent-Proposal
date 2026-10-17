import Link from "next/link";
import { Bank, CaretLeft } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

/**
 * Peças visuais do painel financeiro (banco digital, tema claro). Tudo aqui é
 * server-safe — sem hooks. Classes escritas por extenso pro Tailwind enxergar.
 */

export const btnPrimary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-brand-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2";

export const btnSecondary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-card px-5 text-sm font-semibold text-ink ring-1 ring-line transition-[background-color,transform] hover:bg-neutral-bg active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

export const btnGhost =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-light focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

/** Campo de texto padrão dos formulários. */
export const inputClass =
  "w-full rounded-2xl border border-hairline bg-card px-4 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25";

/** Cartão branco flutuando no fundo cinza. */
export function Panel({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`rounded-3xl bg-card shadow-card ${padded ? "p-5 sm:p-6" : ""} ${className}`}
    >
      {children}
    </section>
  );
}

/** Título de seção acima de um cartão/lista. */
export function SectionTitle({
  children,
  action,
  className = "",
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-3 flex items-center justify-between gap-3 px-1 ${className}`}>
      <h2 className="text-[15px] font-bold tracking-tight text-ink">{children}</h2>
      {action}
    </div>
  );
}

/**
 * Cabeçalho da página. Em subpáginas (`back`), mostra o botão redondo de
 * voltar à esquerda, como nos apps de banco.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3 sm:mb-6">
      <div className="flex min-w-0 items-start gap-3">
        {back && (
          <Link
            href={back.href}
            aria-label={back.label}
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-ink shadow-card transition-colors hover:bg-neutral-bg active:scale-95"
          >
            <CaretLeft size={20} weight="bold" aria-hidden="true" />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-3xl">
            {title}
          </h1>
          {subtitle && <div className="mt-1 text-sm text-secondary-ink">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/**
 * Cartão de destaque do topo de cada módulo: o número que importa grande,
 * contexto embaixo e, opcionalmente, a fileira de ações rápidas redondas.
 */
export function HeroCard({
  label,
  value,
  hint,
  tone = "neutral",
  children,
  side,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: "neutral" | "overdue" | "paid";
  children?: ReactNode;
  /** Coluna à direita do valor principal — ex: saldo real dos bancos conectados. */
  side?: ReactNode;
}) {
  const valueClass =
    tone === "overdue" ? "text-overdue-ink" : tone === "paid" ? "text-paid-ink" : "text-ink";
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-card p-5 shadow-card sm:p-7">
      {/* Brilho verde bem suave no canto — dá identidade sem escurecer o tema. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.16),transparent_68%)]"
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-secondary-ink">{label}</p>
          <p
            className={`mt-1 text-[34px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[44px] ${valueClass}`}
          >
            {value}
          </p>
          {hint && <div className="mt-2 text-[13px] text-secondary-ink">{hint}</div>}
          {children && <div className="mt-5">{children}</div>}
        </div>
        {side && <div className="w-full shrink-0 sm:w-72">{side}</div>}
      </div>
    </section>
  );
}

/** Banco identificado pelo nome da conta/instituição — logo real quando a gente tem, senão iniciais. */
const BANK_LOGOS: Record<string, { label: string; src: string }> = {
  santander: { label: "Santander", src: "/bank-logos/santander.png" },
  c6: { label: "C6 Bank", src: "/bank-logos/c6.svg" },
  bandeirado: { label: "C6 Bank", src: "/bank-logos/c6.svg" },
};

function detectBank(name: string): { label: string; src: string } | null {
  const key = name.toLowerCase();
  for (const [needle, info] of Object.entries(BANK_LOGOS)) {
    if (key.includes(needle)) return info;
  }
  return null;
}

/** Cartão de saldo de uma conta bancária conectada via Open Finance, com o logo do banco quando reconhecido. */
export function BankBalanceCard({ name, value, error }: { name: string; value?: string; error?: string }) {
  const bank = detectBank(name);
  return (
    <div className="rounded-2xl border border-hairline bg-card p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-hairline">
          {bank ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bank.src} alt="" className="h-5 w-5 object-contain" />
          ) : (
            <Bank size={18} weight="fill" className="text-brand-ink" aria-hidden="true" />
          )}
        </span>
        <p className="truncate text-sm font-bold leading-tight text-ink">{bank?.label ?? name}</p>
      </div>
      {error ? (
        <p className="mt-2.5 text-[11px] text-overdue-ink">{error}</p>
      ) : (
        <>
          <p className="mt-3 text-[11px] font-medium text-secondary-ink">Saldo</p>
          <p className="text-xl font-extrabold tabular-nums leading-tight text-ink">{value}</p>
        </>
      )}
    </div>
  );
}

/** Botão redondo com rótulo embaixo (Pix, Pagar, Transferir...). */
export function QuickAction({
  href,
  label,
  icon: IconCmp,
  badge,
  tone = "brand",
}: {
  href: string;
  label: string;
  icon: Icon;
  /** Contagem no canto do botão (some quando 0). */
  badge?: number;
  tone?: "brand" | "danger";
}) {
  const circle =
    tone === "danger"
      ? "bg-overdue-bg text-overdue-ink group-hover:bg-overdue-bg-hover"
      : "bg-brand-light text-brand-ink group-hover:bg-brand-light-hover";
  return (
    <Link href={href} className="group flex w-[4.5rem] flex-col items-center gap-1.5 text-center">
      <span
        className={`relative flex h-14 w-14 items-center justify-center rounded-full transition-[background-color,transform] group-active:scale-95 ${circle}`}
      >
        <IconCmp size={24} weight="bold" aria-hidden="true" />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-overdue-solid px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-card">
            {badge}
          </span>
        )}
      </span>
      <span className="text-[11.5px] font-semibold leading-tight text-ink">{label}</span>
    </Link>
  );
}

/** Estado vazio: mensagem + chamada pra ação. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-card px-6 py-12 text-center shadow-card">
      <p className="text-[15px] font-bold text-ink">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-secondary-ink">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Erro de configuração (banco indisponível etc.), dentro do shell. */
export function ConfigError({ message }: { message: string }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-3xl bg-card p-8 text-center shadow-card">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-pending-ink">
        Configuração pendente
      </p>
      <h1 className="mb-2 text-lg font-bold text-ink">Não foi possível conectar ao banco</h1>
      <p className="text-sm leading-relaxed text-secondary-ink">{message}</p>
    </div>
  );
}
