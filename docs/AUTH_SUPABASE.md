# Autenticacao com Supabase Auth

## Objetivo

O sistema e interno da Fenie. Apenas equipe interna deve fazer login. Vendedores externos continuam existindo como cadastro comercial para carteira, visitas, filtros, performance e relatorios, mas nao possuem acesso ao sistema no MVP.

Quando o Supabase nao esta configurado no frontend, o sistema entra em modo dev/mock temporario com perfil admin ficticio e aviso discreto no App Shell.

## Fluxo de login

1. Usuario acessa `/login`.
2. O formulario envia e-mail e senha para a Server Action `loginAction`.
3. A action chama `supabase.auth.signInWithPassword`.
4. Em caso de sucesso, os tokens da sessao sao salvos em cookies HTTP-only:
   - `fenie-sb-access-token`
   - `fenie-sb-refresh-token`
5. O profile do usuario e carregado em `profiles`.
6. Se `active = false` ou nao existir profile, o login e bloqueado.
7. Usuario autenticado e redirecionado para `/dashboard`.

## Logout

O botao **Sair** da sidebar executa `logoutAction`, limpa os cookies de sessao e redireciona para `/login`.

## Protecao de rotas

A protecao acontece em `frontend/src/proxy.ts`, equivalente ao middleware no Next.js atual.

Regras principais:

- usuario nao autenticado tentando rota interna vai para `/login`;
- usuario autenticado tentando `/login` e redirecionado para a area padrao;
- usuario sem permissao vai para `/acesso-negado`;
- tokens expirados tentam refresh usando o refresh token salvo em cookie;
- modo dev/mock libera as rotas quando as variaveis Supabase estao ausentes.

## Profiles reais

Tabela usada: `public.profiles`.

Campos carregados:

- `id`
- `salesperson_id`
- `full_name`
- `email`
- `role`
- `active`

Roles reais do sistema:

- `admin`
- `supervisor`
- `operador_interno`

Roles legadas/comerciais que nao devem ser usadas para login no MVP:

- `vendedor_interno`
- `vendedor_externo`

Essas roles ainda podem existir no enum por compatibilidade historica e porque `salespeople.role` usa o mesmo enum para classificar vendedores comerciais.

## Permissoes por perfil

### Admin

Acesso total a todas as rotas internas.

### Supervisor

Acesso a:

- dashboard
- carteira
- agenda
- calendario
- relatorios
- metas
- importacoes
- vendedores
- regras

Nao acessa rotas exclusivas de admin, como usuarios e auditoria.

### Operador interno

Acesso a:

- dashboard
- carteira
- agenda
- calendario
- relatorios
- clientes

O operador interno ve a carteira operacional completa, incluindo clientes vinculados a vendedores externos. A equipe interna e responsavel por trabalhar e acompanhar a carteira de todos os vendedores.

## Vendedores externos

Vendedores externos nao fazem login no MVP. Eles permanecem em `salespeople` para:

- filtro de carteira;
- responsavel pelo ultimo pedido;
- visitas encaminhadas;
- performance por vendedor;
- relatorios.

## Sidebar por perfil

A sidebar usa as regras de permissao em `features/auth/permissions.ts`. Menus sem permissao nao aparecem para o usuario.

## Como criar usuarios

### Via Supabase Studio

1. Abra Supabase Studio.
2. Va em **Authentication > Users**.
3. Crie o usuario com e-mail e senha.
4. Copie o `id` do usuario criado.
5. Insira o profile correspondente em `public.profiles`.

Exemplo:

```sql
insert into public.profiles (
  id,
  salesperson_id,
  full_name,
  email,
  role,
  active
) values (
  '<auth-user-id>',
  null,
  'Nome do Operador',
  'operador@fenie.com',
  'operador_interno',
  true
);
```

### Via seed local

O seed atual cria usuarios ficticios internos:

- `admin@fenie.local` / `Admin@123456`
- `supervisor@fenie.local` / `Supervisor@123456`
- `laryssa.dias@fenie.local` / `Operador@123456`

O seed tambem remove/desativa profile de vendedor externo legado, mantendo `Jo Maia - 16` apenas como cadastro em `salespeople`.

## Variaveis de ambiente

No frontend:

```env
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

Auth precisa de URL e anon key. As telas operacionais usam cliente autenticado/RLS. `SUPABASE_SERVICE_ROLE_KEY` fica reservado para publicacao administrativa de importacoes e tarefas internas controladas.

## Limitacoes atuais

- Nao ha recuperacao de senha conectada.
- Nao ha cadastro publico de usuario.
- Nao ha MFA.
- Importacoes ainda usam service role na publicacao administrativa, apos validar o profile autenticado.
- Vendedores externos nao devem ter usuarios ativos no Auth neste MVP.
