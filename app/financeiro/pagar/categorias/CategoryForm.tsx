"use client";

import { useActionState } from "react";
import type { CategoryRow } from "@/lib/payables";
import { mergeCategoryAction, saveCategoryAction, type FormState } from "../actions";

const initial: FormState = {};
const FIELD =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
const LABEL = "block text-[11px] font-semibold text-neutral-ink mb-1";

export function CategoryForm({ category }: { category?: CategoryRow }) {
  const [state, formAction, pending] = useActionState(saveCategoryAction, initial);
  const editing = Boolean(category);

  return (
    <form
      action={formAction}
      className={
        editing
          ? "rounded-xl border border-border bg-white p-4"
          : "rounded-2xl border border-border bg-white p-5 shadow-sm"
      }
    >
      {category && <input type="hidden" name="id" value={category.id} />}
      {!editing && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-ink">
          Nova categoria
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label className={LABEL}>
            Nome <span className="text-overdue-ink">*</span>
          </label>
          <input name="name" required defaultValue={category?.name} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Cor</label>
          <input
            name="color"
            type="color"
            defaultValue={category?.color ?? "#71717A"}
            aria-label="Cor da categoria"
            className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-white p-1"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? "Salvando..." : editing ? "Salvar" : "Cadastrar"}
        </button>
      </div>

      {state.error && (
        <p className="mt-3 rounded-lg border border-pending-line bg-pending-bg px-3 py-2 text-xs text-pending-ink">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** Move as contas para outra categoria e arquiva esta — o jeito seguro de "excluir" uma categoria em uso. */
export function MergeCategoryForm({
  from,
  options,
}: {
  from: CategoryRow;
  options: { id: string; name: string }[];
}) {
  if (options.length === 0) {
    return (
      <p className="text-[11px] text-secondary-ink">
        Cadastre outra categoria para poder mesclar esta.
      </p>
    );
  }

  return (
    <form action={mergeCategoryAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="fromId" value={from.id} />
      <div className="min-w-48 flex-1">
        <label className={LABEL}>Mesclar em</label>
        <select name="toId" required defaultValue="" className={FIELD}>
          <option value="" disabled>
            Escolha a categoria de destino
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-white px-4 text-xs font-semibold text-neutral-ink transition-colors hover:text-ink"
      >
        Mesclar e arquivar
      </button>
      <p className="w-full text-[11px] text-secondary-ink">
        As contas passam para a categoria escolhida e esta é arquivada.
      </p>
    </form>
  );
}
