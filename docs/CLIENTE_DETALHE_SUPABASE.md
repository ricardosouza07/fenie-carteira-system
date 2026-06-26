# Detalhe do Cliente conectado ao Supabase

## Objetivo

A rota `/clientes/[id]` agora tenta carregar o contexto completo do cliente no Supabase. O detalhe continua compatível com a UI existente e mantém fallback para snapshot local/mock quando o banco não está configurado ou o cliente ainda não tem ID real.

## Tabelas usadas

- `customers`: dados comerciais, situação da planilha, status atual e última ação.
- `customer_contacts`: telefone, WhatsApp e e-mail do cliente.
- `portfolio_items`: item mais recente da carteira, classificação, status de trabalho, datas e vendedor vinculado.
- `salespeople`: nome do vendedor responsável/vendedor do último pedido quando houver vínculo.
- `customer_interactions`: histórico real da timeline comercial.
- `follow_ups`: pendências abertas, em atraso, concluídas e próximas.

As classificações exibidas devem seguir `docs/REGRAS_OPERACIONAIS_FENIE.md`. Cliente convertido nos últimos 30 dias aparece como Convertido e não como Atenção, Risco, Inativo antigo ou Recompra.
- `point_events`: pontuações relacionadas às interações do cliente.

## Query principal

O serviço `loadClienteDetailFromSupabase` executa o fluxo:

1. Valida se Supabase está configurado e se o parâmetro `[id]` é um UUID real.
2. Busca o registro em `customers`.
3. Busca contatos em `customer_contacts`.
4. Busca o `portfolio_item` mais recente do cliente, priorizando `is_current = true` e `imported_at` mais recente.
5. Busca o vendedor em `salespeople`.
6. Busca todas as interações em `customer_interactions`, ordenadas por `interaction_at`.
7. Busca follow-ups em `follow_ups`, ordenados por prazo.
8. Busca pontos em `point_events`, ordenados por `occurred_at`.
9. Normaliza tudo para os tipos já usados pela tela atual.

## Comportamento na tela

- O header usa o cliente normalizado, classificação, status e responsável.
- Os cards de resumo usam último pedido, dias sem comprar, próxima compra, valor recuperado e status atual.
- A timeline usa interações reais de `customer_interactions`.
- O bloco de follow-ups usa registros reais de `follow_ups`.
- O bloco de pontos mostra total acumulado no cliente e os eventos recentes de `point_events`.
- O drawer de contato continua salvando via Supabase.
- Após salvar uma interação no detalhe, a tela atualiza localmente e tenta recarregar o detalhe real para refletir timeline, status, follow-ups e pontos persistidos.

## Fallback

A ordem de fallback é:

1. Supabase configurado e cliente encontrado: usa dados reais.
2. Supabase não configurado: usa snapshot local da Carteira, se existir.
3. Cliente sem UUID real: usa snapshot local/mock.
4. Sem dado local: mostra estado vazio claro.

O fallback preserva a experiência operacional: registrar contato, atualizar status local, exibir follow-ups derivados e manter toast de pontos.

## Limitações atuais

- A autenticação real ainda não está ligada; usuário/perfil seguem nulos na gravação de interação.
- Dashboard, Agenda, Relatórios e Calendário continuam usando dados mockados/localStorage.
- A timeline não pagina interações antigas.
- O bloco de pontos usa os eventos persistidos, mas a regra de cálculo ainda vem do service local de gamificação.

## Próximos passos

- Conectar autenticação para preencher `user_id`, `profile_id` e regras por perfil.
- Conectar Agenda a `follow_ups`.
- Conectar Dashboard e Relatórios a `customer_interactions` e `point_events`.
- Adicionar ações reais para concluir ou reagendar follow-ups.
- Criar paginação/filtragem de histórico quando a timeline crescer.
