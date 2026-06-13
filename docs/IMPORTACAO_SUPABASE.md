# Importacao XLSX com Supabase

## Objetivo

Conectar o fluxo de `/importacoes` ao Supabase e manter a publicacao como operacao administrativa controlada.

O parser XLSX continua rodando no navegador para manter:

- deteccao automatica de cabecalho
- validacao de colunas
- preview antes da publicacao
- classificacao por dias sem comprar

A persistencia real acontece apenas ao clicar em **Publicar importacao**.

## Fluxo atual

1. Usuario abre `/importacoes`.
2. A tela consulta `portfolio_imports` via Server Action.
3. Se Supabase estiver configurado, o historico exibido passa a ser real.
4. Se Supabase nao estiver configurado ou falhar, a tela informa o motivo e usa `localStorage` como fallback temporario.
5. Usuario faz upload da planilha XLSX.
6. `parser.ts` le a primeira aba, detecta o cabecalho, valida linhas e monta o preview.
7. Ao publicar, a Server Action envia o resultado normalizado para o Supabase.
8. O service cria o registro da importacao, salva as linhas, resolve vendedores, cria/atualiza clientes, cria contatos, cria itens da carteira e marca a importacao como publicada.

## Actions e services

Arquivos principais:

- `frontend/src/features/importacoes/actions.ts`
- `frontend/src/features/importacoes/supabase-service.ts`
- `frontend/src/features/importacoes/server-types.ts`
- `frontend/src/features/importacoes/importacoes-view.tsx`

Server Actions:

- `listSupabaseImportRecordsAction`
- `publishSupabaseImportAction`

## Tabelas usadas

### `portfolio_imports`

Guarda o cabecalho da importacao:

- arquivo
- aba
- status
- totais de validacao
- colunas reconhecidas/nao reconhecidas
- datas de validacao/publicacao
- resumo tecnico em `summary`

### `portfolio_import_rows`

Guarda cada linha da planilha:

- numero da linha original
- dados normalizados
- validade
- motivos de invalidade
- chave de possivel duplicidade

### `salespeople`

Usada para vincular carteira por vendedor.

Se o vendedor da planilha nao existir, o service cria um vendedor comercial ativo para manter filtros, carteira e relatorios funcionando. Esse cadastro nao cria usuario de login.

### `salesperson_aliases`

Guarda aliases do vendedor para facilitar proximas importacoes com nomes vindos da planilha.

### `customers`

Clientes sao criados ou atualizados.

Regra atual de identificacao:

- primeiro tenta telefone normalizado
- se nao houver telefone, tenta nome fantasia/razao social com cidade

### `customer_contacts`

Cria contatos de telefone e e-mail quando existirem.

Antes de inserir, o service consulta se o mesmo contato ja existe para o cliente.

### `portfolio_items`

Cria os itens da carteira publicada.

Na publicacao atual:

- itens anteriores `is_current = true` sao marcados como `false`
- os novos itens sao criados como `is_current = true`
- duplicidades resolvidas para o mesmo cliente geram apenas um item atual

## Fallback local

O fallback local continua ativo apenas para nao bloquear a operacao enquanto Supabase nao estiver configurado.

Ele entra quando:

- `NEXT_PUBLIC_SUPABASE_URL` esta ausente
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` esta ausente
- `SUPABASE_SERVICE_ROLE_KEY` esta ausente
- a publicacao no Supabase retorna erro

Nesse caso:

- a tela mostra mensagem clara
- os clientes validos sao salvos no `localStorage`
- a Carteira local continua funcionando como antes

## Variaveis necessarias

No `frontend/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

## Limitacoes atuais

- A listagem usa cliente autenticado e permissao de admin/supervisor.
- A publicacao usa `service_role` em Server Action somente depois de validar o profile autenticado como admin/supervisor.
- `created_by` e preenchido com o profile autenticado quando a publicacao usa Supabase.
- Nao ha transacao SQL unica envolvendo todas as etapas da publicacao.
- Deduplicacao ainda e simples: telefone, ou nome/cidade quando nao houver telefone.
- Carteira, Dashboard, Agenda, Relatorios e Calendario ja possuem leitura real com fallback local/mock.

## Proximos passos

1. Migrar publicacao para RPC transacional no banco.
2. Melhorar deduplicacao com regras auditaveis.
3. Adicionar auditoria detalhada de alteracoes da carteira.
