import Link from "next/link";

/** Abas do painel financeiro — os dois módulos são o mesmo sistema, não dois. */
export function FinanceTabs({ active }: { active: "receber" | "pagar" }) {
  const tabs = [
    { key: "receber" as const, label: "Contas a receber", href: "/financeiro" },
    { key: "pagar" as const, label: "Contas a pagar", href: "/financeiro/pagar" },
  ];

  return (
    <div className="inline-flex rounded-lg border border-border bg-white p-1">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
              isActive ? "bg-brand text-white" : "text-neutral-ink hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
