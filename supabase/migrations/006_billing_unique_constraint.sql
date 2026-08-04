-- Trava contra corrida: ensureCurrentBilling (lib/financial.ts) decide se
-- precisa criar o ciclo com um SELECT antes do INSERT. Sem constraint no
-- banco, chamadas concorrentes (abas duplicadas, prefetch etc.) podem todas
-- decidir "ainda não existe" ao mesmo tempo e duplicar a mesma cobrança —
-- foi o que gerou 8000+ linhas repetidas pra um cliente. O código já trata o
-- erro de violação (23505) como "outra chamada já criou, tudo bem".
--
-- Rode isto SÓ DEPOIS de garantir que não há duplicatas de (client_id,
-- due_date) na tabela, senão o ALTER TABLE falha. Se aparecer erro de
-- duplicidade, me avise antes de continuar — significa que ainda tem lixo
-- pra limpar.

alter table financial_billings
  add constraint financial_billings_client_due_date_uniq unique (client_id, due_date);
