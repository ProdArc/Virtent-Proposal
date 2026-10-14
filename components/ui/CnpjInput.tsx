"use client";

import { useState } from "react";

/** Máscara em tempo real de CNPJ ("12345678000199" -> "12.345.678/0001-99"). */
function formatCnpj(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function CnpjInput({
  id,
  name,
  defaultValue,
  className,
}: {
  id?: string;
  name: string;
  defaultValue?: string | null;
  className?: string;
}) {
  const [display, setDisplay] = useState(() => formatCnpj(defaultValue ?? ""));

  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      placeholder="00.000.000/0000-00"
      value={display}
      onChange={(e) => setDisplay(formatCnpj(e.target.value))}
      className={
        className ??
        "w-full rounded-lg border border-border px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
      }
    />
  );
}
