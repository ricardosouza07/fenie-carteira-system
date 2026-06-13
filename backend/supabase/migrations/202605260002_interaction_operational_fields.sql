alter table public.customer_interactions
  add column if not exists portfolio_item_id uuid references public.portfolio_items(id) on delete set null,
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists work_status public.work_status,
  add column if not exists notes text,
  add column if not exists interaction_at timestamptz;

update public.customer_interactions
set
  work_status = status,
  notes = coalesce(notes, note),
  interaction_at = coalesce(interaction_at, created_at)
where work_status is null
  or interaction_at is null
  or (notes is null and note is not null);

alter table public.customer_interactions
  alter column work_status set default 'contatado',
  alter column work_status set not null,
  alter column interaction_at set default now(),
  alter column interaction_at set not null;

alter table public.follow_ups
  add column if not exists assigned_to uuid references public.salespeople(id) on delete set null,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists source text not null default 'manual',
  add column if not exists notes text;

update public.follow_ups
set
  assigned_to = coalesce(assigned_to, salesperson_id),
  created_by = coalesce(created_by, profile_id),
  notes = coalesce(notes, reason)
where assigned_to is null
  or created_by is null
  or (notes is null and reason is not null);

create index if not exists idx_customer_interactions_portfolio_item_id
  on public.customer_interactions (portfolio_item_id);
create index if not exists idx_customer_interactions_interaction_at
  on public.customer_interactions (interaction_at desc);
create index if not exists idx_follow_ups_assigned_to_due
  on public.follow_ups (assigned_to, due_at);
create index if not exists idx_follow_ups_source
  on public.follow_ups (source);
