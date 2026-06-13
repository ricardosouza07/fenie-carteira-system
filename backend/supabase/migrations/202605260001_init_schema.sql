create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

create type public.user_role as enum (
  'admin',
  'supervisor',
  'vendedor_interno',
  'vendedor_externo'
);

create type public.customer_health_status as enum (
  'saudavel',
  'atencao',
  'risco',
  'inativo'
);

create type public.work_status as enum (
  'nao_trabalhado',
  'contatado',
  'aguardando',
  'convertido',
  'visita'
);

create type public.customer_type as enum (
  'loja',
  'externo',
  'novo',
  'espontaneo'
);

create type public.interaction_channel as enum (
  'whatsapp',
  'telefone',
  'email',
  'presencial'
);

create type public.follow_up_status as enum (
  'aberto',
  'vencido',
  'concluido'
);

create type public.import_status as enum (
  'rascunho',
  'validada',
  'publicada',
  'erro'
);

create table public.salespeople (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  role public.user_role not null default 'vendedor_interno',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salespeople_role_check check (role in ('vendedor_interno', 'vendedor_externo'))
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  salesperson_id uuid references public.salespeople(id) on delete set null,
  full_name text not null,
  email text not null unique,
  role public.user_role not null default 'vendedor_interno',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.salesperson_aliases (
  id uuid primary key default gen_random_uuid(),
  salesperson_id uuid not null references public.salespeople(id) on delete cascade,
  alias text not null,
  normalized_alias text generated always as (lower(regexp_replace(alias, '[[:space:]]+', ' ', 'g'))) stored,
  created_at timestamptz not null default now(),
  constraint salesperson_aliases_unique unique (salesperson_id, alias)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  legal_name text,
  trade_name text,
  email text,
  phone_primary text,
  phone_normalized text generated always as (regexp_replace(coalesce(phone_primary, ''), '[^0-9]', '', 'g')) stored,
  city text,
  state text,
  district text,
  zip_code text,
  address text,
  assigned_salesperson_id uuid references public.salespeople(id) on delete set null,
  last_order_salesperson_name text,
  last_order_date date,
  last_order_value numeric(12, 2) not null default 0,
  days_without_buying integer not null default 0 check (days_without_buying >= 0),
  average_purchase_cycle_days integer check (average_purchase_cycle_days is null or average_purchase_cycle_days >= 0),
  next_purchase_date date,
  original_situation text,
  health_status public.customer_health_status not null default 'saudavel',
  work_status public.work_status not null default 'nao_trabalhado',
  last_action_label text,
  last_action_at timestamptz,
  source_import_id uuid,
  external_key text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_has_name check (coalesce(nullif(legal_name, ''), nullif(trade_name, '')) is not null)
);

create table public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  kind text not null check (kind in ('telefone', 'email', 'whatsapp', 'outro')),
  value text not null,
  value_normalized text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.portfolio_imports (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  sheet_name text,
  status public.import_status not null default 'rascunho',
  header_row_index integer,
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  invalid_rows integer not null default 0,
  possible_duplicates integer not null default 0,
  recognized_columns integer not null default 0,
  unrecognized_columns integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid references public.profiles(id) on delete set null,
  validated_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers
  add constraint customers_source_import_id_fkey
  foreign key (source_import_id) references public.portfolio_imports(id) on delete set null;

create table public.portfolio_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.portfolio_imports(id) on delete cascade,
  row_number integer not null,
  raw_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb,
  customer_id uuid references public.customers(id) on delete set null,
  is_valid boolean not null default false,
  invalid_reasons text[] not null default '{}',
  duplicate_key text,
  created_at timestamptz not null default now(),
  constraint portfolio_import_rows_unique unique (import_id, row_number)
);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  import_id uuid references public.portfolio_imports(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  salesperson_id uuid references public.salespeople(id) on delete set null,
  health_status public.customer_health_status not null,
  work_status public.work_status not null default 'nao_trabalhado',
  days_without_buying integer not null default 0,
  next_purchase_date date,
  last_order_date date,
  is_current boolean not null default true,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index portfolio_items_one_current_per_customer
  on public.portfolio_items (customer_id)
  where is_current;

create table public.customer_interactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  salesperson_id uuid references public.salespeople(id) on delete set null,
  status public.work_status not null check (status in ('contatado', 'aguardando', 'convertido', 'visita')),
  customer_type public.customer_type not null,
  channel public.interaction_channel not null,
  note text,
  recovered_value numeric(12, 2),
  next_follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  constraint recovered_value_required_when_converted check (
    status <> 'convertido' or recovered_value is not null
  )
);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  interaction_id uuid references public.customer_interactions(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  salesperson_id uuid references public.salespeople(id) on delete set null,
  due_at timestamptz not null,
  status public.follow_up_status not null default 'aberto',
  reason text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  salesperson_id uuid references public.salespeople(id) on delete cascade,
  month date not null,
  target_contacts integer not null default 0 check (target_contacts >= 0),
  target_conversions integer not null default 0 check (target_conversions >= 0),
  target_recovered_value numeric(12, 2) not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_unique_salesperson_month unique (salesperson_id, month)
);

create table public.performance_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  month date not null,
  starts_at date not null,
  ends_at date not null,
  status text not null default 'ativa' check (status in ('ativa', 'inativa')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint performance_campaign_period_check check (ends_at >= starts_at)
);

create table public.performance_campaign_levels (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.performance_campaigns(id) on delete cascade,
  name text not null,
  required_points integer not null check (required_points > 0),
  prize text not null,
  short_description text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint performance_campaign_levels_unique_points unique (campaign_id, required_points)
);

create table public.point_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.performance_campaigns(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  interaction_id uuid references public.customer_interactions(id) on delete set null,
  follow_up_id uuid references public.follow_ups(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  salesperson_id uuid references public.salespeople(id) on delete set null,
  action text not null,
  points integer not null,
  description text not null,
  origin text not null default 'system',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger salespeople_set_updated_at before update on public.salespeople
  for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger portfolio_imports_set_updated_at before update on public.portfolio_imports
  for each row execute function public.set_updated_at();
create trigger follow_ups_set_updated_at before update on public.follow_ups
  for each row execute function public.set_updated_at();
create trigger goals_set_updated_at before update on public.goals
  for each row execute function public.set_updated_at();
create trigger performance_campaigns_set_updated_at before update on public.performance_campaigns
  for each row execute function public.set_updated_at();
create trigger performance_campaign_levels_set_updated_at before update on public.performance_campaign_levels
  for each row execute function public.set_updated_at();

create index idx_salespeople_name_trgm on public.salespeople using gin (name gin_trgm_ops);
create index idx_salesperson_aliases_normalized on public.salesperson_aliases (normalized_alias);

create index idx_profiles_salesperson_id on public.profiles (salesperson_id);
create index idx_profiles_role on public.profiles (role);

create index idx_customers_display_name_trgm on public.customers
  using gin ((coalesce(trade_name, legal_name, '')) gin_trgm_ops);
create index idx_customers_phone_normalized on public.customers (phone_normalized);
create index idx_customers_salesperson on public.customers (assigned_salesperson_id);
create index idx_customers_health_status on public.customers (health_status);
create index idx_customers_work_status on public.customers (work_status);
create index idx_customers_city on public.customers (city);
create index idx_customers_last_order_date on public.customers (last_order_date);
create index idx_customers_next_purchase_date on public.customers (next_purchase_date);
create index idx_customers_source_import_id on public.customers (source_import_id);

create index idx_customer_contacts_customer_id on public.customer_contacts (customer_id);
create index idx_customer_contacts_normalized on public.customer_contacts (value_normalized);

create index idx_portfolio_imports_status on public.portfolio_imports (status);
create index idx_portfolio_imports_published_at on public.portfolio_imports (published_at);
create index idx_portfolio_import_rows_import_id on public.portfolio_import_rows (import_id);
create index idx_portfolio_import_rows_duplicate_key on public.portfolio_import_rows (duplicate_key);

create index idx_portfolio_items_current on public.portfolio_items (is_current)
  where is_current;
create index idx_portfolio_items_salesperson_current on public.portfolio_items (salesperson_id, is_current);
create index idx_portfolio_items_import_id on public.portfolio_items (import_id);
create index idx_portfolio_items_health_status on public.portfolio_items (health_status);
create index idx_portfolio_items_next_purchase_date on public.portfolio_items (next_purchase_date);

create index idx_customer_interactions_customer_created on public.customer_interactions (customer_id, created_at desc);
create index idx_customer_interactions_salesperson_created on public.customer_interactions (salesperson_id, created_at desc);
create index idx_customer_interactions_status on public.customer_interactions (status);

create index idx_follow_ups_salesperson_due on public.follow_ups (salesperson_id, due_at);
create index idx_follow_ups_status_due on public.follow_ups (status, due_at);
create index idx_follow_ups_customer_id on public.follow_ups (customer_id);

create index idx_goals_month on public.goals (month);
create index idx_point_events_salesperson_date on public.point_events (salesperson_id, occurred_at desc);
create index idx_point_events_campaign on public.point_events (campaign_id);
create index idx_performance_campaigns_month_status on public.performance_campaigns (month, status);
create index idx_performance_campaign_levels_campaign_points on public.performance_campaign_levels (campaign_id, required_points);

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.active = true
  limit 1;
$$;

create or replace function public.current_salesperson_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.salesperson_id
  from public.profiles p
  where p.id = auth.uid()
    and p.active = true
  limit 1;
$$;

create or replace function public.is_admin_or_supervisor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin', 'supervisor'), false);
$$;

create or replace function public.can_access_customer(customer_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_supervisor()
    or exists (
      select 1
      from public.customers c
      where c.id = customer_uuid
        and c.assigned_salesperson_id = public.current_salesperson_id()
    );
$$;

alter table public.salespeople enable row level security;
alter table public.profiles enable row level security;
alter table public.salesperson_aliases enable row level security;
alter table public.customers enable row level security;
alter table public.customer_contacts enable row level security;
alter table public.portfolio_imports enable row level security;
alter table public.portfolio_import_rows enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.customer_interactions enable row level security;
alter table public.follow_ups enable row level security;
alter table public.goals enable row level security;
alter table public.point_events enable row level security;
alter table public.performance_campaigns enable row level security;
alter table public.performance_campaign_levels enable row level security;

create policy "profiles_select_own_or_management" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin_or_supervisor());

create policy "profiles_management_write" on public.profiles
  for all to authenticated
  using (public.is_admin_or_supervisor())
  with check (public.is_admin_or_supervisor());

create policy "salespeople_select_authenticated" on public.salespeople
  for select to authenticated
  using (true);

create policy "salespeople_management_write" on public.salespeople
  for all to authenticated
  using (public.is_admin_or_supervisor())
  with check (public.is_admin_or_supervisor());

create policy "salesperson_aliases_select_authenticated" on public.salesperson_aliases
  for select to authenticated
  using (true);

create policy "salesperson_aliases_management_write" on public.salesperson_aliases
  for all to authenticated
  using (public.is_admin_or_supervisor())
  with check (public.is_admin_or_supervisor());

create policy "customers_select_by_role_or_owner" on public.customers
  for select to authenticated
  using (
    public.is_admin_or_supervisor()
    or assigned_salesperson_id = public.current_salesperson_id()
  );

create policy "customers_management_write" on public.customers
  for all to authenticated
  using (public.is_admin_or_supervisor())
  with check (public.is_admin_or_supervisor());

create policy "customer_contacts_select_visible_customer" on public.customer_contacts
  for select to authenticated
  using (public.can_access_customer(customer_id));

create policy "customer_contacts_management_write" on public.customer_contacts
  for all to authenticated
  using (public.is_admin_or_supervisor())
  with check (public.is_admin_or_supervisor());

create policy "portfolio_imports_management_only" on public.portfolio_imports
  for all to authenticated
  using (public.is_admin_or_supervisor())
  with check (public.is_admin_or_supervisor());

create policy "portfolio_import_rows_management_only" on public.portfolio_import_rows
  for all to authenticated
  using (public.is_admin_or_supervisor())
  with check (public.is_admin_or_supervisor());

create policy "portfolio_items_select_by_role_or_owner" on public.portfolio_items
  for select to authenticated
  using (
    public.is_admin_or_supervisor()
    or salesperson_id = public.current_salesperson_id()
    or public.can_access_customer(customer_id)
  );

create policy "portfolio_items_management_write" on public.portfolio_items
  for all to authenticated
  using (public.is_admin_or_supervisor())
  with check (public.is_admin_or_supervisor());

create policy "customer_interactions_select_visible_customer" on public.customer_interactions
  for select to authenticated
  using (
    public.is_admin_or_supervisor()
    or profile_id = auth.uid()
    or salesperson_id = public.current_salesperson_id()
    or public.can_access_customer(customer_id)
  );

create policy "customer_interactions_insert_own_or_management" on public.customer_interactions
  for insert to authenticated
  with check (
    public.is_admin_or_supervisor()
    or (
      public.can_access_customer(customer_id)
      and (
        profile_id = auth.uid()
        or salesperson_id = public.current_salesperson_id()
      )
    )
  );

create policy "customer_interactions_update_own_or_management" on public.customer_interactions
  for update to authenticated
  using (
    public.is_admin_or_supervisor()
    or (
      public.can_access_customer(customer_id)
      and (
        profile_id = auth.uid()
        or salesperson_id = public.current_salesperson_id()
      )
    )
  )
  with check (
    public.is_admin_or_supervisor()
    or (
      public.can_access_customer(customer_id)
      and (
        profile_id = auth.uid()
        or salesperson_id = public.current_salesperson_id()
      )
    )
  );

create policy "follow_ups_select_visible_customer" on public.follow_ups
  for select to authenticated
  using (
    public.is_admin_or_supervisor()
    or profile_id = auth.uid()
    or salesperson_id = public.current_salesperson_id()
    or public.can_access_customer(customer_id)
  );

create policy "follow_ups_write_own_or_management" on public.follow_ups
  for all to authenticated
  using (
    public.is_admin_or_supervisor()
    or (
      public.can_access_customer(customer_id)
      and (
        profile_id = auth.uid()
        or salesperson_id = public.current_salesperson_id()
      )
    )
  )
  with check (
    public.is_admin_or_supervisor()
    or (
      public.can_access_customer(customer_id)
      and (
        profile_id = auth.uid()
        or salesperson_id = public.current_salesperson_id()
      )
    )
  );

create policy "goals_select_authenticated" on public.goals
  for select to authenticated
  using (true);

create policy "goals_management_write" on public.goals
  for all to authenticated
  using (public.is_admin_or_supervisor())
  with check (public.is_admin_or_supervisor());

create policy "point_events_select_authenticated" on public.point_events
  for select to authenticated
  using (true);

create policy "point_events_insert_own_or_management" on public.point_events
  for insert to authenticated
  with check (
    public.is_admin_or_supervisor()
    or (
      (customer_id is null or public.can_access_customer(customer_id))
      and (
        profile_id = auth.uid()
        or salesperson_id = public.current_salesperson_id()
      )
    )
  );

create policy "performance_campaigns_select_authenticated" on public.performance_campaigns
  for select to authenticated
  using (true);

create policy "performance_campaigns_management_write" on public.performance_campaigns
  for all to authenticated
  using (public.is_admin_or_supervisor())
  with check (public.is_admin_or_supervisor());

create policy "performance_campaign_levels_select_authenticated" on public.performance_campaign_levels
  for select to authenticated
  using (true);

create policy "performance_campaign_levels_management_write" on public.performance_campaign_levels
  for all to authenticated
  using (public.is_admin_or_supervisor())
  with check (public.is_admin_or_supervisor());

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;
