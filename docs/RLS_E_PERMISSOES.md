# RLS e permissoes por perfil

## Decisao de produto

O MVP sera usado somente pela equipe interna da Fenie. Vendedores externos nao possuem login nem escopo proprio de carteira no sistema neste momento.

Vendedores externos continuam existindo como cadastro comercial em `salespeople` para filtros, responsavel pelo ultimo pedido, visitas encaminhadas, performance por vendedor e relatorios.

## Perfis reais

| Perfil | Rotas | Escopo de dados |
| --- | --- | --- |
| `admin` | Todas as rotas internas | Ve tudo e pode executar operacoes administrativas. |
| `supervisor` | Dashboard, Carteira, Agenda, Calendario, Relatorios, Metas, Importacoes, Vendedores e Regras | Ve toda a operacao comercial. |
| `operador_interno` | Dashboard, Carteira, Agenda, Calendario, Relatorios e Clientes | Ve toda a carteira operacional, incluindo clientes de vendedores externos. |

Perfis desativados para login no MVP:

- `vendedor_interno`
- `vendedor_externo`

Essas roles podem permanecer no enum por compatibilidade e por uso comercial em `salespeople.role`, mas nao entram em `permissions.ts` como usuarios do sistema.

## Helpers de acesso

Arquivo: `frontend/src/features/auth/access.ts`

- `getCurrentProfile()`: resolve o profile ativo da sessao atual.
- `getAuthenticatedSupabaseClient()`: cria client Supabase server-side com o token do usuario autenticado.
- `requireRole()`: protege fluxos server-side por papel.
- `canAccessCustomer()`: consulta `customers` com RLS para validar acesso ao cliente.
- `canAccessRoute()`: aplica a matriz de rotas do frontend.
- `getVisibleCustomerScope()`: retorna `all` para admin, supervisor e operador interno.

## Rotas e sidebar

Arquivo: `frontend/src/features/auth/permissions.ts`

- Admin ve todos os menus.
- Supervisor nao ve rotas exclusivas de admin, como Usuarios e Auditoria.
- Operador interno ve apenas rotas operacionais.
- Roles legadas podem acessar apenas `/acesso-negado`, caso exista algum usuario antigo ainda ativo.

## RLS atual

Migrations principais:

- `202605310001_fine_grained_rls.sql`: primeira rodada de RLS por perfil.
- `202605310002_add_operador_interno_role.sql`: adiciona `operador_interno` ao enum `user_role`.
- `202605310003_internal_only_permissions.sql`: substitui o escopo por modelo interno.

Regras atuais:

- `public.is_internal_system_user()` retorna verdadeiro para `admin`, `supervisor` e `operador_interno`.
- `public.can_access_customer(customer_uuid)` retorna verdadeiro para usuarios internos autenticados quando o cliente existe.
- `customers`, `portfolio_items`, `customer_interactions`, `follow_ups`, `goals` e `point_events` permitem leitura para usuarios internos.
- Escritas operacionais continuam exigindo `can_access_customer`.
- Importacoes seguem restritas a admin/supervisor no frontend e por policies administrativas.

## O que permanece comercial

Campos e tabelas ligados a vendedores comerciais continuam ativos:

- `customers.assigned_salesperson_id`
- `customers.last_order_salesperson_name`
- `portfolio_items.salesperson_id`
- `customer_interactions.salesperson_id`
- `follow_ups.salesperson_id`
- `point_events.salesperson_id`
- `salespeople.role = vendedor_externo`

Isso permite manter filtro por vendedor, responsavel do ultimo pedido, visitas encaminhadas e relatorios por vendedor externo sem expor login para esses vendedores.

## Services que usam client autenticado

- Carteira: `loadCarteiraFromSupabase`.
- Cliente detalhe: `loadClienteDetailFromSupabase`.
- Agenda: `loadAgendaFromSupabase`, `rescheduleAgendaFollowUp`, `completeAgendaFollowUp`.
- Dashboard: `loadDashboardFromSupabase`.
- Relatorios: `loadRelatoriosFromSupabase`.
- Calendario: `loadCalendarioFromSupabase`.
- Interacoes: `saveInteractionToSupabase`.
- Importacoes: `listSupabaseImportRecords`.

## Onde `service_role` permanece

- `publishSupabaseImport`: publicacao administrativa da carteira em lote.
- Migrations e seeds.
- Helpers server-side de Supabase para tarefas administrativas futuras.

Na publicacao de importacoes, o service role so e usado depois de validar o profile autenticado como `admin` ou `supervisor`.

## Cenarios manuais de QA

1. Admin acessa qualquer rota interna.
2. Supervisor acessa rotas operacionais, Metas, Importacoes, Vendedores e Regras, mas nao acessa Usuarios nem Auditoria.
3. Operador interno acessa Dashboard, Carteira, Agenda, Calendario, Relatorios e Clientes.
4. Operador interno nao acessa Importacoes, Metas nem Administracao.
5. Operador interno visualiza clientes de todos os vendedores comerciais, inclusive vendedores externos.
6. Cliente com visita encaminhada para vendedor externo permanece visivel para a equipe interna.
7. Usuario/profile legado com role `vendedor_externo` nao acessa rotas operacionais.
8. Registro de contato por operador interno grava `profile_id` do operador e preserva `salesperson_id` do vendedor comercial do cliente quando disponivel.

## QA real mais recente

Data: 2026-05-31

Resultado anterior:

- Supabase local validado com migrations, seed, Auth e RLS.
- Login por perfil validado.
- Rotas e sidebar validadas.
- Acoes de contato, follow-up, conclusao e pontuacao validadas.

Mudanca atual:

- O perfil `vendedor_externo` foi removido do login do MVP.
- O antigo `vendedor_interno` foi substituido por `operador_interno`.
- A RLS passou a liberar a carteira completa para a equipe interna.

## Riscos atuais

- `salespeople.role` ainda reutiliza o enum `user_role`, embora represente cadastro comercial e nao perfil de login. No futuro, vale separar em `system_user_role` e `salesperson_kind`.
- Updates operacionais em `customers` e `portfolio_items` ainda sao policies de update por linha. Para endurecer por coluna, o proximo passo e trocar por RPCs transacionais especificas.
- O fallback local/mock continua ativo quando Supabase nao esta configurado. Em producao, as variaveis precisam estar completas para evitar operacao sem persistencia.

## Proximos passos

1. Criar RPC `register_customer_interaction` para salvar interacao, follow-up, pontos e status em uma unica transacao.
2. Separar enum de perfil de usuario e tipo de vendedor comercial.
3. Adicionar testes automatizados de RLS com tokens de admin, supervisor e operador interno.
4. Registrar auditoria para importacao publicada, alteracao de status e reagendamento de follow-up.
