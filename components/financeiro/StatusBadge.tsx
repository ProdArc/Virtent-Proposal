import type { Tone } from "@/lib/urgency";

/**
 * Classes por tom. Escritas por extenso (e não montadas em runtime) porque o
 * Tailwind precisa ver a string inteira no código-fonte pra gerar o CSS.
 * As cores vêm dos tokens de tema em globals.css — nenhum hex aqui.
 */
const TONE_CLASS: Record<Tone, string> = {
  paid: "bg-paid-bg text-paid-ink border-paid-line",
  pending: "bg-pending-bg text-pending-ink border-pending-line",
  overdue: "bg-overdue-bg text-overdue-ink border-overdue-line",
  onboarding: "bg-onboarding-bg text-onboarding-ink border-onboarding-line",
  neutral: "bg-neutral-bg text-neutral-ink border-neutral-line",
};

const SIZE_CLASS = {
  sm: "text-[10px] px-2 py-0.5 gap-1",
  md: "text-[11px] px-2.5 py-1 gap-1.5",
} as const;

export function StatusBadge({
  tone,
  children,
  icon,
  size = "md",
  title,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  icon?: React.ReactNode;
  size?: keyof typeof SIZE_CLASS;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border font-semibold whitespace-nowrap ${TONE_CLASS[tone]} ${SIZE_CLASS[size]} ${className ?? ""}`}
    >
      {icon}
      {children}
    </span>
  );
}

/** Envelope — aparece só quando a cobrança já foi enviada; ausência significa "não enviada". */
export function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 4.5l6 4 6-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
