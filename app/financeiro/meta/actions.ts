"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { parseDecimalInput, updateBillingMeta } from "@/lib/financial";
import { parseIntegerInput } from "@/lib/billing-methods";

export async function updateMetaBillingAction(formData: FormData): Promise<void> {
  const authError = await requireSession();
  if (authError) throw new Error(authError);

  const billingId = String(formData.get("billingId") || "");
  if (!billingId) throw new Error("Cobrança inválida.");

  const dispatches = parseIntegerInput(String(formData.get("metaDispatches") || "")) ?? 0;
  const metaCost = parseDecimalInput(String(formData.get("metaCost") || "")) ?? 0;
  await updateBillingMeta(billingId, dispatches, metaCost);
  revalidatePath("/financeiro/meta");
}
