-- Concilia uma movimentação de caixa (baixa de cliente, pagamento de conta,
-- entrada manual) com a transação real do extrato bancário que corresponde
-- a ela — prova de que o que o sistema registrou de fato aconteceu no banco.
alter table cash_movements add column if not exists bank_transaction_id uuid references bank_transactions(id) on delete set null;

-- Uma transação bancária só pode provar UMA movimentação de caixa.
create unique index if not exists cash_movements_bank_transaction_unique
  on cash_movements (bank_transaction_id)
  where bank_transaction_id is not null;

-- "reconciled": a transação do extrato foi casada com uma movimentação que
-- já existia (baixa feita manualmente antes de o extrato chegar), em vez de
-- virar uma conta a pagar ou entrada manual nova.
alter table bank_transactions drop constraint if exists bank_transactions_linked_type_check;
alter table bank_transactions add constraint bank_transactions_linked_type_check
  check (linked_type in ('payable', 'manual_income', 'reconciled'));
