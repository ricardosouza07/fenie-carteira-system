alter table public.customers
  add column if not exists document text,
  add column if not exists document_normalized text,
  add column if not exists state_registration text,
  add column if not exists legal_name_normalized text,
  add column if not exists trade_name_normalized text,
  add column if not exists city_normalized text,
  add column if not exists last_order_number text,
  add column if not exists registration_date date,
  add column if not exists registration_origin text,
  add column if not exists mercos_situation text,
  add column if not exists b2b_access text,
  add column if not exists segment text,
  add column if not exists customer_tags text,
  add column if not exists next_task text,
  add column if not exists task_date date;

create index if not exists idx_customers_document_normalized
  on public.customers (document_normalized)
  where document_normalized is not null and document_normalized <> '';

create index if not exists idx_customers_legal_name_normalized
  on public.customers (legal_name_normalized)
  where legal_name_normalized is not null and legal_name_normalized <> '';

create index if not exists idx_customers_trade_city_normalized
  on public.customers (trade_name_normalized, city_normalized)
  where trade_name_normalized is not null and trade_name_normalized <> '';
