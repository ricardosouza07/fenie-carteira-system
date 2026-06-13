create or replace function public.is_admin_or_supervisor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role()::text in ('admin', 'supervisor'), false);
$$;

create or replace function public.is_internal_system_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role()::text in ('admin', 'supervisor', 'operador_interno'),
    false
  );
$$;

create or replace function public.can_access_customer(customer_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.is_internal_system_user(), false)
    and exists (
      select 1
      from public.customers c
      where c.id = customer_uuid
    );
$$;

update public.profiles
set role = 'operador_interno'
where role::text = 'vendedor_interno';

update public.profiles
set active = false
where role::text = 'vendedor_externo';

drop policy if exists "customers_select_by_role_or_scope" on public.customers;
create policy "customers_select_internal_users" on public.customers
  for select to authenticated
  using (public.is_internal_system_user());

drop policy if exists "customers_operational_status_update" on public.customers;
create policy "customers_operational_status_update" on public.customers
  for update to authenticated
  using (public.can_access_customer(id))
  with check (public.can_access_customer(id));

drop policy if exists "portfolio_items_select_by_role_or_owner" on public.portfolio_items;
create policy "portfolio_items_select_internal_users" on public.portfolio_items
  for select to authenticated
  using (public.is_internal_system_user());

drop policy if exists "portfolio_items_operational_status_update" on public.portfolio_items;
create policy "portfolio_items_operational_status_update" on public.portfolio_items
  for update to authenticated
  using (public.can_access_customer(customer_id))
  with check (public.can_access_customer(customer_id));

drop policy if exists "customer_interactions_select_visible_customer" on public.customer_interactions;
create policy "customer_interactions_select_internal_users" on public.customer_interactions
  for select to authenticated
  using (public.is_internal_system_user());

drop policy if exists "follow_ups_select_visible_customer" on public.follow_ups;
create policy "follow_ups_select_internal_users" on public.follow_ups
  for select to authenticated
  using (public.is_internal_system_user());

drop policy if exists "goals_select_by_role_or_owner" on public.goals;
create policy "goals_select_internal_users" on public.goals
  for select to authenticated
  using (public.is_internal_system_user());

drop policy if exists "point_events_select_by_role_or_scope" on public.point_events;
create policy "point_events_select_internal_users" on public.point_events
  for select to authenticated
  using (public.is_internal_system_user());
