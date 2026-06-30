# Indicadores e alertas operacionais

Este documento padroniza a leitura dos indicadores da Central de Carteira Fenié.
O objetivo é evitar que a equipe compare números que representam recortes diferentes.

## Fonte central de regras

As regras operacionais usadas por Carteira, Dashboard, Relatórios, Agenda e Calendário ficam em:

`frontend/src/features/carteira/operational-rules.ts`

Sempre que uma regra mudar, este arquivo deve ser atualizado primeiro.

## Regras de classificação

| Indicador | Regra | Uso operacional |
| --- | --- | --- |
| Saudável | 0 a 59 dias sem comprar | Cliente dentro de cadência normal. |
| Atenção | 60 a 89 dias sem comprar | Cliente começando a sair da cadência. |
| Risco | 90 a 179 dias sem comprar | Cliente com risco comercial relevante. |
| Inativo antigo | 180+ dias sem comprar | Cliente parado há muito tempo. |
| Recompra | Próxima compra prevista já passou | Cliente deveria ter recomprado. |
| Convertido | Conversão registrada nos últimos 30 dias | Cliente recuperado recentemente. |
| Não trabalhado | Cliente sem interação comercial registrada | Ainda não recebeu ação da equipe. |
| Inadimplente | Pendência financeira marcada pelo escritório | Consultar financeiro antes de negociar. |
| Bloqueado | Venda bloqueada até liberação financeira | Não negociar nova venda sem liberação. |

## Prioridade do convertido

Cliente convertido tem prioridade visual e operacional.

Se o cliente foi convertido nos últimos 30 dias:

- não aparece como Atenção;
- não aparece como Risco;
- não aparece como Inativo antigo;
- não aparece em Recompra;
- aparece como Convertido.

## Nomes padronizados

Na Carteira:

- Atenção
- Risco
- Inativos
- Recompra
- Convertidos
- Não trabalhados

No Dashboard:

- Total de clientes
- Clientes em atenção
- Clientes em risco
- Inativos antigos
- Recompras pendentes
- Convertidos no mês
- Inadimplentes
- Bloqueados
- Negociações financeiras

## Alertas operacionais

Alertas sempre devem mostrar o recorte e o total de referência.

Exemplo:

`69 de 80`

Leitura:

`69 clientes em risco ainda não receberam interação.`

Outro exemplo:

`746 de 749`

Leitura:

`746 inativos ainda não possuem registro comercial.`

## Termos proibidos ou restritos

Não usar `Vencidos` para próxima compra.

Usar:

- `Recompra` para próxima compra prevista que já passou.
- `Em atraso` apenas para follow-ups, tarefas ou pendências com prazo anterior a hoje.

## Links de alerta

Cada alerta deve abrir a Carteira com o filtro correspondente sempre que possível:

- Clientes em risco sem contato: `/carteira?classificacao=risco&status=nao_trabalhado`
- Inativos sem ação: `/carteira?classificacao=inativo&status=nao_trabalhado`
- Recompras pendentes: `/carteira?proxima=recompra`
- Aguardando retorno: `/carteira?status=aguardando`

## Observações técnicas

- A importação mensal calcula a classificação usando a regra central.
- As telas recalculam a classificação operacional pelo campo `diasSemComprar`.
- O status técnico `vencido` do banco pode continuar existindo para follow-ups, mas a interface deve exibir `Em atraso`.
- A próxima compra passada deve ser exibida como `Recompra`.
