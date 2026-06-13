# Supabase local - Fenié Carteira

Esta pasta guarda a base real do banco para substituir gradualmente `localStorage` e dados mockados.

## Requisitos

- Docker Desktop em execucao
- Supabase CLI instalada
- Node.js para o frontend

## Subir ambiente local

```bash
cd backend/supabase
supabase start
supabase status
```

O `supabase status` exibe `API URL`, `anon key` e `service_role key`.

## Aplicar migrations e seed

Para recriar o banco local do zero:

```bash
cd backend/supabase
supabase db reset
```

Esse comando aplica todos os arquivos em `migrations/` e depois executa `seed.sql`.

Para aplicar apenas migrations pendentes:

```bash
cd backend/supabase
supabase migration up
```

## Variaveis de ambiente do frontend

Copie `frontend/.env.example` para `frontend/.env.local` e preencha com os valores do `supabase status`:

```bash
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

Nesta fase as telas ainda continuam mock/local. Os helpers de cliente Supabase ja existem para a proxima etapa de integracao gradual.

## Estrutura criada

- Enums de papel, saude da carteira, status de trabalho, tipos de cliente, canais, follow-ups e importacoes.
- Tabelas MVP: perfis, vendedores, aliases, clientes, contatos, importacoes, linhas importadas, carteira atual, interacoes, follow-ups, metas, eventos de pontos e campanha de performance.
- Indices basicos para busca por cliente, telefone normalizado, vendedor, status, datas e importacao atual.
- RLS por papel:
  - `admin` e `supervisor` enxergam e gerenciam a operacao.
  - `operador_interno` enxerga a carteira operacional completa.
  - vendedores externos ficam apenas como cadastro comercial em `salespeople`, sem login no MVP.
