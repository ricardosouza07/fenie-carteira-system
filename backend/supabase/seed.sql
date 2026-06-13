insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'admin@fenie.local',
    crypt('Admin@123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin Ficticio"}'::jsonb,
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'supervisor@fenie.local',
    crypt('Supervisor@123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Supervisor Comercial"}'::jsonb,
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'laryssa.dias@fenie.local',
    crypt('Operador@123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Laryssa Dias"}'::jsonb,
    false,
    now(),
    now()
  )
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change = coalesce(email_change, ''),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  reauthentication_token = coalesce(reauthentication_token, '')
where id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) values
  (
    'admin@fenie.local',
    '00000000-0000-0000-0000-000000000001',
    '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@fenie.local"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    'supervisor@fenie.local',
    '00000000-0000-0000-0000-000000000002',
    '{"sub":"00000000-0000-0000-0000-000000000002","email":"supervisor@fenie.local"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    'laryssa.dias@fenie.local',
    '00000000-0000-0000-0000-000000000003',
    '{"sub":"00000000-0000-0000-0000-000000000003","email":"laryssa.dias@fenie.local"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  )
on conflict (provider, provider_id) do update set
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  updated_at = now();

delete from public.profiles
where id = '00000000-0000-0000-0000-000000000004'
   or role::text = 'vendedor_externo';

delete from auth.identities
where user_id = '00000000-0000-0000-0000-000000000004'
   or provider_id = 'jo.maia@fenie.local';

delete from auth.users
where id = '00000000-0000-0000-0000-000000000004'
   or email = 'jo.maia@fenie.local';

insert into public.salespeople (id, name, email, phone, role, active) values
  ('10000000-0000-0000-0000-000000000001', 'Fenie PRO', 'fenie.pro@fenie.local', null, 'vendedor_interno', true),
  ('10000000-0000-0000-0000-000000000002', 'Laryssa Dias - 03', 'laryssa.dias@fenie.local', null, 'vendedor_interno', true),
  ('10000000-0000-0000-0000-000000000003', 'Vanuza Alves - 09', 'vanuza.alves@fenie.local', null, 'vendedor_interno', true),
  ('10000000-0000-0000-0000-000000000004', 'Jo Maia - 16', 'jo.maia@fenie.local', null, 'vendedor_externo', true),
  ('10000000-0000-0000-0000-000000000005', 'Equipe Loja', 'loja@fenie.local', null, 'vendedor_interno', true)
on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  role = excluded.role,
  active = excluded.active;

insert into public.profiles (id, salesperson_id, full_name, email, role, active) values
  ('00000000-0000-0000-0000-000000000001', null, 'Admin Ficticio', 'admin@fenie.local', 'admin', true),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Supervisor Comercial', 'supervisor@fenie.local', 'supervisor', true),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Laryssa Dias', 'laryssa.dias@fenie.local', 'operador_interno', true)
on conflict (id) do update set
  salesperson_id = excluded.salesperson_id,
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role,
  active = excluded.active;

insert into public.salesperson_aliases (salesperson_id, alias) values
  ('10000000-0000-0000-0000-000000000001', 'Fenie PRO'),
  ('10000000-0000-0000-0000-000000000002', 'Laryssa dias -03'),
  ('10000000-0000-0000-0000-000000000002', 'Laryssa Dias - 03'),
  ('10000000-0000-0000-0000-000000000003', 'Vanuza Alves - 09'),
  ('10000000-0000-0000-0000-000000000004', 'Jo Maia  - 16'),
  ('10000000-0000-0000-0000-000000000004', 'Jo Maia - 16')
on conflict (salesperson_id, alias) do nothing;

insert into public.performance_campaigns (
  id,
  name,
  month,
  starts_at,
  ends_at,
  status,
  created_by
) values (
  '20000000-0000-0000-0000-000000000001',
  'Campanha de Performance Maio 2026',
  '2026-05-01',
  '2026-05-01',
  '2026-05-31',
  'ativa',
  '00000000-0000-0000-0000-000000000001'
)
on conflict (id) do update set
  name = excluded.name,
  month = excluded.month,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  status = excluded.status,
  created_by = excluded.created_by;

insert into public.performance_campaign_levels (
  id,
  campaign_id,
  name,
  required_points,
  prize,
  short_description,
  active,
  sort_order
) values
  ('21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Aquecimento', 100, 'Cafe especial', 'Primeiro ritmo comercial.', true, 1),
  ('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Ritmo bom', 250, 'Vale almoco', 'Cadencia constante de atendimento.', true, 2),
  ('21000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Alta performance', 500, 'Bonus R$100', 'Volume forte de acoes comerciais.', true, 3),
  ('21000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'Referencia do mes', 800, 'Saida 1h mais cedo', 'Referencia operacional da equipe.', true, 4),
  ('21000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'Elite Fenie', 1200, 'Premio especial', 'Performance comercial de elite.', true, 5)
on conflict (id) do update set
  campaign_id = excluded.campaign_id,
  name = excluded.name,
  required_points = excluded.required_points,
  prize = excluded.prize,
  short_description = excluded.short_description,
  active = excluded.active,
  sort_order = excluded.sort_order;
