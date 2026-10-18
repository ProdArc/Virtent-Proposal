"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, requireSession } from "@/lib/auth";
import { removeAvatar, uploadAvatar } from "@/lib/profile";

export async function uploadAvatarAction(formData: FormData): Promise<void> {
  const authError = await requireSession();
  if (authError) throw new Error(authError);

  const username = await getSessionUser();
  if (!username) throw new Error("Não autorizado.");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Selecione uma foto.");

  await uploadAvatar(username, file);
  revalidatePath("/financeiro/config");
}

export async function removeAvatarAction(): Promise<void> {
  const authError = await requireSession();
  if (authError) throw new Error(authError);

  const username = await getSessionUser();
  if (!username) throw new Error("Não autorizado.");

  await removeAvatar(username);
  revalidatePath("/financeiro/config");
}
