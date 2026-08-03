-- Envio automático de cobrança por e-mail (implantação + mensalidade), cada
-- uma enviada no máximo 1 vez. Implantação ganha seu próprio anexo de NFe
-- (hoje só tinha comprovante de pagamento), igual ao que já existe por
-- cobrança mensal.

alter table financial_clients
  add column if not exists setup_nfe_path text,
  add column if not exists setup_email_sent_at timestamptz;

alter table financial_billings
  add column if not exists email_sent_at timestamptz;
