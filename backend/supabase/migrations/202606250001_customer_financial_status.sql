do $$
begin
  create type public.customer_financial_status as enum (
    'adimplente',
    'inadimplente',
    'bloqueado',
    'negociacao'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.customers
  add column if not exists financial_status public.customer_financial_status not null default 'adimplente',
  add column if not exists financial_note text;

create index if not exists idx_customers_financial_status
  on public.customers (financial_status);
