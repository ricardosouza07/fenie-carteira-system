# Situacao da Carteira

## Objetivo

A Situacao da Carteira identifica clientes que devem ou nao continuar na operacao comercial da Fenié sem apagar historico, interacoes, follow-ups, pontos ou importacoes anteriores.

Ela resolve casos como salao fechado, cliente sem potencial, duplicidade ou registro arquivado. Esses clientes continuam no banco para consulta historica, mas deixam de distorcer risco, inativos, recompra e metas operacionais.

## Campos

Tabela principal:

- `customers.portfolio_status`
- `customers.portfolio_status_note`

Valores permitidos:

- `ativo`: cliente entra na operacao comercial.
- `fechou_salao`: salao encerrou atividades.
- `mudou_de_ramo`: cliente nao atua mais no segmento atendido.
- `sem_potencial`: cliente nao deve ser trabalhado por decisao comercial.
- `duplicado`: registro mantido para auditoria, mas nao usado na rotina.
- `arquivado`: cliente fora da operacao por decisao interna.

Padrao para novos clientes:

- `ativo`

## Diferenca entre os status do CRM

### Status operacional

Indica o andamento comercial da rotina:

- Nao trabalhado
- Contatado
- Aguardando retorno
- Convertido
- Visita encaminhada

Use para acompanhar o que a equipe fez ou precisa fazer com o cliente.

### Situacao financeira

Indica restricoes financeiras antes de negociar nova venda:

- Adimplente
- Inadimplente
- Bloqueado
- Em negociacao

Use quando o escritorio ou financeiro precisar sinalizar pendencia, bloqueio ou negociacao.

### Situacao da carteira

Indica se o cliente deve entrar na operacao comercial:

- Ativo
- Fechou salao
- Mudou de ramo
- Sem potencial
- Duplicado
- Arquivado

Use quando o cliente nao deve mais ser tratado como oportunidade comercial, mas o historico precisa ser preservado.

## Impacto nos indicadores

Clientes com `portfolio_status` diferente de `ativo` nao entram por padrao em:

- Carteira operacional
- Atenção
- Risco
- Inativo antigo
- Recompra
- Nao trabalhados
- Prioridades comerciais
- Metas operacionais
- Agenda
- Calendario
- Alertas operacionais

Eles aparecem apenas quando o usuario filtra a Carteira ou Relatorios por uma situacao especifica ou por "Todos".

## Carteira

Filtro adicionado:

- Ativos
- Fechou salao
- Mudou de ramo
- Sem potencial
- Duplicados
- Arquivados
- Todos

Regra padrao:

- A Carteira abre mostrando apenas `Ativos`.

Para auditar ou reabrir clientes fora da operacao, use o filtro "Todos" ou selecione o motivo desejado.

## Detalhe do cliente

O detalhe possui o card "Situacao da Carteira".

Campos editaveis:

- Situacao da carteira
- Observacao

Se o cliente nao estiver ativo, a pagina mostra o alerta:

> Cliente fora da operacao comercial. Motivo: Fechou salao / Arquivado / etc.

Ao voltar a situacao para `ativo`, o cliente volta a entrar na Carteira padrao e nos indicadores comerciais.

## Dashboard

O Dashboard diferencia operacao atual de historico fora da operacao:

- Carteira ativa
- Clientes arquivados
- Fecharam salao
- Fora da operacao

Os indicadores de risco, inativos, recompra, nao trabalhados, metas, prioridades e alertas consideram apenas a carteira ativa.

## Relatorios

Relatorios possuem filtro por Situacao da Carteira.

Padrao:

- `Ativos`

Uso recomendado:

- Use `Todos` para auditorias historicas.
- Use uma situacao especifica para revisar clientes retirados da operacao.

## Importacao mensal

A importacao mensal do Mercos nunca deve sobrescrever:

- `portfolio_status`
- `portfolio_status_note`

Se um cliente marcado como `fechou_salao`, `sem_potencial`, `duplicado` ou `arquivado` aparecer novamente em uma planilha futura, a situacao marcada anteriormente deve ser mantida.

A planilha atualiza dados comerciais do Mercos, mas a decisao operacional interna permanece preservada.

## Quando usar cada opcao

Use `ativo` quando o cliente deve ser trabalhado normalmente.

Use `fechou_salao` quando houver confirmacao de encerramento do salao.

Use `mudou_de_ramo` quando o cliente continua existindo, mas nao compra mais produtos do segmento atendido.

Use `sem_potencial` quando a equipe decidir que nao vale continuar acionando o cliente.

Use `duplicado` quando o cadastro for repetido e outro registro for o principal.

Use `arquivado` para casos internos que devem sair da rotina sem motivo comercial especifico.

## Validacao funcional

1. Marcar um cliente como `Fechou salao`.
2. Confirmar que ele sai da Carteira padrao.
3. Confirmar que ele nao aparece em Risco, Inativo antigo, Recompra e Nao trabalhados.
4. Filtrar a Carteira por `Fechou salao` e confirmar que o cliente aparece.
5. Abrir o detalhe e confirmar que historico, interacoes e follow-ups permanecem.
6. Alterar a situacao para `Ativo`.
7. Confirmar que o cliente volta para a Carteira padrao.
8. Importar nova planilha mensal e confirmar que a situacao marcada nao foi sobrescrita.
