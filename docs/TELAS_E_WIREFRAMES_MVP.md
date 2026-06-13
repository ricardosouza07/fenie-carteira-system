# Telas e Wireframes do MVP - Central de Carteira Fenié PRO

## 1. Direção geral de UX

O sistema deve parecer uma central operacional de carteira, não uma landing page nem uma peça promocional. A experiência deve seguir o padrão visual do Mercos: clara, corporativa, com menu lateral esquerdo, topo simples, filtros bem visíveis, cards objetivos e tabelas eficientes.

Prioridades da interface:

- Trabalhar rápido.
- Ver prioridades sem esforço.
- Registrar contato em poucos segundos.
- Filtrar e ordenar a carteira com fluidez.
- Reduzir distrações visuais.
- Manter dados comerciais legíveis em telas grandes e notebooks.

Decisão visual:

- Fundo geral cinza claro.
- Áreas de conteúdo brancas.
- Bordas finas.
- Texto escuro e hierarquia tipográfica contida.
- Verde para saudável/convertido.
- Amarelo para atenção.
- Vermelho para risco/vencido.
- Cinza para inativo/não trabalhado.
- Roxo ou vinho discreto como cor institucional de ação, se desejado.

## 2. Mapa completo de telas

### 2.1 Área pública

- Login.
- Recuperar senha.

### 2.2 Área operacional

- Dashboard.
- Minha agenda.
- Carteira.
- Detalhe do cliente.
- Registrar contato, como modal ou painel lateral.
- Calendário.
- Relatórios.
- Metas.

### 2.3 Área administrativa

- Importações.
- Detalhe da importação.
- Usuários.
- Vendedores e aliases.
- Regras e configurações.
- Auditoria, opcional no MVP se ficar simples.

### 2.4 Rotas sugeridas

```text
/login
/recuperar-senha

/dashboard
/agenda
/carteira
/clientes/:id
/calendario
/relatorios
/metas

/importacoes
/importacoes/:id
/configuracoes/usuarios
/configuracoes/vendedores
/configuracoes/regras
/configuracoes/auditoria
```

## 3. Sidebar completa do sistema

### 3.1 Estrutura da sidebar

```text
Fenié PRO
Central de Carteira

Principal
- Dashboard
- Minha agenda
- Carteira
- Calendário

Gestão
- Relatórios
- Metas

Administração
- Importações
- Usuários
- Vendedores
- Regras
- Auditoria

Rodapé
- Nome do usuário
- Perfil
- Sair
```

### 3.2 Itens por perfil

Admin:

- Todos os itens.

Supervisor:

- Dashboard.
- Minha agenda.
- Carteira.
- Calendário.
- Relatórios.
- Metas.
- Importações.
- Vendedores.
- Regras, se permitido.

Vendedor interno:

- Dashboard.
- Minha agenda.
- Carteira.
- Calendário.
- Relatórios pessoais, se liberado.

Vendedor externo:

- Minha agenda.
- Carteira atribuída.
- Calendário.

### 3.3 Comportamento da sidebar

- Desktop: fixa à esquerda.
- Notebook: fixa, compacta o suficiente para não roubar área da tabela.
- Mobile: abre por botão de menu.
- Item ativo com barra lateral ou fundo suave.
- Badges pequenos para pendências: agenda vencida, follow-ups de hoje, importações com erro.

## 4. Fluxo de navegação

### 4.1 Fluxo principal diário do vendedor

```text
Login
  -> Dashboard ou Minha agenda
  -> Ver prioridades do dia
  -> Abrir cliente
  -> Registrar contato
  -> Agendar follow-up ou marcar conversão
  -> Voltar para lista filtrada
```

### 4.2 Fluxo de trabalho pela carteira

```text
Carteira
  -> Filtrar por Risco / Inativo / Próxima compra vencida
  -> Ordenar por Dias sem comprar
  -> Abrir cliente ou ação rápida
  -> Registrar contato
  -> Status atualizado na tabela
```

### 4.3 Fluxo do supervisor

```text
Dashboard
  -> Filtrar mês e vendedor
  -> Ver gargalos
  -> Clicar em indicador
  -> Carteira já filtrada
  -> Revisar clientes
  -> Relatórios
  -> Exportar fechamento
```

### 4.4 Fluxo de importação

```text
Importações
  -> Nova importação
  -> Upload XLSX
  -> Preview
  -> Revisar erros e duplicados
  -> Publicar carteira
  -> Dashboard atualizado
```

### 4.5 Fluxo de cliente convertido

```text
Cliente
  -> Registrar contato
  -> Status: Convertido
  -> Informar valor recuperado
  -> Salvar
  -> Cliente aparece em Convertidos do mês
  -> Dashboard e relatório atualizados
```

## 5. Hierarquia visual padrão das páginas

Todas as páginas internas devem seguir a mesma estrutura:

```text
App Shell
  Sidebar fixa
  Conteúdo principal
    Topbar
      Busca rápida opcional
      Usuário/perfil
    Page header
      Título
      Subtítulo curto
      Ação principal
    Filtros
    Conteúdo principal
    Tabela/lista/detalhe
```

Ordem de importância visual:

1. Título da página e ação principal.
2. Filtros que mudam o conteúdo.
3. Indicadores essenciais.
4. Tabela ou lista operacional.
5. Detalhes secundários.
6. Configurações e ações raras.

Regras de interface:

- Filtros devem ficar sempre antes da tabela.
- Ações principais ficam no canto superior direito.
- A tabela é o centro da operação, não um complemento.
- Modais devem ser rápidos e objetivos.
- Evitar textos explicativos longos dentro das telas.
- Evitar cards decorativos.
- Cada indicador clicável deve abrir uma lista filtrada.

## 6. Componentes principais

### 6.1 Layout

- `AppShell`: estrutura com sidebar, topbar e área principal.
- `Sidebar`: navegação por perfil.
- `Topbar`: busca rápida, mês atual e usuário.
- `PageHeader`: título, subtítulo, ações.
- `ContentSection`: bloco simples de conteúdo.

### 6.2 Dados e filtros

- `FilterBar`: filtros por mês, vendedor, cidade, status, classificação.
- `SearchInput`: busca por nome, razão social, telefone, cidade e bairro.
- `DataTable`: tabela com ordenação, paginação, seleção de colunas e estado vazio.
- `ColumnVisibilityMenu`: esconder/mostrar colunas.
- `SavedViewSelector`: opcional, para filtros salvos.

### 6.3 Indicadores

- `MetricCard`: número principal, variação e link para detalhe.
- `ProgressBar`: meta realizada.
- `StatusBadge`: saudável, atenção, risco, inativo, convertido etc.
- `PriorityBadge`: vencido, hoje, futuro.

### 6.4 Operação comercial

- `CustomerRowActions`: registrar, WhatsApp, follow-up, visita.
- `InteractionDrawer`: painel lateral para registrar contato.
- `InteractionTimeline`: histórico cronológico.
- `FollowUpForm`: agendamento simples.
- `CustomerSummaryPanel`: resumo do cliente.

### 6.5 Importação e relatórios

- `ImportDropzone`: upload de XLSX.
- `ImportPreviewTable`: preview validado.
- `ImportIssueList`: erros e duplicados.
- `ExportButton`: exportação com log.
- `ReportSummary`: resumo antes da tabela detalhada.

## 7. Informações por tela

### 7.1 Login

Objetivo:

- Dar acesso rápido ao sistema interno.

Informações:

- Logo Fenié PRO.
- Campo e-mail.
- Campo senha.
- Entrar.
- Recuperar senha.

Estrutura visual:

```text
Centro da tela
  Logo
  Título: Central de Carteira
  Formulário compacto
  Link recuperar senha
```

Notas:

- Sem marketing.
- Sem imagem grande.
- Sem textos longos.

### 7.2 Dashboard

Objetivo:

- Mostrar a situação do mês e direcionar para ações.

Informações:

- Filtros: mês, ano, vendedor, cidade.
- Última importação publicada.
- Total de clientes.
- Saudáveis.
- Atenção.
- Risco.
- Inativos antigos.
- Trabalhados no mês.
- Não trabalhados.
- Convertidos.
- Valor recuperado.
- Follow-ups vencidos.
- Meta mensal.
- Performance por vendedor.
- Lista de prioridades.

Estrutura visual:

```text
Header
  Título: Dashboard
  Subtítulo: Visão operacional da carteira
  Ações: Exportar, Definir meta

Filtros
  Mês | Ano | Vendedor | Cidade

Linha 1 - KPIs
  Total clientes | Em risco | Inativos | Convertidos | Valor recuperado

Linha 2 - Operação do dia
  Follow-ups vencidos | Follow-ups hoje | Não trabalhados | Aguardando retorno

Linha 3
  Gráfico: evolução do mês / meta
  Painel: objetivo do mês e progresso

Linha 4
  Carteira por classificação
  Status operacional do mês
  Performance por vendedor

Linha 5
  Tabela: prioridades para ação
```

Hierarquia:

1. Alertas vencidos e risco.
2. Conversões e valor recuperado.
3. Meta.
4. Distribuição da carteira.
5. Rankings e detalhes.

Comportamento:

- Clicar em "Em risco" abre Carteira filtrada por risco.
- Clicar em "Follow-ups vencidos" abre Minha agenda filtrada.
- Clicar em vendedor abre Carteira filtrada por vendedor.

### 7.3 Minha agenda

Objetivo:

- Ser a primeira tela de trabalho do vendedor.

Informações:

- Follow-ups vencidos.
- Follow-ups de hoje.
- Próximas compras previstas hoje.
- Clientes aguardando retorno.
- Visitas encaminhadas, quando aplicável.

Estrutura visual:

```text
Header
  Título: Minha agenda
  Ação: Novo follow-up

Filtros rápidos
  Hoje | Vencidos | Semana | Todos

Coluna principal
  Lista agrupada por prazo
    Vencidos
    Hoje
    Próximos 7 dias

Painel lateral
  Resumo do dia
  Contatos feitos
  Conversões
  Pendências restantes
```

Tabela/lista:

- Horário ou prazo.
- Cliente.
- Telefone.
- Cidade.
- Motivo.
- Status.
- Ações: registrar, reagendar, concluir.

### 7.4 Carteira

Objetivo:

- Ser a tela mais eficiente para trabalhar a base.

Informações:

- Busca global.
- Filtros por classificação, status, vendedor, cidade, tipo, próxima compra, dias sem comprar.
- Total de resultados.
- Tabela de clientes.

Estrutura visual:

```text
Header
  Título: Carteira
  Subtítulo: 1.121 clientes na carteira atual
  Ações: Novo cliente, Exportar, Colunas

Filtros principais
  Busca
  Vendedor
  Cidade
  Classificação
  Status
  Próxima compra

Filtros rápidos
  Todos | Atenção | Risco | Inativos | Não trabalhados | Convertidos | Vencidos

Tabela
  Nível
  Cliente
  Telefone
  Cidade/Bairro
  Dias sem comprar
  Próxima compra
  Último pedido
  Vendedor
  Status
  Última ação
  Ações
```

Ações por linha:

- Registrar contato.
- Abrir WhatsApp.
- Agendar follow-up.
- Encaminhar visita.
- Ver detalhe.

Requisitos de produtividade:

- Tabela paginada.
- Cabeçalho fixo.
- Larguras previsíveis.
- Badges curtos.
- Menu de colunas.
- Ordenação por dias sem comprar, valor, próxima compra e cliente.
- Retornar da tela de cliente preservando filtros.

### 7.5 Detalhe do cliente

Objetivo:

- Dar contexto suficiente para agir sem poluir a carteira.

Informações:

- Nome fantasia ou razão social.
- Telefone principal.
- E-mail.
- Cidade, bairro, endereço.
- Classificação.
- Situação da planilha.
- Dias sem comprar.
- Data do último pedido.
- Valor do último pedido.
- Ciclo médio.
- Próxima compra prevista.
- Vendedor do último pedido.
- Responsável atual.
- Status operacional atual.
- Histórico de interações.
- Follow-ups.

Estrutura visual:

```text
Header
  Voltar para carteira
  Nome do cliente
  Badges: Risco, Aguardando retorno, Responsável
  Ações: Registrar contato, WhatsApp, Agendar follow-up

Linha 1
  Resumo comercial
  Dados de contato
  Próxima ação

Abas
  Histórico
  Follow-ups
  Dados da carteira
  Observações
```

Hierarquia:

1. Ação principal: registrar contato.
2. Telefone/WhatsApp.
3. Próxima ação.
4. Dados do último pedido.
5. Histórico.

### 7.6 Registrar contato

Objetivo:

- Registrar ação comercial em poucos segundos.

Formato recomendado:

- Painel lateral à direita em desktop.
- Modal em telas pequenas.

Informações:

- Cliente.
- Telefone.
- Status.
- Tipo de cliente.
- Canal.
- Observação.
- Valor recuperado, quando convertido.
- Próximo follow-up.

Estrutura visual:

```text
Painel lateral
  Cliente + resumo mínimo

  Status
    Contatado
    Aguardando retorno
    Convertido
    Visita encaminhada

  Tipo
    Loja
    Externo
    Novo
    Espontâneo

  Canal
    WhatsApp
    Telefone
    E-mail
    Presencial

  Observação
  Próximo follow-up

  Botões
    Cancelar
    Salvar registro
```

Regras de UX:

- Status deve ser seleção de botões.
- Observação deve aceitar texto curto.
- Campo de valor aparece somente em convertido.
- Próximo follow-up é opcional.
- Após salvar, tabela atualiza sem perder filtros.

### 7.7 Calendário

Objetivo:

- Visualizar follow-ups e próximas compras por data.

Informações:

- Calendário mensal.
- Quantidade de tarefas por dia.
- Lista lateral do dia selecionado.
- Legenda: próxima compra, follow-up manual, visita, vencido, convertido.

Estrutura visual:

```text
Header
  Título: Calendário
  Ação: Novo follow-up

Filtros
  Vendedor | Tipo | Status | Mês

Área principal
  Calendário mensal

Painel lateral
  Dia selecionado
  Lista de clientes
  Ações por cliente
```

Observação:

- Para produtividade, a tela Minha agenda deve ser mais importante que o calendário visual no MVP.

### 7.8 Importações

Objetivo:

- Controlar entrada da carteira sem bagunçar dados existentes.

Informações:

- Lista de importações.
- Data.
- Arquivo.
- Usuário.
- Status.
- Linhas válidas.
- Linhas inválidas.
- Publicada ou não.

Estrutura visual:

```text
Header
  Título: Importações
  Ação: Nova importação

Tabela
  Data
  Arquivo
  Importado por
  Total
  Válidos
  Erros
  Status
  Ações
```

Fluxo de nova importação:

```text
Passo 1 - Upload
  Selecionar arquivo

Passo 2 - Leitura
  Cabeçalho encontrado
  Colunas reconhecidas

Passo 3 - Validação
  Válidos
  Inválidos
  Duplicados

Passo 4 - Preview
  Amostra da carteira
  Contagens por situação

Passo 5 - Publicação
  Confirmar publicar
```

### 7.9 Relatórios

Objetivo:

- Dar visão de fechamento e exportação.

Informações:

- Período.
- Vendedor.
- Cidade.
- Classificação.
- Status.
- Total trabalhado.
- Convertidos.
- Valor recuperado.
- Follow-ups vencidos.
- Tabela detalhada.

Estrutura visual:

```text
Header
  Título: Relatórios
  Ações: Exportar Excel

Filtros
  Período | Vendedor | Cidade | Status | Classificação

Resumo
  Trabalhados | Convertidos | Valor recuperado | Taxa de conversão

Abas
  Clientes trabalhados
  Convertidos
  Performance por vendedor
  Follow-ups

Tabela detalhada
```

### 7.10 Metas

Objetivo:

- Configurar e acompanhar metas mensais.

Informações:

- Mês.
- Meta da equipe.
- Meta por vendedor.
- Realizado.
- Percentual.
- Conversões.
- Contatos.

Estrutura visual:

```text
Header
  Título: Metas
  Ação: Editar metas

Resumo mensal
  Meta de valor
  Valor recuperado
  Conversões
  Percentual realizado

Tabela por vendedor
  Vendedor
  Meta valor
  Realizado
  Meta conversões
  Conversões
  Status
```

### 7.11 Usuários

Objetivo:

- Gerenciar acesso interno.

Informações:

- Nome.
- E-mail.
- Perfil.
- Status.
- Último acesso.

Estrutura visual:

```text
Header
  Título: Usuários
  Ação: Novo usuário

Tabela
  Nome
  E-mail
  Perfil
  Status
  Último acesso
  Ações
```

### 7.12 Vendedores e aliases

Objetivo:

- Ligar nomes da planilha a usuários reais.

Informações:

- Nome no sistema.
- Nomes encontrados na planilha.
- Usuário vinculado.
- Tipo: interno, externo, loja.
- Status.

Estrutura visual:

```text
Header
  Título: Vendedores
  Ação: Novo vendedor

Tabela
  Vendedor
  Aliases da planilha
  Usuário vinculado
  Tipo
  Status
  Ações
```

### 7.13 Regras e configurações

Objetivo:

- Ajustar regras operacionais sem código.

Informações:

- Faixas de classificação.
- Configurações de importação.
- Tipos de cliente.
- Canais de contato.
- Permissões simples.

Estrutura visual:

```text
Header
  Título: Regras
  Ação: Salvar alterações

Seções
  Classificação da carteira
  Importação
  Tipos e status
```

## 8. Estrutura do dashboard

### 8.1 Objetivo do dashboard

O dashboard não deve tentar mostrar tudo. Ele deve responder três perguntas:

- O que precisa de ação agora?
- Como está a saúde da carteira?
- Como está a performance do mês?

### 8.2 Blocos do dashboard

Bloco 1: filtros

- Mês.
- Ano.
- Vendedor.
- Cidade.

Bloco 2: alertas operacionais

- Follow-ups vencidos.
- Clientes em risco sem contato.
- Inativos antigos sem ação.
- Aguardando retorno.

Bloco 3: KPIs principais

- Total de clientes.
- Trabalhados no mês.
- Convertidos.
- Valor recuperado.
- Taxa de conversão.

Bloco 4: meta mensal

- Objetivo do mês.
- Realizado.
- Percentual.
- Necessário até fim do mês.

Bloco 5: saúde da carteira

- Saudáveis.
- Atenção.
- Risco.
- Inativos antigos.

Bloco 6: performance por vendedor

- Contatos.
- Conversões.
- Valor recuperado.
- Follow-ups vencidos.

Bloco 7: tabela de prioridades

- Clientes em risco.
- Clientes com próxima compra vencida.
- Clientes aguardando retorno.

### 8.3 Wireframe do dashboard

```text
┌──────────────────────────────────────────────────────────────┐
│ Dashboard                                      Exportar Meta  │
│ Visão operacional da carteira                                │
├──────────────────────────────────────────────────────────────┤
│ Filtros: [Maio] [2026] [Todos vendedores] [Todas cidades]    │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Vencidos     │ Em risco     │ Convertidos  │ Valor recuper. │
│ 18           │ 61           │ 24           │ R$ 12.450,00   │
├──────────────┴──────────────┴──────────────┴────────────────┤
│ Evolução do mês                              Meta do mês     │
│ [gráfico simples]                            [progresso]     │
├──────────────────────────────┬───────────────────────────────┤
│ Carteira por classificação   │ Status operacional            │
│ Saudável/Atenção/Risco/Inat. │ Não trabalhado/Contatado/etc. │
├──────────────────────────────┴───────────────────────────────┤
│ Performance por vendedor                                      │
│ [tabela compacta]                                              │
├──────────────────────────────────────────────────────────────┤
│ Prioridades para ação                                         │
│ [tabela de clientes filtráveis]                               │
└──────────────────────────────────────────────────────────────┘
```

## 9. Wireframes textuais do MVP

### 9.1 Login

```text
┌──────────────────────────────┐
│ Fenié PRO                    │
│ Central de Carteira          │
├──────────────────────────────┤
│ E-mail                       │
│ [__________________________] │
│ Senha                        │
│ [__________________________] │
│ [ Entrar ]                   │
│ Recuperar senha              │
└──────────────────────────────┘
```

### 9.2 Carteira

```text
┌──────────────────────────────────────────────────────────────┐
│ Carteira                                  Novo cliente Export │
│ 1.121 clientes na carteira atual                             │
├──────────────────────────────────────────────────────────────┤
│ Busca [nome, telefone, cidade...]                            │
│ Vendedor [Todos] Cidade [Todas] Status [Todos] Nível [Todos] │
│ [Todos] [Atenção] [Risco] [Inativos] [Não trabalhados]       │
├──────┬──────────────┬─────────┬──────┬──────────┬───────────┤
│ Nível│ Cliente      │ Telefone│ Dias │ Próx.comp│ Ações     │
├──────┼──────────────┼─────────┼──────┼──────────┼───────────┤
│ Risco│ Studio Alfa  │ 41...   │ 72   │ 10/06    │ Registrar │
│ Inat.│ Cliente Beta │ 41...   │ 180  │ -        │ Registrar │
└──────┴──────────────┴─────────┴──────┴──────────┴───────────┘
```

### 9.3 Detalhe do cliente

```text
┌──────────────────────────────────────────────────────────────┐
│ ← Carteira  Studio Alfa            [WhatsApp] [Registrar]   │
│ Risco · Curitiba · Responsável: Laryssa                     │
├──────────────────────┬──────────────────────┬────────────────┤
│ Último pedido        │ Próxima compra       │ Status atual   │
│ R$ 426,00 · 14/05    │ 10/06/2026           │ Aguardando     │
├──────────────────────┴──────────────────────┴────────────────┤
│ Abas: Histórico | Follow-ups | Dados da carteira             │
├──────────────────────────────────────────────────────────────┤
│ Timeline                                                     │
│ 25/05 - Contatado por WhatsApp - Observação...               │
│ 24/05 - Follow-up criado para 27/05                          │
└──────────────────────────────────────────────────────────────┘
```

### 9.4 Registrar contato

```text
┌──────────────────────────────┐
│ Registrar contato            │
│ Studio Alfa · Risco · 72 dias │
├──────────────────────────────┤
│ Status                       │
│ [Contatado] [Aguardando]     │
│ [Convertido] [Visita]        │
│ Tipo                         │
│ [Loja] [Externo] [Novo]      │
│ Canal                        │
│ [WhatsApp] [Telefone]        │
│ Observação                   │
│ [__________________________] │
│ Próximo follow-up            │
│ [Data e hora]                │
│ [Cancelar] [Salvar registro] │
└──────────────────────────────┘
```

### 9.5 Minha agenda

```text
┌──────────────────────────────────────────────────────────────┐
│ Minha agenda                              Novo follow-up     │
├──────────────────────────────────────────────────────────────┤
│ [Hoje] [Vencidos] [Semana] [Todos]                           │
├─────────────────────────────────────┬────────────────────────┤
│ Vencidos                            │ Resumo do dia          │
│ Cliente A · retorno pendente        │ 12 pendências          │
│ Cliente B · próxima compra vencida  │ 4 contatos feitos      │
│                                     │ 1 conversão            │
│ Hoje                                │                        │
│ Cliente C · ligar às 14h            │                        │
└─────────────────────────────────────┴────────────────────────┘
```

### 9.6 Importação

```text
┌──────────────────────────────────────────────────────────────┐
│ Nova importação                                              │
├──────────────────────────────────────────────────────────────┤
│ Passos: Upload > Validação > Preview > Publicar              │
├──────────────────────────────────────────────────────────────┤
│ [ Selecionar arquivo XLSX ]                                  │
│ Arquivo: Carteira_Padronizada_Fenié.xlsx                     │
├──────────────────────────────────────────────────────────────┤
│ Resumo                                                       │
│ 1.121 válidos · 0 inválidos · 12 possíveis duplicados        │
├──────────────────────────────────────────────────────────────┤
│ Preview da carteira                                          │
│ [tabela com amostra e status de validação]                   │
│                                             [Publicar]       │
└──────────────────────────────────────────────────────────────┘
```

### 9.7 Relatórios

```text
┌──────────────────────────────────────────────────────────────┐
│ Relatórios                                  Exportar Excel   │
├──────────────────────────────────────────────────────────────┤
│ Período [Maio/2026] Vendedor [Todos] Status [Todos]          │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Trabalhados  │ Convertidos  │ Taxa conv.   │ Valor recuper. │
│ 310          │ 24           │ 7,7%         │ R$ 12.450,00   │
├──────────────────────────────────────────────────────────────┤
│ Abas: Trabalhados | Convertidos | Vendedores | Follow-ups    │
├──────────────────────────────────────────────────────────────┤
│ [tabela detalhada]                                           │
└──────────────────────────────────────────────────────────────┘
```

### 9.8 Metas

```text
┌──────────────────────────────────────────────────────────────┐
│ Metas                                         Editar metas   │
├──────────────────────────────────────────────────────────────┤
│ Maio 2026                                                     │
│ Meta: R$ 50.000 · Realizado: R$ 12.450 · 24,9%               │
├──────────────────────────────────────────────────────────────┤
│ Vendedor        Meta       Realizado    Conversões   Status │
│ Laryssa         15.000     7.200        8            Em dia │
│ Comercial Int.  10.000     2.100        3            Atenção│
└──────────────────────────────────────────────────────────────┘
```

## 10. Regras de eficiência para tabelas

Carteira e relatórios devem seguir estas regras:

- Paginação obrigatória.
- Busca com debounce.
- Filtros combináveis.
- Ordenação por colunas críticas.
- Colunas com largura fixa para status, dias e ações.
- Nome do cliente com truncamento e tooltip.
- Ações de linha por ícone ou botão curto.
- Estado vazio útil, sem ilustração exagerada.
- Exportação respeitando filtros.
- Preservar filtros ao abrir e voltar de um cliente.

## 11. Experiência baseada no Mercos

Aplicar:

- Menu lateral com ícones e labels curtos.
- Topbar discreta.
- Cards brancos com bordas leves.
- Filtros em faixa horizontal.
- Gráficos simples e legíveis.
- Botões pequenos e objetivos.
- Tabelas com cabeçalho claro.
- Links de detalhamento abaixo de indicadores, quando necessário.

Evitar:

- Fundo escuro.
- Gradientes pesados.
- Animações de celebração no MVP.
- Grandes blocos de texto.
- Cards decorativos.
- Ícones chamativos demais.
- Gamificação visual como centro da experiência.

## 12. MVP visual final

O MVP deve conter estas telas prontas para uso:

- Login.
- Dashboard.
- Minha agenda.
- Carteira.
- Detalhe do cliente.
- Registrar contato.
- Calendário.
- Importações.
- Relatórios.
- Metas.
- Usuários.
- Vendedores.
- Regras.

Prioridade de construção visual:

1. App shell com sidebar e topbar.
2. Carteira com tabela eficiente.
3. Registrar contato.
4. Dashboard operacional.
5. Minha agenda.
6. Importações.
7. Relatórios.
8. Configurações.

