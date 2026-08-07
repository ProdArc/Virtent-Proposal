"use client";

import { useActionState } from "react";
import { ConfirmButton } from "@/app/financeiro/[id]/ConfirmButton";
import { reverseManualMovementAction, type FormState } from "../actions";

const initial: FormState = {};

/** Única correção que o extrato oferece direto — só serve pra entrada manual, que não tem cadastro próprio pra ajustar. */
export function ReverseManualButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(reverseManualMovementAction, initial);

  return (
    <form
      action={formAction}
      onClick={(e) => e.stopPropagation()}
      className="shrink-0"
    >
      <input type="hidden" name="id" value={id} />
      <ConfirmButton
        confirmText="Estornar esta entrada manual? O valor sai do saldo e fica registrado no extrato como estorno."
        className="text-[10.5px] font-semibold text-overdue-ink hover:text-overdue-ink/80 transition-colors disabled:opacity-60"
      >
        {pending ? "Estornando..." : "Estornar"}
      </ConfirmButton>
      {state.error && <p className="mt-1 max-w-[10rem] text-[10px] text-overdue-ink">{state.error}</p>}
    </form>
  );
}
