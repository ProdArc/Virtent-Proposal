"use server";

import { requireSession } from "@/lib/auth";
import { createProposal } from "@/lib/proposals";

export interface NewProposalState {
  error?: string;
  success?: { slug: string };
}

export async function createProposalAction(
  _prevState: NewProposalState,
  formData: FormData
): Promise<NewProposalState> {
  // Defesa em profundidade — o proxy.ts já protege /propostas/:path*, mas a
  // doc do Next recomenda não confiar só nisso pra Server Actions.
  const authError = await requireSession();
  if (authError) {
    return { error: authError };
  }

  const clientName = String(formData.get("clientName") || "").trim();
  const consultantName = String(formData.get("consultantName") || "").trim();
  const date = String(formData.get("date") || "").trim();
  const validUntil = String(formData.get("validUntil") || "").trim();
  const monthlyPrice = String(formData.get("monthlyPrice") || "").trim();
  const setupPrice = String(formData.get("setupPrice") || "").trim();
  const includeCommission = String(formData.get("billingModel") || "") !== "fixa";

  if (!clientName || !consultantName || !date || !validUntil || !monthlyPrice || !setupPrice) {
    return { error: "Preencha todos os campos." };
  }

  try {
    const { slug } = await createProposal({
      clientName,
      consultantName,
      date,
      validUntil,
      monthlyPrice,
      setupPrice,
      includeCommission,
    });
    return { success: { slug } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido ao criar a proposta." };
  }
}
