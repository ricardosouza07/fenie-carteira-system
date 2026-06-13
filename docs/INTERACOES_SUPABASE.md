# Interações conectadas ao Supabase

## Objetivo

O `InteractionDrawer` continua atualizando a interface imediatamente, mas agora tenta persistir a interação no Supabase quando o cliente possui vínculo real com o banco. Se o Supabase não estiver configurado ou o cliente ainda for mock/localStorage, o comportamento local é mantido.

## Fluxo de gravação

1. O usuário registra contato pela Carteira ou pelo Detalhe do Cliente.
2. A tela cria a interação local para manter a experiência rápida.
3. A gamificação local calcula os eventos de pontos e mantém o toast de pontuação.
4. A Server Action `saveInteractionToSupabaseAction` recebe cliente, interação, eventos de pontos e rótulo da última ação.
5. O serviço server-side valida se Supabase está configurado e se o cliente possui UUID real.
6. O serviço localiza o `portfolio_item` atual do cliente, quando disponível.
7. A interação é gravada em `customer_interactions`.
8. Se houver próximo follow-up, um registro é criado em `follow_ups`.
9. Os eventos de pontos são gravados em `point_events`.
10. `customers` e `portfolio_items` são atualizados com o novo status operacional.
11. A tela mostra um toast discreto indicando sucesso, fallback local ou erro.

## Tabelas usadas

- `customer_interactions`: registra status, tipo de cliente, canal, observações, data da interação, valor recuperado e próximo follow-up.
- `follow_ups`: cria o compromisso futuro vinculado à interação quando o usuário informa uma data, com `source = 'interacao'`.
- `point_events`: persiste os pontos calculados pela regra de gamificação local.
- `portfolio_items`: atualiza o `work_status` do item atual da carteira.
- `customers`: atualiza `work_status`, `last_action_label` e `last_action_at`.
- `performance_campaigns`: identifica a campanha ativa para vincular os eventos de pontos, quando houver campanha vigente.

## Campos operacionais adicionados

A migration `202605260002_interaction_operational_fields.sql` adiciona campos que deixam a base pronta para o fluxo operacional:

- `customer_interactions.portfolio_item_id`
- `customer_interactions.user_id`
- `customer_interactions.work_status`
- `customer_interactions.notes`
- `customer_interactions.interaction_at`
- `follow_ups.assigned_to`
- `follow_ups.created_by`
- `follow_ups.source`
- `follow_ups.notes`

Os campos antigos continuam preservados para compatibilidade: `status`, `note`, `created_at`, `profile_id` e `salesperson_id`.

## Fallback

O modo local/mock é mantido quando:

- Supabase não possui variáveis configuradas;
- o cliente veio de mock/localStorage e não tem UUID real;
- ocorre erro de gravação no banco.
- a sessao autenticada nao tem permissao RLS para aquele cliente.

Nesses casos, a interface continua atualizada na sessão atual, preservando filtros, paginação, status, última ação e toast de pontos. O usuário recebe um aviso discreto de que a gravação ficou local.

## Limitações atuais

- A gravação usa cliente Supabase autenticado e respeita RLS.
- `user_id`, `profile_id` e `created_by` usam o profile autenticado quando disponivel.
- `assigned_to` usa o vendedor do profile ou o vendedor vinculado ao item da carteira.

## Próximos passos

- Migrar a escrita operacional para RPC transacional.
- Adicionar validacao de colunas atualizaveis para evitar updates amplos por tabela.
- Trocar o cálculo de pontos para um serviço compartilhado com regras versionadas no banco.
