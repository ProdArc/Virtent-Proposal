"use client";

import { useState } from "react";
import { documentKind, formatDocument, formatPhone } from "@/lib/format";

const FIELD =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

/**
 * Campo com máscara em tempo real. O valor mascarado é o que vai no form —
 * `lib/format.ts` reformata o mesmo dado na exibição, então entrada e leitura
 * nunca divergem.
 */
function Masked({
  name,
  id,
  defaultValue,
  placeholder,
  format,
  inputMode = "numeric",
  className,
  hint,
}: {
  name: string;
  id?: string;
  defaultValue?: string | null;
  placeholder?: string;
  format: (value: string) => string;
  inputMode?: "numeric" | "tel";
  className?: string;
  hint?: string;
}) {
  const [value, setValue] = useState(() => format(defaultValue ?? ""));

  return (
    <>
      <input
        id={id}
        name={name}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(format(e.target.value))}
        className={className ?? FIELD}
      />
      {hint && <p className="mt-1 text-[11px] text-secondary-ink">{hint}</p>}
    </>
  );
}

/** CPF ou CNPJ no mesmo campo — a máscara se ajusta pelo número de dígitos. */
export function DocumentInput({
  name,
  id,
  defaultValue,
  className,
}: {
  name: string;
  id?: string;
  defaultValue?: string | null;
  className?: string;
}) {
  const [kind, setKind] = useState(() => documentKind(defaultValue ?? ""));
  const [value, setValue] = useState(() => formatDocument(defaultValue ?? ""));

  return (
    <>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="CPF ou CNPJ"
        value={value}
        onChange={(e) => {
          const next = formatDocument(e.target.value);
          setValue(next);
          setKind(documentKind(next));
        }}
        className={className ?? FIELD}
      />
      <p className="mt-1 text-[11px] text-secondary-ink">
        {kind ? `${kind} reconhecido` : "Aceita CPF (11 dígitos) ou CNPJ (14)"}
      </p>
    </>
  );
}

export function PhoneInput({
  name,
  id,
  defaultValue,
  className,
}: {
  name: string;
  id?: string;
  defaultValue?: string | null;
  className?: string;
}) {
  return (
    <Masked
      id={id}
      name={name}
      defaultValue={defaultValue}
      placeholder="(11) 91234-5678"
      format={formatPhone}
      inputMode="tel"
      className={className}
    />
  );
}
