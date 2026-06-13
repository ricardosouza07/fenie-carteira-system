# Validacao Supabase

Data: 26/05/2026

## Objetivo

Validar a fundacao real do banco antes de conectar o frontend: migrations, seed, enums, tabelas, indices e RLS.

## Ambiente usado

- Supabase CLI portatil: `tools/supabase-cli/supabase.exe`
- Versao da CLI: `2.101.0`
- Docker Desktop: indisponivel neste ambiente
- WSL: indisponivel neste ambiente
- Validacao SQL alternativa: PostgreSQL 17.10 portatil em `127.0.0.1:55432`, com schema `auth` e roles Supabase simulados para testar migration, seed e RLS.

## Comandos executados

```powershell
tools\supabase-cli\supabase.exe --version
```

Resultado:

```text
2.101.0
```

```powershell
cd backend\supabase
..\..\tools\supabase-cli\supabase.exe start
```

Resultado:

```text
failed to inspect service: error during connect ... open //./pipe/docker_engine: The system cannot find the file specified.
Docker Desktop is a prerequisite for local development.
```

```powershell
cd backend\supabase
..\..\tools\supabase-cli\supabase.exe db reset
```

Resultado:

```text
failed to inspect service: error during connect ... open //./pipe/docker_engine: The system cannot find the file specified.
Docker Desktop is a prerequisite for local development.
```

Como o daemon Docker nao existe neste ambiente, a validacao SQL foi executada em PostgreSQL local temporario:

```powershell
initdb -D tools\postgresql-17.10\data-validation --no-locale -A trust -U postgres
pg_ctl -D tools\postgresql-17.10\data-validation -l tools\postgresql-17.10\validation-postgres.log -o "-p 55432" start
psql -h 127.0.0.1 -p 55432 -U postgres -d postgres -v ON_ERROR_STOP=1 -f backend\supabase\migrations\202605260001_init_schema.sql
psql -h 127.0.0.1 -p 55432 -U postgres -d postgres -v ON_ERROR_STOP=1 -f backend\supabase\seed.sql
```

Antes da migration, foi aplicado um prelude minimo equivalente ao ambiente Supabase local:

- `auth` schema
- `auth.users`
- `auth.identities`
- funcao `auth.uid()`
- roles `anon`, `authenticated` e `service_role`

## Resultado da migration

Status: aprovado.

Criados com sucesso:

- 7 enums
- 14 tabelas MVP
- 55 indices
- RLS habilitado nas 14 tabelas
- 27 policies
- funcoes auxiliares de perfil e vendedor atual
- triggers de `updated_at`
- grants basicos para `authenticated` e `service_role`

Enums validados:

```text
customer_health_status: saudavel, atencao, risco, inativo
customer_type: loja, externo, novo, espontaneo
follow_up_status: aberto, vencido, concluido
import_status: rascunho, validada, publicada, erro
interaction_channel: whatsapp, telefone, email, presencial
user_role: admin, supervisor, vendedor_interno, vendedor_externo
work_status: nao_trabalhado, contatado, aguardando, convertido, visita
```

## Resultado do seed

Status: aprovado.

Inseridos com sucesso:

- 4 usuarios ficticios em `auth.users`
- 4 profiles
- 5 vendedores
- 6 aliases de vendedores
- 1 campanha padrao
- 5 marcos da campanha

Campanha validada:

```text
Campanha de Performance Maio 2026
Status: ativa
Periodo: 2026-05-01 a 2026-05-31
```

Vendedores validados:

```text
Equipe Loja       | vendedor_interno
Fenie PRO         | vendedor_interno
Jo Maia - 16      | vendedor_externo
Laryssa Dias - 03 | vendedor_interno
Vanuza Alves - 09 | vendedor_interno
```

## Testes RLS

Foram criados 3 clientes temporarios apenas para validacao:

- Cliente Interno, atribuido a Laryssa Dias
- Cliente Externo, atribuido a Jo Maia
- Cliente Sem Dono, sem vendedor atribuido

Resultados:

```text
admin             -> ve 3/3 clientes
supervisor        -> ve 3/3 clientes
vendedor_interno  -> ve 1/3 cliente, apenas Cliente Interno
vendedor_externo  -> ve 1/3 cliente, apenas Cliente Externo
```

Operacoes testadas:

- `admin` atualizou cliente com sucesso.
- `vendedor_interno` inseriu interacao no proprio cliente com sucesso.
- `vendedor_externo` criou follow-up no proprio cliente com sucesso.
- `vendedor_interno` tentou inserir interacao em cliente externo e recebeu bloqueio RLS:

```text
ERROR: new row violates row-level security policy for table "customer_interactions"
```

- `vendedor_interno` tentou atualizar diretamente cliente e nao alterou linhas (`UPDATE 0`), como esperado para escrita direta em `customers`.

## Erros encontrados e correcoes

1. Docker/Supabase local indisponivel

O ambiente nao possui Docker Desktop nem daemon Docker ativo. Por isso `supabase start`, `supabase status` e `supabase db reset` nao puderam rodar.

Correcao aplicada: instalacao da Supabase CLI portatil e validacao SQL real em PostgreSQL 17.10 temporario com prelude Supabase.

2. Seed nao cobria `vendedor_externo`

O seed inicial tinha admin, supervisor e vendedor interno, mas faltava um profile de vendedor externo para validar RLS por esse papel.

Correcao aplicada: adicionado usuario/profile ficticio `jo.maia@fenie.local` com role `vendedor_externo`.

3. Policies de interacoes/follow-ups permitiam confiar apenas em `profile_id`

A policy de insert/update em `customer_interactions` e `follow_ups` validava o usuario, mas precisava tambem exigir acesso ao cliente da carteira.

Correcao aplicada: policies agora exigem `public.can_access_customer(customer_id)` para vendedores.

4. Grants explicitos

Para garantir acesso via PostgREST/Supabase com RLS, foram adicionados grants explicitos para `authenticated` e `service_role`.

## Status final

Status da fundacao SQL: aprovado.

Status do runtime Supabase local: bloqueado pelo ambiente, pois Docker Desktop nao esta instalado/ativo.

Proximo passo antes de integrar frontend em uma maquina com Docker:

```powershell
cd backend\supabase
..\..\tools\supabase-cli\supabase.exe start
..\..\tools\supabase-cli\supabase.exe db reset
```

Com Docker ativo, o `db reset` deve aplicar a mesma migration e seed ja validados no PostgreSQL temporario.
