// Popula a proposta de exemplo (o conteúdo que hoje mora em lib/content.ts)
// no Supabase. Rode com `npm run seed` depois de configurar .env.local.
//
// Usa imports relativos (não o alias "@/*") porque este script roda fora do
// bundler do Next via tsx, e caminhos relativos evitam qualquer ambiguidade
// de resolução de módulo nesse contexto.
//
// Como inserir uma proposta manualmente pelo Supabase Studio depois:
//   1. Table Editor > proposals > Insert row.
//   2. slug: "nome-do-cliente-XXXXXX" — sempre com um sufixo aleatório de 6
//      caracteres no final (veja randomSuffix abaixo). O slug NÃO pode ser
//      adivinhável — é o único controle de acesso da proposta.
//   3. client_name: nome legível do cliente, só pra exibição na listagem.
//   4. status: "rascunho".
//   5. content: o JSON completo (mesmo shape de lib/content.ts) editado pra
//      esse cliente específico.
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { content } from "../lib/content";

function randomSuffix(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

const SLUG = `cartao-de-todos-campinas-sudoeste-${randomSuffix()}`;

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidos em .env.local (veja .env.local.example)."
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("proposals").insert({
    slug: SLUG,
    client_name: content.client.name,
    status: "rascunho",
    content,
  });

  if (error) {
    console.error("Erro ao popular a proposta de exemplo:", error.message);
    process.exit(1);
  }

  console.log(`Proposta de exemplo criada: /p/${SLUG}`);
}

main();
