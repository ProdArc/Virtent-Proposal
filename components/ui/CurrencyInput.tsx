"use client";

import { useState } from "react";

/** Trata os dígitos digitados como centavos (mesma UX de app bancário: "220000" -> "2.200,00"). */
function formatFromDigits(digits: string): string {
  const clean = digits.replace(/\D/g, "");
  if (clean === "") return "";
  const cents = parseInt(clean, 10);
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFromNumber(value: number): string {
  if (!value) return "";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Input de moeda com máscara em tempo real (formato pt-BR: "." milhar, "," decimal).
 * O valor mascarado é o que vai no `name` do form — `parseDecimalInput` em
 * lib/financial.ts sabe converter esse formato de volta pra número.
 */
export function CurrencyInput({
  id,
  name,
  defaultValue,
  required,
  className,
}: {
  id?: string;
  name: string;
  defaultValue?: number;
  required?: boolean;
  className?: string;
}) {
  const [display, setDisplay] = useState(() => formatFromNumber(defaultValue ?? 0));

  return (
    <div
      className={`flex items-center rounded-lg border border-[#E4E4E7] bg-white focus-within:ring-2 focus-within:ring-[#065F46]/30 focus-within:border-[#065F46] ${className ?? ""}`}
    >
      <span className="pl-3 text-sm text-[#A1A1AA] select-none">R$</span>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        required={required}
        placeholder="0,00"
        value={display}
        onChange={(e) => setDisplay(formatFromDigits(e.target.value))}
        className="w-full min-w-0 bg-transparent pl-1.5 pr-3 py-2.5 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none"
      />
    </div>
  );
}
