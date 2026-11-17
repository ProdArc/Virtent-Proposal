"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Busca por nome ou por dígitos do CNPJ (qualquer trecho, não só o início) —
 * útil pra achar quem fez um PIX só com os primeiros/últimos dígitos
 * visíveis no extrato. Filtra no servidor via query string (URL
 * compartilhável), com debounce pra não disparar um render por tecla digitada.
 */
export function SearchInput({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A URL pode mudar por fora (chips de status, voltar do navegador).
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function push(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim()) params.set("q", next.trim());
    else params.delete("q");
    const query = params.toString();
    router.replace(query ? `/financeiro?${query}` : "/financeiro", { scroll: false });
  }

  return (
    <div className="relative">
      <svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-subtle"
      >
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.75" />
        <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        placeholder="Buscar por nome ou CNPJ"
        aria-label="Buscar cliente pelo nome ou CNPJ"
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => push(next), 300);
        }}
        className="w-full rounded-2xl border-0 bg-card py-2.5 pl-11 pr-4 text-sm text-ink shadow-card placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </div>
  );
}
