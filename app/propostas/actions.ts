"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { deleteProposal } from "@/lib/proposals";

export async function deleteProposalAction(formData: FormData): Promise<void> {
  // Defesa em profundidade — o proxy.ts já protege /propostas/:path*, mas a
  // doc do Next recomenda não confiar só nisso pra Server Actions.
  const authError = await requireSession();
  if (authError) throw new Error(authError);

  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Proposta inválida.");

  await deleteProposal(id);
  revalidatePath("/propostas");
}
