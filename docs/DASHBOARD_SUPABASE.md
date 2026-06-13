# Dashboard conectado ao Supabase

## Objetivo

O `/dashboard` agora tenta carregar indicadores reais do Supabase antes de usar o fallback local/mock. A leitura real usa a ultima importacao publicada da carteira, interacoes do mes, follow-ups abertos/vencidos, eventos de pontos e a campanha ativa de performance.

## Tabelas usadas

- `portfolio_imports`: identifica a ultima importacao com `status = publicada`.
- `portfolio_items`: define a carteira atual por cliente, vendedor, status, classificacao e datas comerciais.
- `customers`: dados comerciais do cliente e ultimo status operacional.
- `customer_contacts`: telefone/e-mail principal para contexto e navegacao.
- `salespeople`: nomes dos vendedores responsaveis.
- `customer_interactions`: contatos, conversoes, visitas, valor recuperado e produtividade do mes.
- `follow_ups`: pendencias vencidas, retornos de hoje e proximos compromissos.
- `point_events`: pontuacao mensal da gamificacao.
- `performance_campaigns` e `performance_campaign_levels`: campanha ativa, marcos e premios.

## Regras de calculo

- Carteira atual: ultima `portfolio_imports.publicada` e seus `portfolio_items.is_current = true`.
- Trabalhados no mes: clientes unicos com `customer_interactions.interaction_at` dentro do mes atual.
- Contatos realizados: total de interacoes do mes.
- Convertidos: clientes unicos com interacao `convertido` no mes.
- Valor recuperado: soma de `customer_interactions.recovered_value` das conversoes do mes.
- Aguardando retorno e visitas encaminhadas: status operacional normalizado do cliente/item, priorizando a ultima interacao do mes.
- Follow-ups vencidos: `follow_ups.status` aberto/vencido com `due_at` anterior a 2026-05-27.
- Follow-ups hoje: `follow_ups.status` aberto/vencido com `due_at` em 2026-05-27.
- Pontos do mes: soma de `point_events.points` no periodo mensal.
- Performance por vendedor: agrega interacoes, conversoes, visitas, valor recuperado, follow-ups vencidos e pontos por vendedor.
- Prioridades: ordena por follow-up vencido, proxima compra vencida, risco sem contato, inativo antigo sem acao e aguardando retorno.

## Gamificacao

Quando o Supabase esta ativo, o bloco "Conquistas do mes" usa `point_events` reais e a campanha ativa do banco. Se nao houver campanha ativa, a campanha padrao local continua sendo usada para manter a tela funcional.

## Fallback

Se as variaveis de ambiente do Supabase nao estiverem configuradas, se nao existir importacao publicada ou se houver erro de consulta, a tela preserva o comportamento local/mock atual. Um aviso no topo informa se os dados vieram do Supabase ou do fallback.

## Proximos passos

- Permitir filtros server-side por mes, ano, vendedor e cidade.
- Conectar Relatorios e Calendario aos mesmos dados reais.
- Criar RPCs/views para consolidar metricas pesadas quando a base crescer.
- Substituir a data fixa do MVP por relogio/configuracao operacional.
