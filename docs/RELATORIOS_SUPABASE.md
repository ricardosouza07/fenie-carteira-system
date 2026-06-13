# Relatorios conectados ao Supabase

## Objetivo

O modulo `/relatorios` agora tenta gerar o fechamento do periodo com dados reais do Supabase. Quando o Supabase nao estiver configurado, sem importacao publicada ou com erro de consulta, a tela preserva o fallback local/mock.

## Tabelas usadas

- `portfolio_imports`: identifica a ultima importacao publicada.
- `portfolio_items`: define a carteira atual e a classificacao/status de cada cliente.
- `customers`: dados comerciais do cliente, cidade, vendedor original e status operacional.
- `customer_contacts`: telefone/e-mail principal para normalizacao do cliente.
- `salespeople`: nomes dos vendedores vinculados.
- `customer_interactions`: clientes trabalhados, conversoes, canais, valor recuperado e datas de interacao.
- `follow_ups`: prazos, status, motivos e vencimentos.
- `point_events`: pontos gerados por vendedor/cliente no periodo.

## Filtros

Os filtros da tela continuam no topo:

- periodo/mes
- vendedor
- cidade
- status operacional
- classificacao da carteira

No estado atual, a carga inicial vem do servidor e os filtros sao aplicados no cliente sobre o snapshot carregado. Isso mantem a tela rapida no MVP e prepara uma futura troca para filtros server-side.

## Regras de calculo

- Clientes trabalhados: clientes unicos com interacao dentro do periodo filtrado.
- Convertidos: clientes unicos com interacao `convertido` no periodo.
- Taxa de conversao: convertidos dividido por clientes trabalhados.
- Valor recuperado: soma de `recovered_value` nas conversoes filtradas.
- Visitas encaminhadas: interacoes/clientes com status `visita`.
- Follow-ups vencidos: follow-ups com status vencido ou prazo anterior a 2026-05-27.
- Pontos gerados: soma de `point_events.points` no periodo filtrado.
- Performance por vendedor: agrega contatos, convertidos, taxa, visitas, valor recuperado, follow-ups vencidos e pontos.

## Abas

- Clientes trabalhados
- Convertidos
- Performance por vendedor
- Follow-ups
- Pontos

## Exportacao

O botao "Exportar Excel" continua mockado. A tela ja prepara os dados filtrados da aba atual com `getExportRows`, para que a proxima fase conecte a exportacao real sem mudar a experiencia do usuario.

## Fallback

Se Supabase nao estiver configurado, a tela usa:

- clientes locais/mock da carteira
- interacoes inferidas pela ultima acao local
- follow-ups derivados da proxima compra prevista
- pontos locais do provider de gamificacao

## Proximos passos

- Criar exportacao real XLSX a partir dos dados filtrados.
- Migrar filtros para query server-side quando a base crescer.
- Conectar Calendario ao Supabase.
- Substituir a data fixa do MVP por configuracao operacional/data atual controlada.
