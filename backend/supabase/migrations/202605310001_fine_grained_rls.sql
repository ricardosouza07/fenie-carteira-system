create or replace function public.can_access_customer(customer_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with current_profile as (
    select p.role, p.salesperson_id
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
    limit 1
  )
  select coalesce(
    exists (
      select 1
      from current_profile cp
      where cp.role in ('admin', 'supervisor')
    )
    or exists (
      select 1
      from current_profile cp
      join public.customers c on c.id = customer_uuid
      where c.assigned_salesperson_id = cp.salesperson_id
    )
    or exists (
      select 1
      from current_profile cp
      join public.portfolio_items pi on pi.customer_id = customer_uuid
      where pi.is_current = true
        and pi.salesperson_id = cp.salesperson_id
    )
    or exists (
      select 1
      from current_profile cp
      join public.customer_interactions ci on ci.customer_id = customer_uuid
      where cp.role = 'vendedor_interno'
        and ci.salesperson_id = cp.salesperson_id
    )
    or exists (
      select 1
      from current_profile cp
      join public.follow_ups fu on fu.customer_id = customer_uuid
      where cp.role = 'vendedor_interno'
        and (
          fu.salesperson_id = cp.salesperson_id
          or fu.assigned_to = cp.salesperson_id
        )
    )
    or exists (
      select 1
      from current_profile cp
      join public.customer_interactions ci on ci.customer_id = customer_uuid
      where cp.role = 'vendedor_externo'
        and ci.salesperson_id = cp.salesperson_id
        and coalesce(ci.work_status, ci.status) = 'visita'
    ),
    false
  );
$$;

drop policy if exists "customers_select_by_role_or_owner" on public.customers;
create policy "customers_select_by_role_or_scope" on public.customers
  for select to authenticated
  using (public.can_access_customer(id));

drop policy if exists "customers_operational_status_update" on public.customers;
create policy "customers_operational_status_update" on public.customers
  for update to authenticated
  using (public.can_access_customer(id))
  with check (public.can_access_customer(id));

drop policy if exists "portfolio_imports_select_published_authenticated" on public.portfolio_imports;
create policy "portfolio_imports_select_published_authenticated" on public.portfolio_imports
  for select to authenticated
  using (status = 'publicada' or public.is_admin_or_supervisor());

drop policy if exists "portfolio_items_operational_status_update" on public.portfolio_items;
create policy "portfolio_items_operational_status_update" on public.portfolio_items
  for update to authenticated
  using (public.can_access_customer(customer_id))
  with check (public.can_access_customer(customer_id));

drop policy if exists "goals_select_authenticated" on public.goals;
create policy "goals_select_by_role_or_owner" on public.goals
  for select to authenticated
  using (
    public.is_admin_or_supervisor()
    or salesperson_id = public.current_salesperson_id()
  );

drop policy if exists "point_events_select_authenticated" on public.point_events;
create policy "point_events_select_by_role_or_scope" on public.point_events
  for select to authenticated
  using (
    public.is_admin_or_supervisor()
    or salesperson_id = public.current_salesperson_id()
    or (
      customer_id is not null
      and public.can_access_customer(customer_id)
    )
  );
