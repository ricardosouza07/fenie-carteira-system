do $$
begin
  create type public.customer_portfolio_status as enum (
    'ativo',
    'fechou_salao',
    'mudou_de_ramo',
    'sem_potencial',
    'duplicado',
    'arquivado'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.customers
  add column if not exists portfolio_status public.customer_portfolio_status not null default 'ativo',
  add column if not exists portfolio_status_note text;

create index if not exists idx_customers_portfolio_status
  on public.customers (portfolio_status);
