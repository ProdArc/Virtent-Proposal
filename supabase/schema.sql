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
  setup_value numeric(12,2) not null default 0,
  setup_due_date date,
  setup_paid boolean not null default false,
  setup_paid_at timestamptz,
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index financial_billings_client_idx on financial_billings (client_id);

-- Bucket privado onde ficam os arquivos de NFe (PDF/XML) das cobranças.
-- Acesso só via service role (server-only, ver lib/supabase.ts), que ignora
-- RLS — por isso não há policies de storage aqui.
insert into storage.buckets (id, name, public)
values ('nfes', 'nfes', false)
on conflict (id) do nothing;
