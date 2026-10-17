-- Contas bancárias conectadas via widget da Pluggy. Guarda só o necessário
-- pra buscar transações (accountId) e sincronizar sob demanda — o resto
-- (credenciais do banco, MFA) fica inteiramente do lado da Pluggy, a gente
-- nunca vê nem armazena.
create table if not exists pluggy_connections (
  id uuid primary key default gen_random_uuid(),
  pluggy_item_id text not null,
  pluggy_account_id text not null unique,
  institution_name text not null,
  account_name text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
