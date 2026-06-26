# Regras operacionais Fenié

Este documento define a linguagem oficial usada na Central de Carteira Fenié. As regras abaixo devem orientar filtros, badges, alertas, dashboard, agenda, calendário, relatórios e leitura operacional da equipe.

## Classificação comercial

### Saudável
- Cliente com 0 a 59 dias sem comprar.
- Deve continuar na carteira, mas não exige ação prioritária por atraso de recompra.

### Atenção
- Cliente com 60 a 89 dias sem comprar.
- Indica perda de ritmo de compra e deve entrar em rotina de contato preventivo.

### Risco
- Cliente com 90 a 179 dias sem comprar.
- Indica risco comercial real e deve ter prioridade de contato.

### Inativo antigo
- Cliente com 180 ou mais dias sem comprar.
- Indica carteira parada há muito tempo e deve ser tratado como reativação.

## Recompra

Recompra é o cliente cuja próxima compra prevista já passou.

No sistema, o termo "Vencidos" não deve ser usado para clientes com próxima compra atrasada. A palavra correta para filtro, alerta, badge e agrupamento operacional é "Recompra".

Exemplos:
- Filtro rápido: Recompra.
- Card operacional: Recompra.
- Evento de calendário: Recompra.
- Motivo de prioridade: Recompra.

## Convertido

Convertido é o cliente com conversão registrada nos últimos 30 dias.

Conversão tem prioridade operacional sobre as demais leituras. Se um cliente foi convertido nos últimos 30 dias:
- não deve aparecer como Atenção;
- não deve aparecer como Risco;
- não deve aparecer como Recompra;
- deve aparecer como Convertido.

Essa regra vale mesmo que o cliente tenha muitos dias sem comprar ou próxima compra prevista já passada.

## Follow-ups em atraso

Follow-up com prazo passado deve ser apresentado como "em atraso".

Essa regra evita confundir retorno operacional atrasado com Recompra. A base técnica ainda pode armazenar o status `vencido`, mas a interface deve mostrar "Em atraso".

## Ordem de prioridade visual

Quando houver conflito entre regras, a ordem de decisão é:

1. Convertido nos últimos 30 dias.
2. Recompra, quando a próxima compra prevista passou.
3. Inativo antigo, para 180+ dias sem comprar.
4. Risco, para 90 a 179 dias sem comprar.
5. Atenção, para 60 a 89 dias sem comprar.
6. Saudável, para 0 a 59 dias sem comprar.

Nos filtros de classificação, Convertido deve ficar fora de Atenção, Risco, Inativo antigo e Recompra.

## Regra de importação

Ao importar a carteira, a classificação calculada deve seguir:

- 0 a 59 dias: Saudável.
- 60 a 89 dias: Atenção.
- 90 a 179 dias: Risco.
- 180+ dias: Inativo antigo.

## Aplicação por módulo

- Carteira: filtros rápidos, badges e coluna de próxima compra devem usar Recompra e respeitar prioridade de Convertido.
- Dashboard: KPIs, alertas e prioridades devem excluir convertidos recentes dos grupos de Atenção, Risco, Inativo antigo e Recompra.
- Agenda: o grupo de clientes com próxima compra passada deve ser Recompra; follow-ups atrasados devem aparecer como Em atraso.
- Calendário: eventos de próxima compra passada devem aparecer como Recompra; follow-ups atrasados devem continuar como Follow-up com status Em atraso.
- Relatórios: filtros e tabelas devem respeitar a prioridade de Convertido e usar Em atraso para follow-ups fora do prazo.
