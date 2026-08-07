-- Entrada manual de caixa: aporte, devolução e outras receitas que não vêm
-- de uma baixa de cliente. Continua sem exclusão — corrige-se com estorno,
-- igual ao resto do livro (ver reverseManualMovement em lib/cash.ts).
alter table cash_movements drop constraint cash_movements_kind_check;
alter table cash_movements add constraint cash_movements_kind_check
  check (kind in ('opening', 'setup', 'monthly', 'payable', 'manual'));
