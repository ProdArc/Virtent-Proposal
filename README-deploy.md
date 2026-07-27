# Deploy

## 1. Banco de dados

No dashboard do [Supabase](https://supabase.com), no SQL Editor do projeto, rode o
conteúdo de `supabase/schema.sql` (cria a tabela `proposals`).

## 2. Deploy na Vercel

1. Conectar o repositório git a um novo projeto na Vercel.
2. Em Project Settings → Environment Variables, configurar as 4 variáveis:

   | Nome                        | Valor                                                    |
   | --------------------------- | --------------------------------------------------------- |
   | `SUPABASE_URL`               | URL do projeto (Project Settings → API no Supabase)       |
   | `SUPABASE_SERVICE_ROLE_KEY`  | Service role key (Project Settings → API no Supabase)     |
   | `ADMIN_PASSWORD`             | Senha para acessar `/propostas`                            |
   | `NEXT_PUBLIC_SITE_URL`       | O domínio de produção, ex: `https://virtent-proposal.vercel.app` (sem barra no final) |

3. Deploy.
4. **Importante:** sempre acesse o projeto pelo domínio de produção
   (`https://virtent-proposal.vercel.app`), não pelas URLs de deployment com hash
   que a Vercel gera a cada push (ex: `virtent-proposal-1uqnbo8f9-....vercel.app`).
   Essas URLs de deployment são protegidas por login da própria Vercel
   (Deployment Protection) — um cliente sem conta na Vercel não consegue abrir.
   Só o domínio de produção fica público.

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

Acesse `/propostas/nova` (mesma senha de `/propostas`) e preencha o formulário —
gera o slug com sufixo aleatório automaticamente e mostra o link pronto pra copiar.

Pra campos que o formulário não cobre (ex: features, seções inteiras), edite
direto no Supabase Studio depois de criada (Table Editor → `proposals` → coluna
`content`).
