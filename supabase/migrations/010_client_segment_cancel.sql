-- Segmento do cliente (texto livre, pra futura parametrização por segmento) e
-- cancelamento (mantém o histórico, só para a geração automática de novas
-- mensalidades — diferente de excluir, que apaga tudo).
alter table financial_clients add column if not exists segment text;
alter table financial_clients add column if not exists canceled_at timestamptz;
