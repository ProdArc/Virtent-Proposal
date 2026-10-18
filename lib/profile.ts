import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase";

/**
 * Foto de perfil por usuário — guardada no bucket privado "avatars" com o
 * próprio nome de usuário como caminho (sem extensão: o Content-Type fica
 * registrado no Storage a partir do upload, então não precisa de tabela só
 * pra isso). `upsert: true` faz trocar a foto só reescrever o mesmo arquivo.
 */
const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export async function uploadAvatar(username: string, file: File): Promise<void> {
  if (!file.type.startsWith("image/")) throw new Error("Envie uma imagem (JPG, PNG, WEBP...).");
  if (file.size > MAX_AVATAR_BYTES) throw new Error("Imagem muito grande — o limite é 5MB.");

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(username, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(`Falha ao enviar a foto: ${error.message}`);
}

export async function removeAvatar(username: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([username]);
  if (error) throw new Error(`Falha ao remover a foto: ${error.message}`);
}

/** URL assinada temporária (1h) — null se o usuário nunca enviou foto. */
export async function getAvatarSignedUrl(username: string): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(username, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}
