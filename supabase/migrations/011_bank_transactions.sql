-- Extrato bancário via Open Finance (Pluggy): fila de triagem. Cada linha é
-- uma movimentação que JÁ aconteceu na conta real — o usuário classifica
-- (categoria + observação) e manda pra conta a pagar ou pro caixa como
-- entrada avulsa, ou ignora (já contabilizada por outro caminho). Nada aqui
-- é fonte de verdade: é só uma fila que esvazia, não um livro contábil —
-- quem registra o dinheiro de fato é sempre payables/cash_movements.
create table if not exists bank_transactions (
  id uuid primary key default gen_random_uuid(),
  -- Chave de idempotência: o mesmo evento de webhook pode chegar mais de uma
  -- vez, e a mesma transação pode aparecer em mais de uma sincronização.
  pluggy_transaction_id text not null unique,
  pluggy_account_id text not null,
  occurred_at date not null,
  description text not null,          -- descrição crua que veio do banco
  amount numeric(12,2) not null check (amount > 0),
  direction text not null check (direction in ('in', 'out')),
  category text,                      -- classificação do usuário (não a do banco)
  note text,                          -- observação livre
  status text not null default 'pending' check (status in ('pending', 'linked', 'dismissed')),
  linked_type text check (linked_type in ('payable', 'manual_income')),
  linked_id uuid,                     -- id da payable, quando linked_type = 'payable'
  raw jsonb,                          -- payload original da Pluggy, pra depuração
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bank_transactions_status_idx on bank_transactions (status, occurred_at desc);
