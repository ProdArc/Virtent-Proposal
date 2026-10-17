"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createConnectToken } from "@/lib/pluggy";
import { removeConnection, saveConnection, syncAllConnections } from "@/lib/pluggy-connections";

export interface ConnectResult {
  token?: string;
  error?: string;
}

/** Chamado pelo widget ao abrir — o token do client nunca vê o CLIENT_SECRET, só esse token de curta duração. */
export async function createConnectTokenAction(): Promise<ConnectResult> {
  const authError = await requireSession();
  if (authError) return { error: authError };

  try {
    const token = await createConnectToken();
    return { token };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao gerar token de conexão." };
  }
}

export interface SaveResult {
  ok?: boolean;
  error?: string;
}

/** Chamado pelo onSuccess do widget, com o item.id da conexão recém-criada. */
export async function saveConnectionAction(itemId: string): Promise<SaveResult> {
  const authError = await requireSession();
  if (authError) return { error: authError };

  try {
    await saveConnection(itemId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao salvar a conexão." };
  }

  revalidatePath("/financeiro/caixa/banco/conectar");
  return { ok: true };
}

export async function removeConnectionAction(formData: FormData): Promise<void> {
  const authError = await requireSession();
  if (authError) throw new Error(authError);

  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Conexão inválida.");

  await removeConnection(id);
  revalidatePath("/financeiro/caixa/banco/conectar");
}

export async function syncNowAction(): Promise<void> {
  const authError = await requireSession();
  if (authError) throw new Error(authError);

  await syncAllConnections();
  revalidatePath("/financeiro/caixa/banco/conectar");
  revalidatePath("/financeiro/caixa/banco");
}
