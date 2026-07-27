import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { Content } from "@/lib/content";

export type ProposalStatus = "rascunho" | "enviada" | "visualizada";

export interface ProposalRow {
  id: string;
  slug: string;
  client_name: string;
  status: ProposalStatus;
  content: Content;
  created_at: string;
  updated_at: string;
}

export type ProposalListItem = Omit<ProposalRow, "content">;

/** Busca uma proposta completa (com o content JSON) pelo slug da URL. */
export async function getProposalBySlug(slug: string): Promise<ProposalRow | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar proposta "${slug}": ${error.message}`);
  }

  return data as ProposalRow | null;
}

/** Lista todas as propostas para a página de histórico — sem o content (JSON pesado, desnecessário aqui). */
export async function listProposals(): Promise<ProposalListItem[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("proposals")
    .select("id, slug, client_name, status, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Falha ao listar propostas: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Marca a proposta como visualizada na primeira vez que o cliente abre o link
 * (só transiciona de "enviada" — chamado sempre que a página carrega, mas o
 * filtro por status evita reescrever a cada visita e evita promover um
 * "rascunho" que a própria agência está revisando).
 */
export async function markProposalViewed(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("proposals")
    .update({ status: "visualizada", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error(`Falha ao marcar proposta ${id} como visualizada:`, error.message);
  }
}
