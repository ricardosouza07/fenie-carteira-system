# Agenda conectada ao Supabase

## Objetivo

A rota `/agenda` passa a carregar pendências reais do Supabase, preservando o fallback local/mock usado no MVP. O foco é manter a rotina diária do vendedor com follow-ups, próximas compras, aguardando retorno e visitas encaminhadas.

## Tabelas usadas

- `follow_ups`: follow-ups abertos, em atraso, de hoje e próximos 7 dias.
- `customers`: dados comerciais e status operacional do cliente.
- `customer_contacts`: telefone principal do cliente.
- `portfolio_items`: carteira atual, classificação, status, próxima compra prevista e vendedor vinculado.
- `salespeople`: responsável/vendedor exibido na agenda.
- `customer_interactions`: usada indiretamente pelo drawer de contato, que já grava interações reais.
- `point_events`: usada indiretamente pelo drawer de contato, mantendo o toast de pontos local.

## Query principal

O serviço `loadAgendaFromSupabase` executa:

1. Busca `portfolio_items` com `is_current = true`.
2. Busca `follow_ups` com status `aberto` ou `vencido`.
3. Junta os clientes envolvidos em follow-ups e carteira atual.
4. Busca `customers`, `customer_contacts` e `salespeople`.
5. Normaliza os dados para `AgendaItem`.
6. Classifica cada item nos grupos:
   - em atraso;
   - hoje;
   - próximos 7 dias;
   - aguardando retorno;
   - visitas encaminhadas.

Próximas compras previstas entram a partir de `portfolio_items.next_purchase_date`. Clientes em `aguardando` e `visita` entram pelo status operacional da carteira atual.

## Reagendamento

Ao reagendar um item com `followUpId` real:

1. A action `rescheduleAgendaFollowUpAction` chama o service server-side.
2. `follow_ups.due_at` é atualizado.
3. O status técnico fica `vencido` se a nova data for anterior a hoje, ou `aberto` caso contrário. Na interface, esse status aparece como "Em atraso".

Clientes cuja próxima compra prevista já passou aparecem como "Recompra", seguindo `docs/REGRAS_OPERACIONAIS_FENIE.md`. Clientes convertidos nos últimos 30 dias não entram nesse grupo.
4. A agenda atualiza localmente e tenta recarregar os dados reais.

Se o item não possuir follow-up real ou o Supabase não estiver configurado, o reagendamento fica local/mock.

## Conclusão de follow-up

Itens reais de `follow_ups` podem ser marcados como concluídos:

1. `follow_ups.status` recebe `concluido`.
2. `follow_ups.completed_at` recebe o horário atual.
3. O item sai da lista da Agenda.
4. A tela tenta recarregar a agenda do Supabase.

## Registrar contato

O `InteractionDrawer` da Agenda usa o mesmo fluxo real já criado para Carteira e Detalhe:

- grava `customer_interactions`;
- cria `follow_ups` se houver próximo retorno;
- grava `point_events`;
- atualiza status do cliente e item da carteira;
- mostra toast de persistência e toast de pontos.

Após salvar com sucesso no Supabase, a Agenda recarrega a lista real.

## Fallback

A ordem de fallback é:

1. Supabase configurado e com dados: usa agenda real.
2. Supabase não configurado: usa clientes locais/mock.
3. Supabase sem clientes atuais: usa clientes locais/mock.
4. Reagendamento/conclusão sem `followUpId`: mantém alteração local/mock.

## Limitações atuais

- Não há filtro por vendedor autenticado; a agenda mostra a base disponível para o MVP.
- Conclusão de follow-up não cria interação automaticamente nesta fase.
- Dashboard, Relatórios, Calendário e gamificação global seguem fora deste passo.
- Notificações automáticas ainda não foram implementadas.

## Próximos passos

- Filtrar a Agenda pelo usuário autenticado e suas permissões.
- Criar interação automática opcional ao concluir follow-up.
- Conectar Calendário aos mesmos dados de `follow_ups`.
- Conectar Dashboard e Relatórios às interações/follow-ups reais.
- Adicionar ações de edição avançada e motivos padronizados de follow-up.
