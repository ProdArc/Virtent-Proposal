"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form
      action={formAction}
      className="w-full max-w-sm rounded-2xl border border-[#E4E4E7] bg-white p-8 shadow-sm"
    >
      <input type="hidden" name="next" value={next} />

      <div className="mb-5">
        <label htmlFor="username" className="block text-xs font-semibold text-[#52525B] mb-1.5">
          Usuário
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          autoFocus
          className="w-full rounded-lg border border-[#E4E4E7] px-3 py-2.5 text-sm text-[#18181B] focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
        />
      </div>

      <div className="mb-6">
        <label htmlFor="password" className="block text-xs font-semibold text-[#52525B] mb-1.5">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-[#E4E4E7] px-3 py-2.5 text-sm text-[#18181B] focus:outline-none focus:ring-2 focus:ring-[#065F46]/30 focus:border-[#065F46]"
        />
      </div>

      {state.error && (
        <p className="text-sm text-[#B45309] bg-[#FFF7ED] border border-[#FDBA74]/40 rounded-lg px-3 py-2 mb-5">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center text-sm font-semibold px-5 py-2.5 rounded-lg bg-[#065F46] text-white hover:bg-[#047857] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
