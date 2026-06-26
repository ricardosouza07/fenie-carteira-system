# PRD Completo - Central de Carteira Fenié PRO

## 1. Contexto

A Central de Carteira Fenié PRO será um sistema interno para gestão da carteira comercial, reativação de clientes, controle de follow-up, acompanhamento de vendedores, metas e oportunidades.

O produto não será um SaaS, marketplace ou plataforma multiempresa. A prioridade é entregar uma ferramenta simples, rápida, responsiva e fácil de usar pela equipe comercial da Fenié.

## 2. Fontes analisadas

### 2.1 Documentos

- `prompt-inicial.md/prompt-inicial.md.txt`: define objetivo, stack sugerida, escopo do MVP e orientação visual.
- `docs/PRD.md.txt`: PRD inicial resumido.
- `docs/roadmap.md.txt`: fases do projeto, prioridades e visão de evolução.
- `docs/regras-negocio.md.txt`: regra de classificação e fluxo operacional base.
- `docs/Print_Fenie-Professionnel-Mercos.png`: referência visual do Mercos.

### 2.2 Planilha base

Arquivo: `base/Carteira_Padronizada_Fenié (1).xlsx`

Abas:

- `Carteira de Clientes`: base principal.
- `Resumo Padronização`: resumo de limpeza de bairro, cidade e estado.

Estrutura da carteira:

- Cabeçalho real na linha 9.
- 1.121 clientes úteis.
- 16 campos: Razão Social, Nome fantasia, E-mail, Telefone, Cidade, Estado, Data do último pedido, Vendedor do último pedido, Valor do último pedido, Dias sem comprar, Ciclo médio de compra, Próxima compra prevista, Situação, Bairro, CEP, Endereço.
- Situação no arquivo:
  - Ativo: 304 clientes.
  - Inativo recente: 61 clientes.
  - Inativo antigo: 756 clientes.
- Principais cidades:
  - Curitiba: 593.
  - Colombo: 93.
  - São José dos Pinhais: 75.
  - Pinhais: 42.
  - Almirante Tamandaré: 33.
- Campos com atenção de qualidade:
  - Nome fantasia ausente em 843 registros.
  - E-mail ausente em 127 registros.
  - Cidade ausente em 78 registros.
  - Bairro ausente em 85 registros.
  - CEP ausente em 359 registros.
  - Telefone preenchido em todos os registros.

### 2.3 Protótipo

Arquivo: `prototype/fenié_reativacao_v2.html`

Ideias aproveitáveis:

- Importação de planilha.
- Dashboard por situação da base.
- Lista da carteira com filtros por vendedor, cidade e classificação.
- Busca por nome, telefone, cidade e bairro.
- Registro de contato em modal.
- Status de trabalho: contatado, aguardando retorno, convertido e visita encaminhada.
- Tipo de cliente: loja, vendedor externo, novo e pedido espontâneo.
- Calendário com próxima compra prevista e agendamento manual.
- Exportação de relatório.
- Fechamento mensal com snapshot.
- Metas, missões e pontuação como possível camada de engajamento.

Pontos que devem mudar:

- O visual escuro, luxuoso e gamificado não deve guiar o produto final.
- Dados não podem ficar em `localStorage`; precisam persistir no Supabase/PostgreSQL.
- O sistema precisa de usuários, permissões, auditoria e histórico multiusuário.
- A experiência deve seguir a referência Mercos: clara, corporativa, produtiva, com menu lateral, tabelas limpas e dashboards objetivos.

## 3. Objetivos do produto

### 3.1 Objetivo principal

Dar à equipe comercial uma central única para priorizar clientes, registrar contatos, acompanhar follow-ups, reativar inativos e medir performance por vendedor.

### 3.2 Objetivos de negócio

- Reduzir clientes esquecidos.
- Aumentar reativação de clientes em risco e inativos.
- Melhorar disciplina de follow-up.
- Dar visibilidade ao supervisor sobre carteira, equipe e metas.
- Transformar a planilha atual em fluxo operacional diário.
- Gerar relatórios mensais confiáveis.

### 3.3 Objetivos de experiência

- O vendedor deve saber rapidamente quem trabalhar hoje.
- O supervisor deve enxergar gargalos sem montar planilhas manuais.
- Registrar uma interação deve levar poucos segundos.
- Filtros, busca e ordenação devem ser rápidos.
- A interface deve parecer ferramenta de trabalho, não landing page.

## 4. Não objetivos

- Não vender o sistema para terceiros.
- Não criar multiempresa no MVP.
- Não criar aplicativo mobile nativo no MVP.
- Não implementar marketplace.
- Não implementar IA avançada no MVP.
- Não automatizar WhatsApp no MVP, apenas facilitar link ou registro.
- Não substituir o CRM de origem, mas complementar a operação da carteira.

## 5. Personas

### 5.1 Supervisor comercial

Responsável por acompanhar a carteira geral, vendedores, metas, conversões, clientes sem contato e relatórios.

Necessidades:

- Visão da carteira completa.
- Performance por vendedor.
- Clientes parados ou esquecidos.
- Exportação de relatório.
- Gestão de metas mensais.
- Atribuição ou revisão de responsáveis.

### 5.2 Vendedor interno

Responsável por trabalhar a carteira, contatar clientes, registrar interações e gerar conversões.

Necessidades:

- Lista priorizada de clientes.
- Filtros por status, risco, cidade e próxima compra.
- Registro rápido de contato.
- Agendamento de follow-up.
- Visualização de metas pessoais.

### 5.3 Vendedor externo

Responsável por visitas e clientes encaminhados.

Necessidades:

- Lista de visitas encaminhadas.
- Detalhes do cliente.
- Histórico de observações.
- Atualização simples do resultado da visita.

### 5.4 Administrador interno

Responsável por usuários, permissões, importações e configurações.

Necessidades:

- Gerenciar acessos.
- Importar ou validar planilhas.
- Ajustar metas e regras.
- Consultar auditoria.

## 6. Indicadores principais

### 6.1 Indicadores de carteira

- Total de clientes.
- Clientes saudáveis.
- Clientes em atenção.
- Clientes em risco.
- Clientes inativos antigos.
- Clientes ainda não trabalhados.
- Clientes trabalhados no período.
- Clientes aguardando retorno.
- Clientes em Recompra.

### 6.2 Indicadores de reativação

- Convertidos no mês.
- Taxa de conversão sobre trabalhados.
- Valor potencial recuperado.
- Valor recuperado por vendedor.
- Conversões de inativos antigos.
- Tempo médio desde último contato.

### 6.3 Indicadores de equipe

- Contatos registrados por vendedor.
- Follow-ups pendentes por vendedor.
- Follow-ups em atraso.
- Visitas encaminhadas.
- Performance contra meta.
- Ranking por conversão e valor recuperado.

## 7. Regras de negócio

### 7.1 Classificação automática da carteira

Regra padrão:

- 0 a 59 dias sem comprar: saudável.
- 60 a 89 dias sem comprar: atenção.
- 90 a 179 dias sem comprar: risco.
- 180 dias ou mais sem comprar: inativo antigo.

Decisão vigente: seguir `docs/REGRAS_OPERACIONAIS_FENIE.md`. Cliente convertido nos últimos 30 dias tem prioridade operacional e não deve aparecer como Atenção, Risco, Inativo antigo ou Recompra.

Fallbacks:

- Se `Dias sem comprar` estiver vazio, calcular pela diferença entre a data de referência da importação e `Data do último pedido`.
- Se a data do último pedido também estiver ausente, usar `Situação` da planilha como fonte secundária.
- A classificação calculada deve ser armazenada e também reprocessável em futuras importações.

### 7.2 Status operacional do cliente

Status de trabalho:

- Não trabalhado.
- Contatado.
- Aguardando retorno.
- Convertido.
- Visita encaminhada.

Regras:

- Todo cliente importado começa como "não trabalhado" no ciclo atual, exceto se houver interação vigente no período.
- Registrar contato cria histórico permanente.
- Alterar status não deve apagar histórico anterior.
- "Convertido" deve registrar data, responsável, observação e valor recuperado ou potencial associado.
- "Visita encaminhada" deve permitir responsável externo e acompanhamento posterior.

### 7.3 Tipo de cliente na operação

Tipos:

- Loja: cliente trabalhado diretamente pelo time interno.
- Externo: cliente encaminhado para vendedor externo.
- Novo: cliente novo ou não presente na base original.
- Espontâneo: cliente que procurou a equipe sem ação ativa de reativação.

Regras:

- O tipo base pode ser inferido pelo vendedor do último pedido, mas deve ser editável no registro.
- Pedidos espontâneos devem contar em relatório, mas separados da prospecção ativa.
- Clientes novos precisam existir no banco mesmo sem origem em importação.

### 7.4 Próxima compra e follow-up

Regras:

- A coluna `Próxima compra prevista` alimenta automaticamente o calendário.
- Um vendedor pode criar follow-up manual.
- Follow-ups em atraso devem aparecer em destaque.
- Ao registrar uma nova interação, o vendedor pode definir a próxima ação.
- O histórico do follow-up concluído deve apontar para a interação registrada.

### 7.5 Metas

Regras:

- Metas podem ser mensais por equipe e por vendedor.
- O dashboard deve comparar realizado contra meta.
- Valor recuperado deve considerar clientes convertidos no período.
- A meta do MVP pode ser simples: valor mensal e número de conversões.

### 7.6 Fechamento mensal

Regras:

- O sistema deve permitir consulta histórica por mês, sem apagar dados.
- O "reset mensal" do protótipo deve virar fechamento de período.
- Ao fechar o mês, relatórios devem permanecer acessíveis.
- O novo ciclo pode iniciar com clientes sem status operacional no mês atual, mantendo histórico anterior.

## 8. Módulos principais

### 8.1 Autenticação e permissões

Funcionalidades:

- Login interno.
- Perfis de usuário.
- Papéis: administrador, supervisor, vendedor interno e vendedor externo.
- Controle de acesso por papel.
- Bloqueio e reativação de usuários.

Critérios de aceite:

- Usuário autenticado acessa apenas telas permitidas.
- Supervisor visualiza toda a carteira.
- Vendedor visualiza sua carteira ou itens atribuídos.
- Administrador gerencia usuários e importações.

### 8.2 Importação e padronização da carteira

Funcionalidades:

- Upload de planilha XLSX.
- Detecção de cabeçalho.
- Mapeamento das 16 colunas atuais.
- Validação de campos obrigatórios.
- Normalização de datas, telefone, moeda, cidade, bairro, CEP e endereço.
- Deduplicação por telefone, razão social e combinação de nome/cidade.
- Geração de log da importação.
- Preview antes de publicar.

Campos obrigatórios no MVP:

- Razão Social ou Nome fantasia.
- Telefone.
- Situação ou dados suficientes para classificação.
- Data do último pedido ou dias sem comprar.

Critérios de aceite:

- O arquivo atual deve ser importado com 1.121 registros úteis.
- A linha de cabeçalho deve ser identificada mesmo com metadados acima.
- Registros inválidos devem aparecer em tela de revisão.
- Importações anteriores devem continuar consultáveis.

### 8.3 Dashboard

Funcionalidades:

- Cards de saúde da carteira.
- Progresso da carteira trabalhada.
- Convertidos no mês.
- Valor recuperado.
- Follow-ups pendentes e em atraso.
- Performance por vendedor.
- Filtros por mês, vendedor, cidade e classificação.

Critérios de aceite:

- Supervisor vê carteira geral.
- Vendedor vê visão própria por padrão.
- Dados atualizam conforme interações registradas.
- Cada indicador deve ter caminho para lista detalhada.

### 8.4 Gestão da carteira

Funcionalidades:

- Tabela de clientes.
- Busca por nome, razão social, telefone, cidade e bairro.
- Filtros por classificação, status, vendedor, cidade, tipo de cliente e próxima compra.
- Ordenação por classificação, dias sem comprar, próxima compra e valor do último pedido.
- Paginação.
- Detalhe do cliente.
- Ação rápida para registrar contato ou encaminhar visita.

Critérios de aceite:

- O vendedor consegue filtrar clientes em risco e inativos.
- A tabela deve carregar rapidamente com pelo menos 1.121 clientes.
- Cada cliente mostra classificação, contato, dias sem comprar, próxima compra, valor, vendedor, status e tipo.

### 8.5 Histórico e registro de contatos

Funcionalidades:

- Modal ou página de registro rápido.
- Status da interação.
- Tipo de cliente.
- Canal de contato.
- Observação.
- Próxima ação ou follow-up.
- Histórico cronológico.

Critérios de aceite:

- Registrar contato leva poucos passos.
- A interação aparece no histórico do cliente.
- O status atual do cliente é recalculado a partir da interação mais recente do ciclo.
- O dashboard reflete o novo status.

### 8.6 Calendário e follow-ups

Funcionalidades:

- Calendário mensal.
- Clientes por data de próxima compra.
- Agendamentos manuais.
- Pendências em atraso.
- Lista de hoje.
- Conclusão de follow-up com registro de interação.

Critérios de aceite:

- Um cliente com próxima compra prevista aparece no calendário.
- Um follow-up manual pode ser criado para cliente existente.
- Follow-ups em atraso aparecem em destaque.
- Concluir follow-up cria ou vincula interação.

### 8.7 Relatórios e exportações

Funcionalidades:

- Exportação Excel da carteira filtrada.
- Relatório mensal.
- Performance por vendedor.
- Clientes convertidos.
- Clientes trabalhados.
- Follow-ups em atraso.
- Histórico de interações.

Critérios de aceite:

- Supervisor exporta relatório mensal.
- Vendedor exporta apenas dados permitidos.
- Relatórios históricos não mudam quando uma nova importação é feita.

### 8.8 Metas e performance

Funcionalidades:

- Meta mensal da equipe.
- Meta por vendedor.
- Realizado por valor e conversão.
- Ranking simples.
- Evolução do mês.

Critérios de aceite:

- Supervisor configura metas do mês.
- Dashboard compara realizado e meta.
- Performance por vendedor considera apenas interações válidas no período.

### 8.9 Missões e pontuação

Este módulo vem do protótipo e deve ser tratado como opcional no MVP.

Funcionalidades possíveis:

- Pontos por contato, conversão, visita ou cliente novo.
- Missões diárias, semanais e mensais.
- Marcos de premiação.
- Histórico de pontos.

Recomendação:

- Não bloquear o MVP por este módulo.
- Preparar o banco para receber pontuação, mas lançar somente se a equipe validar que isso ajuda a operação.
- Se entrar no MVP, usar visual corporativo e discreto, sem transformar a ferramenta em jogo.

## 9. Arquitetura do sistema

### 9.1 Stack proposta

Frontend:

- Next.js.
- TypeScript.
- Tailwind CSS.
- Shadcn UI.

Backend e dados:

- Supabase Auth.
- PostgreSQL.
- Supabase Storage para arquivos importados, se necessário.
- Row Level Security.

Hospedagem:

- Vercel para aplicação web.
- Supabase para banco, autenticação e storage.

### 9.2 Arquitetura lógica

Camadas:

- Interface: telas operacionais, dashboard, carteira, calendário e relatórios.
- Aplicação: regras de classificação, importação, filtros, metas e permissões.
- Banco: clientes, importações, snapshots, interações, follow-ups, usuários e metas.
- Auditoria: logs de importação, ações críticas e exportações.

### 9.3 Princípios técnicos

- Banco como fonte da verdade.
- Importações versionadas.
- Histórico nunca deve ser sobrescrito sem rastreabilidade.
- Interface orientada a produtividade.
- Regras de classificação centralizadas.
- Permissões no banco e na aplicação.
- Preparar para crescimento, sem complexidade desnecessária no MVP.

## 10. Arquitetura do banco de dados

### 10.1 Enums

`user_role`

- admin.
- supervisor.
- vendedor_interno.
- vendedor_externo.

`customer_health_status`

- saudavel.
- atencao.
- risco.
- inativo_antigo.

`source_customer_status`

- ativo.
- inativo_recente.
- inativo_antigo.
- desconhecido.

`work_status`

- nao_trabalhado.
- contatado.
- aguardando_retorno.
- convertido.
- visita_encaminhada.

`customer_type`

- loja.
- externo.
- novo.
- espontaneo.

`interaction_channel`

- whatsapp.
- telefone.
- email.
- presencial.
- outro.

`follow_up_status`

- aberto.
- concluido.
- cancelado.
- em atraso.

`import_status`

- draft.
- validated.
- published.
- failed.

### 10.2 Tabelas

#### profiles

Complementa `auth.users`.

Campos:

- id uuid, PK, referencia `auth.users.id`.
- name text.
- email text.
- role user_role.
- active boolean.
- created_at timestamptz.
- updated_at timestamptz.

#### salespeople

Representa vendedores do CRM e vínculo opcional com usuário.

Campos:

- id uuid, PK.
- crm_name text, único.
- user_id uuid, opcional, referencia profiles.
- type customer_type ou seller_type.
- active boolean.
- created_at timestamptz.
- updated_at timestamptz.

Uso:

- Mapear nomes como `Laryssa dias -03`, `Fenie PRO`, `Comercial Interno` e vendedores externos.
- Permitir atribuir carteira importada a usuário real.

#### customers

Cadastro principal do cliente.

Campos:

- id uuid, PK.
- external_key text, opcional.
- razao_social text.
- nome_fantasia text.
- display_name text.
- email text.
- primary_phone text.
- normalized_phone text.
- city text.
- state text.
- neighborhood text.
- cep text.
- address text.
- segment text.
- created_origin text.
- active boolean.
- created_at timestamptz.
- updated_at timestamptz.

Regras:

- `display_name` usa Nome fantasia, depois Razão Social, depois e-mail ou telefone.
- `normalized_phone` deve remover caracteres e manter formato comparável.
- Clientes novos criados manualmente devem ter `created_origin = manual`.

#### customer_contacts

Telefones e e-mails adicionais, útil porque a planilha pode trazer múltiplos telefones em um campo.

Campos:

- id uuid, PK.
- customer_id uuid, FK customers.
- type text.
- value text.
- normalized_value text.
- is_primary boolean.
- created_at timestamptz.

#### portfolio_imports

Registro de cada importação.

Campos:

- id uuid, PK.
- file_name text.
- file_path text.
- imported_by uuid, FK profiles.
- source_period_date date.
- header_row integer.
- total_rows integer.
- valid_rows integer.
- invalid_rows integer.
- status import_status.
- metadata jsonb.
- created_at timestamptz.
- published_at timestamptz.

#### portfolio_items

Snapshot de cada cliente em cada importação.

Campos:

- id uuid, PK.
- import_id uuid, FK portfolio_imports.
- customer_id uuid, FK customers.
- last_order_date date.
- last_order_seller_id uuid, FK salespeople.
- last_order_seller_name text.
- last_order_value numeric(12,2).
- days_since_purchase integer.
- average_purchase_cycle_days numeric(10,2).
- next_purchase_date date.
- source_status source_customer_status.
- health_status customer_health_status.
- base_customer_type customer_type.
- raw_row jsonb.
- created_at timestamptz.

Regras:

- Cada importação cria uma nova foto da carteira.
- A carteira atual deve ser obtida pela importação publicada mais recente.
- `health_status` deve ser calculado no processamento e guardado para auditoria.

#### customer_assignments

Atribuição operacional de cliente a vendedor.

Campos:

- id uuid, PK.
- customer_id uuid, FK customers.
- assigned_to uuid, FK profiles.
- assigned_by uuid, FK profiles.
- starts_at date.
- ends_at date, opcional.
- active boolean.
- reason text.
- created_at timestamptz.

Uso:

- Permitir que supervisor redistribua carteira sem depender apenas do vendedor do último pedido.

#### customer_interactions

Histórico de contatos e ações comerciais.

Campos:

- id uuid, PK.
- customer_id uuid, FK customers.
- portfolio_item_id uuid, FK portfolio_items, opcional.
- user_id uuid, FK profiles.
- work_status work_status.
- customer_type customer_type.
- channel interaction_channel.
- notes text.
- interaction_at timestamptz.
- next_follow_up_at timestamptz, opcional.
- recovered_value numeric(12,2), opcional.
- weighted_conversion numeric(5,2), default 0.
- points_awarded integer, default 0.
- created_at timestamptz.
- updated_at timestamptz.

Regras:

- Não apagar interações em operação normal.
- Correções devem gerar nova interação ou audit log.
- O status atual do cliente no período pode vir da última interação válida.

#### follow_ups

Agenda e tarefas de retorno.

Campos:

- id uuid, PK.
- customer_id uuid, FK customers.
- assigned_to uuid, FK profiles.
- created_by uuid, FK profiles.
- due_at timestamptz.
- source text.
- status follow_up_status.
- notes text.
- completed_interaction_id uuid, FK customer_interactions, opcional.
- created_at timestamptz.
- completed_at timestamptz.

Fontes:

- próxima_compra_prevista.
- manual.
- interação.
- supervisor.

#### goals

Metas mensais.

Campos:

- id uuid, PK.
- month date.
- user_id uuid, FK profiles, opcional.
- team_goal boolean.
- target_recovered_value numeric(12,2).
- target_conversions integer.
- target_contacts integer.
- created_by uuid, FK profiles.
- created_at timestamptz.
- updated_at timestamptz.

Regras:

- Uma meta de equipe por mês.
- Metas individuais opcionais no MVP.

#### point_events

Eventos de pontuação, se o módulo de missões for ativado.

Campos:

- id uuid, PK.
- user_id uuid, FK profiles.
- customer_id uuid, FK customers, opcional.
- interaction_id uuid, FK customer_interactions, opcional.
- points integer.
- weighted_conversion numeric(5,2).
- description text.
- event_at timestamptz.
- created_at timestamptz.

#### monthly_closings

Fechamento de período.

Campos:

- id uuid, PK.
- month date.
- closed_by uuid, FK profiles.
- closed_at timestamptz.
- summary jsonb.
- notes text.

#### report_exports

Auditoria de exportações.

Campos:

- id uuid, PK.
- exported_by uuid, FK profiles.
- report_type text.
- filters jsonb.
- file_path text, opcional.
- created_at timestamptz.

#### audit_logs

Ações críticas.

Campos:

- id uuid, PK.
- actor_id uuid, FK profiles.
- action text.
- entity_type text.
- entity_id uuid.
- before jsonb.
- after jsonb.
- created_at timestamptz.

### 10.3 Views recomendadas

`current_portfolio_items`

- Retorna itens da importação publicada mais recente.

`customer_current_status`

- Retorna cliente, item atual da carteira, última interação do mês e status operacional atual.

`dashboard_metrics_monthly`

- Agrega indicadores por mês, vendedor, status e classificação.

`follow_ups_open`

- Lista follow-ups abertos e em atraso.

`seller_performance_monthly`

- Agrega contatos, conversões, valor recuperado e follow-ups por vendedor.

### 10.4 Índices recomendados

Clientes:

- `customers(normalized_phone)`.
- `customers(city)`.
- `customers(display_name)`.
- índice trigram para busca em `display_name`, `razao_social` e `nome_fantasia`.

Carteira:

- `portfolio_items(import_id)`.
- `portfolio_items(customer_id)`.
- `portfolio_items(health_status)`.
- `portfolio_items(next_purchase_date)`.
- `portfolio_items(last_order_seller_id)`.
- `portfolio_items(days_since_purchase)`.

Interações:

- `customer_interactions(customer_id, interaction_at desc)`.
- `customer_interactions(user_id, interaction_at desc)`.
- `customer_interactions(work_status, interaction_at desc)`.

Follow-ups:

- `follow_ups(assigned_to, status, due_at)`.
- `follow_ups(customer_id, due_at)`.

Metas:

- `goals(month, user_id)`.

### 10.5 Segurança e RLS

Políticas:

- Admin: acesso total.
- Supervisor: leitura total da carteira, interações, metas e relatórios; escrita em metas, atribuições e importações.
- Vendedor interno: leitura dos clientes atribuídos ou associados; escrita nas próprias interações e follow-ups.
- Vendedor externo: leitura de clientes com visita encaminhada ou atribuição; escrita limitada ao resultado da visita.

Dados sensíveis:

- Telefone, e-mail, endereço e histórico comercial são dados internos.
- Toda exportação deve gerar log.
- Usuários inativos não acessam o sistema.

## 11. Fluxos de usuário

### 11.1 Login

1. Usuário acessa a aplicação.
2. Informa e-mail e senha.
3. Sistema valida autenticação no Supabase.
4. Sistema carrega perfil e permissões.
5. Usuário é direcionado para dashboard adequado ao papel.

### 11.2 Importar carteira

1. Supervisor ou admin abre Importações.
2. Seleciona arquivo XLSX.
3. Sistema detecta cabeçalho e mostra preview.
4. Sistema valida colunas obrigatórias.
5. Sistema normaliza dados.
6. Sistema classifica clientes automaticamente.
7. Sistema mostra resumo: válidos, inválidos, novos, atualizados e possíveis duplicados.
8. Supervisor publica importação.
9. Dashboard e carteira passam a usar a nova importação como atual.

### 11.3 Trabalhar carteira

1. Vendedor entra na tela Carteira.
2. Filtra por risco, inativo antigo, cidade, vendedor ou próxima compra.
3. Abre cliente ou usa ação rápida.
4. Contata cliente por telefone ou WhatsApp.
5. Registra status, tipo, canal e observação.
6. Opcionalmente agenda follow-up.
7. Sistema atualiza dashboard, histórico e relatórios.

### 11.4 Converter cliente

1. Vendedor abre cliente.
2. Seleciona status "convertido".
3. Confirma tipo de cliente.
4. Informa observação e valor recuperado, se aplicável.
5. Sistema registra interação.
6. Cliente entra na lista de convertidos do mês.
7. Valor recuperado entra nos indicadores.

### 11.5 Encaminhar visita

1. Vendedor interno identifica cliente que precisa de visita.
2. Seleciona "visita encaminhada".
3. Escolhe vendedor externo, se aplicável.
4. Sistema cria follow-up ou tarefa para externo.
5. Externo registra resultado.
6. Supervisor acompanha pendências.

### 11.6 Agenda diária

1. Vendedor abre Calendário ou Minha Agenda.
2. Vê clientes com próxima compra prevista e follow-ups manuais.
3. Abre cliente direto da agenda.
4. Registra ação.
5. Follow-up é concluído ou reagendado.

### 11.7 Fechamento mensal

1. Supervisor abre Relatórios.
2. Seleciona mês.
3. Revisa contatos, conversões, valor recuperado, metas e performance.
4. Exporta Excel ou salva relatório.
5. Fecha o mês.
6. Sistema preserva histórico e inicia novo ciclo operacional.

## 12. Telas principais

### 12.1 Login

Elementos:

- E-mail.
- Senha.
- Recuperar senha.
- Mensagens de erro simples.

### 12.2 Dashboard

Elementos:

- Menu lateral.
- Filtros por mês e vendedor.
- Cards de carteira.
- Evolução de vendido ou recuperado no mês.
- Progresso contra meta.
- Carteira por classificação.
- Performance por vendedor.
- Alertas de follow-up em atraso.

Referência visual:

- Seguir clareza da imagem Mercos: fundo claro, cards brancos, linhas finas, tabelas limpas, acentos discretos.

### 12.3 Carteira

Elementos:

- Busca rápida.
- Filtros.
- Tabela paginada.
- Badges de classificação.
- Status operacional.
- Ações rápidas.
- Link de WhatsApp.

### 12.4 Detalhe do cliente

Elementos:

- Dados cadastrais.
- Último pedido.
- Dias sem comprar.
- Próxima compra prevista.
- Vendedor do último pedido.
- Classificação.
- Histórico de interações.
- Follow-ups.
- Botões de ação.

### 12.5 Registrar contato

Elementos:

- Status.
- Tipo de cliente.
- Canal.
- Observação.
- Valor recuperado.
- Próximo follow-up.
- Salvar.

### 12.6 Calendário

Elementos:

- Calendário mensal.
- Lista do dia.
- Próximas compras previstas.
- Follow-ups manuais.
- Pendências em atraso.
- Ação para registrar contato.

### 12.7 Relatórios

Elementos:

- Filtros por período, vendedor, cidade, classificação e status.
- Resumo executivo.
- Tabela detalhada.
- Exportar Excel.

### 12.8 Configurações

Elementos:

- Usuários.
- Papéis.
- Mapeamento de vendedores do CRM.
- Metas.
- Regras de classificação.
- Importações.

## 13. Roadmap do MVP

### Fase 0 - Produto e arquitetura

Duração sugerida: 2 a 4 dias.

Entregas:

- PRD completo.
- Modelo de dados.
- Fluxos de usuário.
- Definição de escopo MVP.
- Decisão visual baseada em Mercos.

Critério de pronto:

- Documento aprovado para iniciar implementação.

### Fase 1 - Fundação técnica

Duração sugerida: 3 a 5 dias.

Entregas:

- Projeto Next.js configurado.
- Supabase conectado.
- Autenticação.
- Perfis e papéis.
- Layout base com menu lateral.
- Componentes principais de tabela, filtros, cards e formulários.

Critério de pronto:

- Usuário consegue logar e ver área interna conforme perfil.

### Fase 2 - Importação e carteira

Duração sugerida: 5 a 7 dias.

Entregas:

- Importação XLSX.
- Mapeamento da planilha atual.
- Normalização dos clientes.
- Classificação automática.
- Tela de carteira.
- Busca, filtros, ordenação e paginação.

Critério de pronto:

- A planilha atual é importada e a carteira fica navegável no sistema.

### Fase 3 - Interações e follow-ups

Duração sugerida: 5 a 7 dias.

Entregas:

- Registro de contato.
- Histórico do cliente.
- Status operacional.
- Follow-up manual.
- Calendário ou lista de agenda.
- Link de WhatsApp.

Critério de pronto:

- Vendedor consegue trabalhar clientes e registrar o ciclo completo.

### Fase 4 - Dashboard e metas

Duração sugerida: 4 a 6 dias.

Entregas:

- Dashboard geral.
- Dashboard por vendedor.
- Métricas de carteira.
- Métricas de conversão.
- Metas mensais simples.
- Valor recuperado.

Critério de pronto:

- Supervisor acompanha operação e performance do mês.

### Fase 5 - Relatórios e fechamento mensal

Duração sugerida: 3 a 5 dias.

Entregas:

- Exportação Excel.
- Relatório mensal.
- Fechamento de período.
- Auditoria básica de exportação.

Critério de pronto:

- Supervisor fecha mês sem depender da planilha manual do protótipo.

### Fase 6 - Ajustes de usabilidade e homologação

Duração sugerida: 3 a 5 dias.

Entregas:

- Teste com usuários internos.
- Ajustes de filtros e nomenclatura.
- Correções de importação.
- Melhorias visuais.
- Checklist de segurança.

Critério de pronto:

- Equipe consegue usar o sistema em rotina real por uma semana piloto.

## 14. Escopo recomendado do MVP

### Deve entrar

- Login interno.
- Perfis e permissões.
- Importação da carteira atual.
- Classificação automática.
- Dashboard principal.
- Tela de carteira.
- Filtros e busca.
- Registro de contato.
- Status operacional.
- Histórico por cliente.
- Follow-up manual.
- Calendário ou agenda.
- Relatório e exportação Excel.
- Metas mensais simples.

### Pode entrar se couber

- Ranking por vendedor.
- Pontuação discreta.
- Missões simples.
- Fechamento mensal com snapshot detalhado.
- Atribuição manual de carteira.

### Deve ficar para depois

- WhatsApp integrado com envio automático.
- Notificações automáticas.
- IA de previsão de recompra.
- Curva ABC avançada.
- Análise por produto.
- App mobile nativo.
- Multiempresa.

## 15. Riscos e decisões pendentes

### 15.1 Ambiguidade da classificação

Resolvido: a classificação vigente usa Atenção de 60 a 89 dias, Risco de 90 a 179 dias e Inativo antigo a partir de 180 dias. A regra completa está em `docs/REGRAS_OPERACIONAIS_FENIE.md`.

### 15.2 Vendedor do CRM versus usuário do sistema

O campo `Vendedor do último pedido` não é necessariamente o usuário responsável no sistema. Será necessário mapear vendedor do CRM para usuário interno.

### 15.3 Qualidade de cadastro

Muitos clientes não têm nome fantasia, CEP, cidade ou e-mail. O sistema deve trabalhar bem com razão social e telefone como dados principais.

### 15.4 Histórico de importações

Se a planilha for atualizada com frequência, cada importação precisa ser versionada para não destruir histórico.

### 15.5 Pontuação e prêmios

O protótipo traz gamificação forte. Antes de implementar, validar se a equipe realmente quer esse comportamento no MVP.

## 16. Critérios de sucesso do MVP

O MVP será considerado bem-sucedido quando:

- A carteira atual for importada sem tratamento manual adicional.
- A equipe conseguir filtrar prioridades rapidamente.
- Vendedores registrarem contatos e follow-ups no sistema.
- Supervisor visualizar trabalhados, convertidos, inativos e metas.
- Relatório mensal for exportado pelo sistema.
- A operação deixar de depender do HTML local e de controles manuais paralelos.

## 17. Ordem recomendada de implementação

1. Banco de dados e autenticação.
2. Layout claro estilo Mercos.
3. Importação da planilha.
4. Carteira com filtros.
5. Registro de contato e histórico.
6. Follow-ups e calendário.
7. Dashboard.
8. Relatórios.
9. Metas.
10. Pontuação, se validada.
