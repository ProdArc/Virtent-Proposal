-- Caixa unificado: livro de movimentações alimentado pelos dois módulos.
--
-- Por que uma tabela e não derivar de paid_at: pagamento PARCIAL de conta a
-- pagar não tem data própria no modelo de origem (só paid_amount acumulado),
-- então o histórico "R$ 400 no dia 8, R$ 600 no dia 20" só existe se for
-- registrado. Derivar perderia isso.

create table if not exists cash_movements (
  id uuid primary key default gen_random_uuid(),
  -- Data da AÇÃO (quando o dinheiro se moveu), não do vencimento. Conta que
  -- vencia dia 5 e foi paga dia 8 movimenta o caixa no dia 8.
  occurred_at timestamptz not null default now(),
  direction text not null check (direction in ('in', 'out')),
  amount numeric(12,2) not null check (amount > 0),
  -- Separa os tipos de receita/despesa sem depender do texto da descrição.
  kind text not null check (kind in ('opening', 'setup', 'monthly', 'payable')),
  description text not null,
  counterpart text,            -- nome do cliente ou fornecedor, congelado no momento do lançamento

  -- Origem: permite voltar para o card e evita lançar a mesma ação duas vezes.
  -- Sem FK de propósito: se a conta de origem for excluída, o histórico do
  -- caixa continua íntegro (auditoria), só perde o link de navegação.
  source_type text check (source_type in ('client_setup', 'billing', 'payable')),
  source_id uuid,

  -- Estorno: em vez de apagar, lança o inverso apontando para o original.
  reverses_id uuid references cash_movements(id) on delete set null,

  created_at timestamptz not null default now()
);

create index if not exists cash_movements_occurred_idx on cash_movements (occurred_at desc);
create index if not exists cash_movements_source_idx on cash_movements (source_type, source_id);

-- Baixa de recebível é binária (paga ou não): no máximo UMA movimentação viva
-- por origem. Conta a pagar aceita vários pagamentos parciais, então fica de
-- fora desta trava.
create unique index if not exists cash_movements_unique_receivable
  on cash_movements (source_type, source_id)
  where source_type in ('client_setup', 'billing') and reverses_id is null;

-- Só um saldo inicial.
create unique index if not exists cash_movements_single_opening
  on cash_movements ((kind))
  where kind = 'opening';

-- Saldo agregado no banco: uma linha, sem trazer o extrato inteiro pra somar
-- na aplicação.
create or replace view cash_balance as
select
  coalesce(sum(case when direction = 'in' then amount else -amount end), 0)::numeric(14,2) as balance,
  coalesce(sum(case when direction = 'in' then amount else 0 end), 0)::numeric(14,2) as total_in,
  coalesce(sum(case when direction = 'out' then amount else 0 end), 0)::numeric(14,2) as total_out,
  count(*) as movements
from cash_movements;
