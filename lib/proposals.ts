import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase";
import { content as baseContent, type Content } from "@/lib/content";

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

export interface NewProposalInput {
  clientName: string;
  consultantName: string;
  date: string;
  validUntil: string;
  monthlyPrice: string;
  setupPrice: string;
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // remove acentos (NFD separa a letra do diacrítico)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function randomSuffix(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * Cria uma proposta nova a partir do template em lib/content.ts, sobrescrevendo
 * só os campos que mudam por cliente. O slug sempre ganha um sufixo aleatório
 * de 6 caracteres — nunca é só o nome do cliente (não pode ser adivinhável).
 */
export async function createProposal(input: NewProposalInput): Promise<{ slug: string }> {
  const supabase = getSupabaseServerClient();

  const proposalContent: Content = structuredClone(baseContent);
  proposalContent.client.name = input.clientName;
  proposalContent.proposal.number = input.consultantName;
  proposalContent.proposal.date = input.date;
  proposalContent.proposal.validUntil = input.validUntil;
  proposalContent.investimento.plan.price = input.monthlyPrice;
  proposalContent.investimento.plan.setupPrice = input.setupPrice;
  proposalContent.meta.title = `Proposta Comercial - Virtent | ${input.clientName}`;
  proposalContent.meta.description = `Proposta de operação virtual Virtent no WhatsApp para ${input.clientName}.`;

  const slug = `${slugify(input.clientName)}-${randomSuffix()}`;

  const { error } = await supabase.from("proposals").insert({
    slug,
    client_name: input.clientName,
    status: "rascunho",
    content: proposalContent,
  });

  if (error) {
    throw new Error(`Falha ao criar proposta: ${error.message}`);
  }

  return { slug };
}
