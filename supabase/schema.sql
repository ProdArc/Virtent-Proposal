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
