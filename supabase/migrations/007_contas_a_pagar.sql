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
