/**
 * Selo da categoria. Usa a cor cadastrada como ponto + texto neutro, em vez de
 * pintar o selo inteiro: a cor de categoria não pode competir com a de status
 * (verde/âmbar/vermelho), que é a que carrega urgência.
 */
export function CategoryTag({
  name,
  color,
  archived = false,
}: {
  name: string;
  color: string;
  archived?: boolean;
}) {
  return (
    <span
      title={archived ? `${name} (categoria arquivada)` : name}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-white px-2 py-0.5 text-[10.5px] font-medium text-neutral-ink"
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="truncate">{name}</span>
      {archived && <span className="shrink-0 text-secondary-ink">(arquivada)</span>}
    </span>
  );
}
