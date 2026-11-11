-- Contas avulsas a receber: cobrança pontual que não vem de mensalidade,
-- implantação nem repasse Meta (ex: serviço avulso, reembolso). Nasce
-- pendente e só vira caixa quando marcada como recebida — mirror simplificado
-- de payables (sem fornecedor/categoria, o volume aqui é baixo).
create table if not exists manual_receivables (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  counterpart text,
  amount numeric(12,2) not null check (amount > 0),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'received', 'canceled')),
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists manual_receivables_status_idx on manual_receivables (status, due_date);

alter table cash_movements drop constraint cash_movements_source_type_check;
alter table cash_movements add constraint cash_movements_source_type_check
  check (source_type in ('client_setup', 'billing', 'payable', 'manual_receivable'));
