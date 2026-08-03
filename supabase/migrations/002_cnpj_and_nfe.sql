-- CNPJ do cliente + armazenamento de NFe (PDF/XML) por cobrança mensal.

alter table financial_clients
  add column if not exists cnpj text;

alter table financial_billings
  add column if not exists nfe_path text;

-- Bucket privado no Supabase Storage onde ficam os arquivos de NFe. Acesso
-- só via service role (server-only, lib/supabase.ts) — que ignora RLS — por
-- isso não são necessárias policies de storage.
insert into storage.buckets (id, name, public)
values ('nfes', 'nfes', false)
on conflict (id) do nothing;
