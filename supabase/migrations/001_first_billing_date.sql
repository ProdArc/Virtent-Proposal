-- Adiciona o vencimento explícito da 1ª mensalidade, pra corrigir a geração
-- automática de cobrança que assumia (errado) que o 1º ciclo é sempre o mês
-- calendário corrente. Mensalidade é pós-paga: o 1º vencimento deve ser 1
-- ciclo depois do cadastro do cliente, não "mês atual + dia".

alter table financial_clients
  add column if not exists first_billing_date date;

-- Backfill dos clientes já cadastrados: usa o vencimento da cobrança mais
-- antiga já gerada pra esse cliente (reflete o que já rodou de verdade), ou,
-- se ainda não existe nenhuma cobrança, cai pro dia de vencimento configurado
-- no próximo mês (mesma regra pós-paga que passa a valer daqui pra frente).
update financial_clients c
set first_billing_date = coalesce(
  (select min(b.due_date) from financial_billings b where b.client_id = c.id),
  (date_trunc('month', now()) + interval '1 month')::date
    + (least(greatest(c.due_day, 1), 28) - 1)
)
where c.first_billing_date is null;

alter table financial_clients
  alter column first_billing_date set not null;

alter table financial_clients
  alter column first_billing_date set default current_date;
