-- Formas de cobrança por cliente, marcáveis em combinação:
--   * mensalidade fixa            (bill_fixed       -> monthly_value)
--   * % sobre a arrecadação       (bill_commission  -> commission_pct)
--   * repasse Meta + adicional    (bill_meta        -> meta_fee_per_dispatch)
--
-- O repasse Meta é para quem não tem cartão na conta do WhatsApp (API
-- oficial): a Virtent paga com cartão próprio e repassa o custo da Meta +
-- um adicional por contato DISPARADO (não conta mensagem dentro da janela de
-- atendimento). Vai em boleto separado da mensalidade, então vira uma
-- cobrança própria (kind = 'meta') no mesmo ciclo, com baixa, NFe, PIX e
-- e-mail independentes.

alter table financial_clients add column if not exists bill_fixed boolean not null default true;
alter table financial_clients add column if not exists bill_commission boolean not null default false;
alter table financial_clients add column if not exists bill_meta boolean not null default false;
alter table financial_clients add column if not exists meta_fee_per_dispatch numeric(10,4) not null default 0.005;
-- Vencimento do 1º repasse Meta. Separado do `first_billing_date` porque o
-- repasse costuma ser ligado depois: sem isso, ativar num cliente antigo
-- geraria repasses vazios pra todos os meses passados.
alter table financial_clients add column if not exists meta_first_billing_date date;

-- Clientes existentes: deduz as formas do que já estava cadastrado.
update financial_clients
set bill_fixed = monthly_value > 0,
    bill_commission = commission_pct > 0;

alter table financial_billings add column if not exists kind text not null default 'monthly'
  check (kind in ('monthly', 'meta'));
alter table financial_billings add column if not exists meta_dispatches integer not null default 0;
alter table financial_billings add column if not exists meta_cost numeric(12,2) not null default 0;
-- Snapshot do adicional por disparo no momento da geração, como monthly_value/commission_pct.
alter table financial_billings add column if not exists meta_fee_per_dispatch numeric(10,4) not null default 0;

-- Agora pode haver 2 cobranças no mesmo ciclo (mensalidade + repasse Meta):
-- a trava contra duplicata passa a ser por tipo.
alter table financial_billings drop constraint if exists financial_billings_client_due_date_uniq;
alter table financial_billings
  add constraint financial_billings_client_due_date_kind_uniq unique (client_id, due_date, kind);
