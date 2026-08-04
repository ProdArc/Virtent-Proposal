import { redirect } from "next/navigation";

// Raiz do site — nunca deve expor a proposta de nenhum cliente específico.
// Cada cliente acessa sua proposta por um link direto e não-adivinhável em
// /p/[slug]; a listagem interna para consulta fica em /propostas (protegida).
// Quem cair na raiz (sem link de proposta) vai direto pro login das
// ferramentas internas — /login já redireciona pro /painel se já tiver sessão.

export default function Home() {
  redirect("/login");
}
