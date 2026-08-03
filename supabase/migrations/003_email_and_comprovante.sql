-- E-mail de contato da unidade + comprovante de pagamento (implantação e cada
-- cobrança mensal), separado da NFe.

alter table financial_clients
  add column if not exists email text,
  add column if not exists setup_comprovante_path text;

alter table financial_billings
  add column if not exists comprovante_path text;

-- Bucket privado (igual ao "nfes") pra guardar os comprovantes de pagamento.
insert into storage.buckets (id, name, public)
values ('comprovantes', 'comprovantes', false)
on conflict (id) do nothing;
