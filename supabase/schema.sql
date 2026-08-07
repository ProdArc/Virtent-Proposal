-- Multi-tenant: uma linha por proposta/cliente.
-- O campo `content` guarda o mesmo shape que hoje vive em lib/content.ts.

create table proposals (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  client_name text not null,
  status text not null default 'rascunho', -- rascunho | enviada | visualizada
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index proposals_slug_idx on proposals (slug);

-- Controle financeiro: um cliente por linha, com dados de implantação e mensalidade recorrente.
create table financial_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  email text, -- e-mail de contato da unidade
  setup_value numeric(12,2) not null default 0,
  setup_due_date date,
  setup_paid boolean not null default false,
  setup_paid_at timestamptz,
  setup_comprovante_path text, -- caminho do comprovante de pagamento da implantação no bucket "comprovantes"
  setup_nfe_path text, -- caminho da NFe da implantação no bucket "nfes"
  setup_pix_link text, -- link/copia-e-cola da cobrança PIX da implantação, exigido pra liberar o envio do e-mail
  setup_email_sent_at timestamptz, -- cobrança de implantação só é enviada por e-mail 1 vez
  monthly_value numeric(12,2) not null default 0,
  commission_pct numeric(5,2) not null default 5,
  due_day smallint not null default 10, -- dia do mês em que a mensalidade vence (1-28)
  first_billing_date date not null default current_date, -- vencimento da 1ª mensalidade (pós-pago: normalmente 1 ciclo após o cadastro)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Uma linha por ciclo de cobrança mensal (mensalidade + comissão sobre arrecadação).
create table financial_billings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references financial_clients(id) on delete cascade,
  due_date date not null,
  monthly_value numeric(12,2) not null,   -- snapshot do valor no momento da geração
  commission_pct numeric(5,2) not null,   -- snapshot do percentual no momento da geração
  revenue_amount numeric(12,2) not null default 0, -- valor arrecadado informado pelo usuário
  paid boolean not null default false,
  paid_at timestamptz,
  nfe_path text, -- caminho do arquivo da NFe no bucket "nfes" do Supabase Storage
  comprovante_path text, -- caminho do comprovante de pagamento no bucket "comprovantes"
  pix_link text, -- link/copia-e-cola da cobrança PIX do ciclo, exigido pra liberar o envio do e-mail
  email_sent_at timestamptz, -- cobrança de cada referência/mês só é enviada por e-mail 1 vez
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Trava contra corrida: ensureCurrentBilling (lib/financial.ts) pode ser
  -- chamada concorrentemente (2 abas, prefetch do Next.js etc.) e decide se
  -- cria o ciclo com um SELECT antes do INSERT — sem essa constraint, duas
  -- chamadas simultâneas podem ambas decidir "não existe ainda" e duplicar.
  unique (client_id, due_date)
);

create index financial_billings_client_idx on financial_billings (client_id);

-- Buckets privados onde ficam os anexos (NFe e comprovantes de pagamento).
-- Acesso só via service role (server-only, ver lib/supabase.ts), que ignora
-- RLS — por isso não há policies de storage aqui.
insert into storage.buckets (id, name, public)
values ('nfes', 'nfes', false), ('comprovantes', 'comprovantes', false)
on conflict (id) do nothing;
-- Contas a pagar: fornecedores, categorias e contas.
-- Espelha o modelo de contas a receber (financial_clients/financial_billings),
-- mas com relacionamentos de verdade em vez de texto livre.

create table if not exists payable_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,                 -- CNPJ ou CPF
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payable_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#71717A',  -- selo da categoria; não compete com a cor de status
  -- Arquivar em vez de excluir: as contas já lançadas continuam válidas e
  -- mantêm a categoria no histórico. Categoria arquivada some dos formulários
  -- mas segue aparecendo em quem já a usava.
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payables (
  id uuid primary key default gen_random_uuid(),
  -- restrict: não deixa apagar fornecedor/categoria com conta lançada; o
  -- caminho é arquivar a categoria ou reclassificar a conta.
  supplier_id uuid not null references payable_suppliers(id) on delete restrict,
  category_id uuid not null references payable_categories(id) on delete restrict,
  title text not null,
  amount numeric(12,2) not null,
  -- Pagamento parcial: quanto já foi pago desta conta. paid_amount > 0 e
  -- menor que amount = "parcialmente paga".
  paid_amount numeric(12,2) not null default 0,
  due_date date not null,
  issue_date date,
  -- Só três valores persistidos. "Atrasada" e "Parcialmente paga" são
  -- DERIVADOS (due_date vs hoje, paid_amount vs amount) pra nunca ficarem
  -- desatualizados por falta de um job rodando.
  status text not null default 'pending',  -- pending | paid | canceled
  payment_method text,                     -- pix | boleto | cartao | transferencia | dinheiro
  account_origin text,                     -- de qual conta/carteira saiu o dinheiro
  cost_center text,
  notes text,
  attachment_path text,                    -- comprovante/NF no bucket "comprovantes"
  -- Recorrência: cada ocorrência é uma linha própria, ligada às irmãs pelo
  -- recurrence_group_id. Assim dá pra editar o valor de um mês (conta de luz)
  -- sem afetar os outros.
  recurrence text,                         -- monthly | weekly | yearly
  recurrence_group_id uuid,
  -- Parcelamento: 2/6, 3/6...
  installment_number smallint,
  installment_total smallint,
  paid_at timestamptz,
  status_changed_at timestamptz,           -- rodapé de "última atualização"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payables_due_date_idx on payables (due_date);
create index if not exists payables_supplier_idx on payables (supplier_id);
create index if not exists payables_category_idx on payables (category_id);
create index if not exists payables_recurrence_group_idx on payables (recurrence_group_id);

-- Categorias iniciais, pra não começar com tela vazia.
-- O "where not exists" torna a migração segura de rodar de novo: só semeia
-- com a tabela vazia, então não duplica a lista nem ressuscita categoria que
-- você tenha apagado depois.
insert into payable_categories (name, color)
select seed.name, seed.color
from (values
  ('Aluguel', '#2a78d6'),
  ('Folha / Pró-labore', '#7c3aed'),
  ('Impostos', '#b91c1c'),
  ('Software / Assinaturas', '#0891b2'),
  ('Marketing', '#eb6834'),
  ('Fornecedores de serviço', '#1baf7a'),
  ('Manutenção', '#a16207'),
  ('Outros', '#71717A')
) as seed(name, color)
where not exists (select 1 from payable_categories);


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
  kind text not null check (kind in ('opening', 'setup', 'monthly', 'payable', 'manual')),
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
