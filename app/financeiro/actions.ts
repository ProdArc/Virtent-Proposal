"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { bulkSetSegment } from "@/lib/financial";

export interface BulkActionResult {
  error?: string;
}

/** Classifica o segmento de vários clientes de uma vez — chamada direto pelo client, sem passar por <form>. */
export async function bulkSetSegmentAction(
  clientIds: string[],
  segment: string
): Promise<BulkActionResult> {
  const authError = await requireSession();
  if (authError) return { error: authError };

  if (clientIds.length === 0) return { error: "Nenhum cliente selecionado." };
  const trimmed = segment.trim();
  if (!trimmed) return { error: "Informe o segmento a aplicar." };

  try {
    await bulkSetSegment(clientIds, trimmed);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao atualizar segmento." };
  }

  revalidatePath("/financeiro");
  return {};
}
