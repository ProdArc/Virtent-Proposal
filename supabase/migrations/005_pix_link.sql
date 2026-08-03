-- Link/copia-e-cola de cobrança PIX, um por implantação e um por ciclo de
-- mensalidade. Vira condição obrigatória (junto com e-mail + NFe) pra liberar
-- o envio da cobrança por e-mail — ver lib/email.ts.

alter table financial_clients
  add column if not exists setup_pix_link text;

alter table financial_billings
  add column if not exists pix_link text;
