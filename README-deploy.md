# Deploy

## 1. Banco de dados

No dashboard do [Supabase](https://supabase.com), no SQL Editor do projeto, rode o
conteúdo de `supabase/schema.sql` (cria a tabela `proposals`).

## 2. Deploy na Vercel

1. Conectar o repositório git a um novo projeto na Vercel.
2. Em Project Settings → Environment Variables, configurar as 3 variáveis:

   | Nome                        | Valor                                                    |
   | --------------------------- | --------------------------------------------------------- |
   | `SUPABASE_URL`               | URL do projeto (Project Settings → API no Supabase)       |
   | `SUPABASE_SERVICE_ROLE_KEY`  | Service role key (Project Settings → API no Supabase)     |
   | `ADMIN_PASSWORD`             | Senha para acessar `/propostas`                            |

3. Deploy.

## 3. Popular a proposta de exemplo

Rode localmente, apontando pro Supabase de produção (com o `.env.local` preenchido
com as mesmas credenciais usadas na Vercel):

```bash
npm run seed
```

Isso cria uma proposta de exemplo com slug aleatório e imprime o link completo
(`/p/cartao-de-todos-campinas-sudoeste-XXXXXX`) no terminal.

## 4. Conferir

- `/` — tela neutra, não expõe nenhuma proposta.
- `/propostas` — pede usuário/senha (Basic Auth); qualquer usuário serve, só a
  senha precisa bater com `ADMIN_PASSWORD`. Lista as propostas cadastradas.
- `/p/<slug-gerado-pelo-seed>` — a proposta completa.
- `/p/qualquer-coisa-invalida` — 404.

## Criando uma nova proposta para um cliente

Não existe UI de criação ainda — insira a linha direto no Supabase Studio
(Table Editor → `proposals` → Insert row). O topo de `scripts/seed.ts` documenta
o formato esperado de cada campo, incluindo a regra do slug (sempre com sufixo
aleatório de 6 caracteres, nunca previsível).
