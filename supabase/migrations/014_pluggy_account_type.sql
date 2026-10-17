-- Guarda o tipo da conta ("BANK" = corrente/poupança, tem saldo em dinheiro;
-- "CREDIT" = cartão, não tem) pra filtrar o painel de saldo real do Caixa,
-- que só faz sentido pra contas do tipo BANK.
alter table pluggy_connections
  add column if not exists account_type text not null default 'BANK';
