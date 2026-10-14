"use client";

import { useActionState } from "react";
import type { SupplierRow } from "@/lib/payables";
import { DocumentInput, PhoneInput } from "@/components/ui/MaskedInput";
import { saveSupplierAction, type FormState } from "../actions";

const initial: FormState = {};
const FIELD =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
const LABEL = "block text-[11px] font-semibold text-neutral-ink mb-1";

/** Mesmo formulário serve pra criar (sem `supplier`) e editar (com). */
export function SupplierForm({ supplier }: { supplier?: SupplierRow }) {
  const [state, formAction, pending] = useActionState(saveSupplierAction, initial);
  const editing = Boolean(supplier);

  return (
    <form
      action={formAction}
      className={
        editing
          ? "rounded-2xl border border-hairline bg-white p-4"
          : "rounded-3xl bg-white shadow-card p-5"
      }
    >
      {supplier && <input type="hidden" name="id" value={supplier.id} />}
      {!editing && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-ink">
          Novo fornecedor
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="sm:col-span-2">
          <label className={LABEL}>
            Nome / razão social <span className="text-overdue-ink">*</span>
          </label>
          <input name="name" required defaultValue={supplier?.name} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>CNPJ / CPF</label>
          <DocumentInput name="document" defaultValue={supplier?.document} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Telefone</label>
          <PhoneInput name="phone" defaultValue={supplier?.phone} className={FIELD} />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>E-mail</label>
          <input name="email" type="email" defaultValue={supplier?.email ?? ""} className={FIELD} />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>Observações</label>
          <textarea name="notes" rows={2} defaultValue={supplier?.notes ?? ""} className={FIELD} />
        </div>
      </div>

      {state.error && (
        <p className="mb-3 rounded-lg border border-pending-line bg-pending-bg px-3 py-2 text-xs text-pending-ink">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60 min-h-10"
      >
        {pending ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar fornecedor"}
      </button>
    </form>
  );
}
