"use client";

import { useFormStatus } from "react-dom";

/** Botão de submit com estado de carregamento automático via useFormStatus — evita duplo clique. */
export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60 disabled:cursor-not-allowed`}>
      {pending ? pendingLabel : children}
    </button>
  );
}
