"use client";

import { useState } from "react";
import { formatCnpj } from "@/lib/cnpj";

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
