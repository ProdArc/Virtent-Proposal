"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * Select que navega sozinho ao trocar de valor — filtro server-side via query
 * string, sem estado no client. Preserva os outros filtros já ativos na URL,
 * pra combinar vários (ex: período + cliente) sem um zerar o outro.
 */
export function FilterSelect({
  name,
  label,
  defaultValue,
  options,
  basePath,
}: {
  name: string;
  label?: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const select = (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value) {
          params.set(name, e.target.value);
        } else {
          params.delete(name);
        }
        const query = params.toString();
        router.push(query ? `${basePath}?${query}` : basePath);
      }}
      className="w-full rounded-2xl border-0 bg-card px-4 py-2.5 text-sm font-medium text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-brand/30"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  if (!label) return select;

  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-xs font-medium text-secondary-ink">{label}</span>
      {select}
    </label>
  );
}
