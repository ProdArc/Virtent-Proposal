"use client";

import { useRouter } from "next/navigation";

/** Select que navega sozinho ao trocar de valor — filtro server-side via query string, sem estado no client. */
export function FilterSelect({
  name,
  defaultValue,
  options,
  basePath,
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  basePath: string;
}) {
  const router = useRouter();

  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => {
        const value = e.target.value;
        router.push(value ? `${basePath}?${name}=${encodeURIComponent(value)}` : basePath);
      }}
      className="rounded-lg border border-[#E4E4E7] bg-white px-3 py-2 text-sm text-[#18181B] focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
