import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Client server-only com a service role key — nunca importe este módulo a
 * partir de um componente "use client". O `server-only` acima já falha o
 * build se isso acontecer por engano.
 *
 * A criação é lazy (só na primeira chamada) para não derrubar `next build`
 * em ambientes sem as env vars configuradas ainda — só falha quando alguém
 * de fato tenta consultar o banco.
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidos. Veja .env.local.example."
    );
  }

  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return client;
}
