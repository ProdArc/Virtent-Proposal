"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, SESSION_COOKIE, validateCredentials } from "@/lib/auth";

export interface LoginState {
  error?: string;
}

/** Só aceita redirecionar pra um caminho local (`/algo`) — nunca uma URL externa (`//evil.com`, `https://...`). */
function safeNextPath(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/painel";
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const next = safeNextPath(formData.get("next"));

  if (!username || !password) {
    return { error: "Preencha usuário e senha." };
  }

  if (!validateCredentials(username, password)) {
    return { error: "Usuário ou senha inválidos." };
  }

  const store = await cookies();
  store.set({
    name: SESSION_COOKIE,
    value: createSessionToken(username),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(next);
}
