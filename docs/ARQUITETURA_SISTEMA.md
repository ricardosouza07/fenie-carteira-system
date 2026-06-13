# Arquitetura do Sistema - Central de Carteira Fenié PRO

## 1. Decisão arquitetural

A Central de Carteira Fenié PRO deve ser uma aplicação web interna, com frontend e backend concentrados em um app Next.js, usando Supabase como fonte de autenticação, banco PostgreSQL, storage e segurança por RLS.

A proposta mantém a estrutura atual do repositório:

- `frontend`: aplicação Next.js.
- `backend`: Supabase, migrações, seeds, políticas e documentação técnica de banco.
- `docs`: decisões de produto, PRD e arquitetura.
- `base`: arquivos de referência da carteira.
- `prototype`: protótipos legados para consulta, sem virar base técnica final.

Princípio central: o banco será a fonte da verdade. A planilha é entrada de dados, não sistema operacional. O protótipo atual serve como referência de fluxo, não como arquitetura.

## 2. Estrutura de pastas recomendada

```text
fenie-carteira-system/
  docs/
    PRD_COMPLETO.md
    ARQUITETURA_SISTEMA.md
    DECISOES_TECNICAS.md
    GUIA_IMPORTACAO_PLANILHA.md

  base/
    Carteira_Padronizada_Fenié (1).xlsx

  prototype/
    fenié_reativacao_v2.html

  frontend/
    package.json
    next.config.ts
    tsconfig.json
    tailwind.config.ts
    postcss.config.mjs
    components.json
    .env.example

    public/
      logo/
      images/

    src/
      app/
        layout.tsx
        page.tsx
        globals.css

        (auth)/
          login/
            page.tsx
          forgot-password/
            page.tsx

        (app)/
          layout.tsx
          dashboard/
            page.tsx
          carteira/
            page.tsx
          clientes/
            [id]/
              page.tsx
          calendario/
            page.tsx
          importacoes/
            page.tsx
            [id]/
              page.tsx
          relatorios/
            page.tsx
          metas/
            page.tsx
          configuracoes/
            usuarios/
              page.tsx
            vendedores/
              page.tsx
            regras/
              page.tsx

        api/
          imports/
            route.ts
          exports/
            route.ts

      components/
        ui/
        layout/
          app-sidebar.tsx
          app-header.tsx
          page-shell.tsx
        shared/
          data-table.tsx
          empty-state.tsx
          status-badge.tsx
          metric-card.tsx
          filter-bar.tsx

      features/
        auth/
        dashboard/
        carteira/
        clientes/
        importacoes/
        interacoes/
        follow-ups/
        calendario/
        metas/
        relatorios/
        configuracoes/

      lib/
        supabase/
          client.ts
          server.ts
          middleware.ts
          types.ts
        auth/
          permissions.ts
        dates.ts
        formatting.ts
        errors.ts

      server/
        actions/
          interactions.ts
          follow-ups.ts
          goals.ts
          assignments.ts
        queries/
          dashboard.ts
          portfolio.ts
          customers.ts
          reports.ts
        services/
          import-parser.ts
          import-validator.ts
          import-publisher.ts
          classification.ts
          export-report.ts
        schemas/
          import.ts
          interaction.ts
          customer.ts
          goal.ts

      types/
        database.ts
        domain.ts

  backend/
    supabase/
      config.toml
      migrations/
      seed.sql
      policies/
        rls.md
      functions/
        README.md

    db/
      schema.md
      relationships.md
      indexes.md

  scripts/
    README.md
```

Observações:

- Usar App Router, com rotas protegidas em `(app)` e rotas públicas em `(auth)`.
- Manter regras de negócio em `frontend/src/server/services`, não espalhadas nos componentes.
- Usar `api/imports` e `api/exports` apenas para operações de arquivo. Mutações simples podem usar Server Actions.
- Não migrar o HTML do protótipo para dentro do app. Ele deve ser referência funcional.

## 3. Stack final recomendada

### 3.1 Frontend

- Next.js com App Router.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Radix UI, via shadcn.
- lucide-react para ícones.
- TanStack Table para tabelas da carteira, relatórios e importação.
- React Hook Form + Zod para formulários e validação.
- Recharts para gráficos simples do dashboard.
- date-fns para datas e calendário.

### 3.2 Backend

- Supabase Auth para login interno.
- Supabase PostgreSQL como banco principal.
- Supabase Row Level Security para permissões.
- Supabase Storage para guardar planilhas importadas e exportações, se necessário.
- Next.js Route Handlers para upload, importação e exportação de arquivos.
- Server Actions para mutações operacionais simples.

### 3.3 Dados e importação

- PostgreSQL com views para dashboard e carteira atual.
- ExcelJS para leitura de XLSX no servidor.
- Zod para validação dos dados normalizados.
- Tipos TypeScript gerados a partir do Supabase.

### 3.4 Deploy e operação

- Vercel para frontend e funções Next.js.
- Supabase Cloud para Auth, Postgres e Storage.
- Variáveis de ambiente separadas por ambiente: local, preview e produção.

### 3.5 Diretriz visual

- Visual claro, corporativo e produtivo inspirado no Mercos.
- Menu lateral esquerdo.
- Cards discretos.
- Tabelas limpas.
- Cores de status bem objetivas: saudável, atenção, risco, inativo, convertido.
- Evitar visual escuro/luxuoso do protótipo.

## 4. Tabelas do banco de dados

### 4.1 Tabelas do MVP

#### profiles

Perfil interno ligado ao `auth.users`.

Campos principais:

- `id`: uuid, PK, FK para `auth.users.id`.
- `name`: text.
- `email`: text.
- `role`: enum `user_role`.
- `active`: boolean.
- `created_at`: timestamptz.
- `updated_at`: timestamptz.

#### salespeople

Cadastro de vendedores vindos do CRM ou criados internamente.

Campos principais:

- `id`: uuid, PK.
- `name`: text.
- `crm_name`: text.
- `user_id`: uuid, FK opcional para `profiles.id`.
- `seller_type`: enum ou text: interno, externo, loja, sistema.
- `active`: boolean.
- `created_at`: timestamptz.
- `updated_at`: timestamptz.

#### salesperson_aliases

Mapeia variações de nomes vindos da planilha.

Campos principais:

- `id`: uuid, PK.
- `salesperson_id`: uuid, FK para `salespeople.id`.
- `alias`: text.
- `source`: text, exemplo: planilha, manual.
- `created_at`: timestamptz.

#### customers

Cadastro único de clientes.

Campos principais:

- `id`: uuid, PK.
- `razao_social`: text.
- `nome_fantasia`: text.
- `display_name`: text.
- `email`: text.
- `primary_phone`: text.
- `normalized_phone`: text.
- `city`: text.
- `state`: text.
- `neighborhood`: text.
- `cep`: text.
- `address`: text.
- `segment`: text.
- `created_origin`: text, exemplo: importacao, manual.
- `active`: boolean.
- `created_at`: timestamptz.
- `updated_at`: timestamptz.

#### customer_contacts

Contatos adicionais do cliente.

Campos principais:

- `id`: uuid, PK.
- `customer_id`: uuid, FK para `customers.id`.
- `type`: text, exemplo: phone, email, whatsapp.
- `value`: text.
- `normalized_value`: text.
- `is_primary`: boolean.
- `created_at`: timestamptz.

#### portfolio_imports

Controle de cada importação de carteira.

Campos principais:

- `id`: uuid, PK.
- `file_name`: text.
- `file_path`: text.
- `imported_by`: uuid, FK para `profiles.id`.
- `source_period_date`: date.
- `header_row`: integer.
- `total_rows`: integer.
- `valid_rows`: integer.
- `invalid_rows`: integer.
- `status`: enum `import_status`.
- `metadata`: jsonb.
- `created_at`: timestamptz.
- `validated_at`: timestamptz.
- `published_at`: timestamptz.

#### portfolio_import_rows

Linhas brutas ou normalizadas da importação, usadas para preview, erros e auditoria.

Campos principais:

- `id`: uuid, PK.
- `import_id`: uuid, FK para `portfolio_imports.id`.
- `row_number`: integer.
- `raw_data`: jsonb.
- `normalized_data`: jsonb.
- `validation_errors`: jsonb.
- `customer_id`: uuid, FK opcional para `customers.id`.
- `status`: text, exemplo: valid, invalid, duplicate, ignored.
- `created_at`: timestamptz.

#### portfolio_items

Foto do cliente dentro de uma importação publicada.

Campos principais:

- `id`: uuid, PK.
- `import_id`: uuid, FK para `portfolio_imports.id`.
- `customer_id`: uuid, FK para `customers.id`.
- `last_order_date`: date.
- `last_order_seller_id`: uuid, FK opcional para `salespeople.id`.
- `last_order_seller_name`: text.
- `last_order_value`: numeric(12,2).
- `days_since_purchase`: integer.
- `average_purchase_cycle_days`: numeric(10,2).
- `next_purchase_date`: date.
- `source_status`: enum `source_customer_status`.
- `health_status`: enum `customer_health_status`.
- `base_customer_type`: enum `customer_type`.
- `raw_row`: jsonb.
- `created_at`: timestamptz.

#### customer_assignments

Atribuição operacional de clientes a usuários.

Campos principais:

- `id`: uuid, PK.
- `customer_id`: uuid, FK para `customers.id`.
- `assigned_to`: uuid, FK para `profiles.id`.
- `assigned_by`: uuid, FK para `profiles.id`.
- `starts_at`: date.
- `ends_at`: date.
- `active`: boolean.
- `reason`: text.
- `created_at`: timestamptz.

#### customer_interactions

Histórico de contatos, conversões e visitas.

Campos principais:

- `id`: uuid, PK.
- `customer_id`: uuid, FK para `customers.id`.
- `portfolio_item_id`: uuid, FK opcional para `portfolio_items.id`.
- `user_id`: uuid, FK para `profiles.id`.
- `work_status`: enum `work_status`.
- `customer_type`: enum `customer_type`.
- `channel`: enum `interaction_channel`.
- `notes`: text.
- `interaction_at`: timestamptz.
- `next_follow_up_at`: timestamptz.
- `recovered_value`: numeric(12,2).
- `created_at`: timestamptz.
- `updated_at`: timestamptz.

#### follow_ups

Agenda de retornos e próximas ações.

Campos principais:

- `id`: uuid, PK.
- `customer_id`: uuid, FK para `customers.id`.
- `assigned_to`: uuid, FK para `profiles.id`.
- `created_by`: uuid, FK para `profiles.id`.
- `due_at`: timestamptz.
- `source`: text, exemplo: proxima_compra, manual, interacao.
- `status`: enum `follow_up_status`.
- `notes`: text.
- `completed_interaction_id`: uuid, FK opcional para `customer_interactions.id`.
- `created_at`: timestamptz.
- `completed_at`: timestamptz.

#### goals

Metas mensais da equipe e dos vendedores.

Campos principais:

- `id`: uuid, PK.
- `month`: date.
- `user_id`: uuid, FK opcional para `profiles.id`.
- `team_goal`: boolean.
- `target_recovered_value`: numeric(12,2).
- `target_conversions`: integer.
- `target_contacts`: integer.
- `created_by`: uuid, FK para `profiles.id`.
- `created_at`: timestamptz.
- `updated_at`: timestamptz.

#### monthly_closings

Fechamento mensal.

Campos principais:

- `id`: uuid, PK.
- `month`: date.
- `closed_by`: uuid, FK para `profiles.id`.
- `closed_at`: timestamptz.
- `summary`: jsonb.
- `notes`: text.

#### report_exports

Auditoria de exportações.

Campos principais:

- `id`: uuid, PK.
- `exported_by`: uuid, FK para `profiles.id`.
- `report_type`: text.
- `filters`: jsonb.
- `file_path`: text.
- `created_at`: timestamptz.

#### audit_logs

Log de ações críticas.

Campos principais:

- `id`: uuid, PK.
- `actor_id`: uuid, FK para `profiles.id`.
- `action`: text.
- `entity_type`: text.
- `entity_id`: uuid.
- `before`: jsonb.
- `after`: jsonb.
- `created_at`: timestamptz.

#### app_settings

Configurações editáveis do sistema.

Campos principais:

- `key`: text, PK.
- `value`: jsonb.
- `updated_by`: uuid, FK para `profiles.id`.
- `updated_at`: timestamptz.

Usos:

- Faixas de classificação.
- Lista de vendedores considerados loja/interno.
- Configurações de importação.
- Preferências de relatório.

### 4.2 Tabelas para depois do MVP

#### point_events

Somente se a pontuação/missões for validada.

#### missions

Configuração de missões diárias, semanais e mensais.

#### notifications

Alertas internos, e-mail ou WhatsApp no futuro.

#### products e customer_product_stats

Somente se o sistema evoluir para análise por produto, categoria ou curva ABC.

## 5. Relacionamentos entre tabelas

### 5.1 Relacionamentos principais

- `auth.users` 1:1 `profiles`.
- `profiles` 1:N `portfolio_imports`, pelo campo `imported_by`.
- `profiles` 1:N `customer_interactions`, pelo campo `user_id`.
- `profiles` 1:N `follow_ups`, pelos campos `assigned_to` e `created_by`.
- `profiles` 1:N `goals`, quando a meta for individual.
- `profiles` 1:N `customer_assignments`, como responsável ou atribuidor.

### 5.2 Carteira e clientes

- `customers` 1:N `customer_contacts`.
- `customers` 1:N `portfolio_items`.
- `portfolio_imports` 1:N `portfolio_items`.
- `portfolio_imports` 1:N `portfolio_import_rows`.
- `portfolio_items` N:1 `customers`.
- `portfolio_items` N:1 `salespeople`, via vendedor do último pedido.

### 5.3 Vendedores

- `salespeople` 1:N `salesperson_aliases`.
- `salespeople` N:1 `profiles`, quando um vendedor do CRM tiver usuário no sistema.
- `salespeople` 1:N `portfolio_items`, como vendedor do último pedido.

### 5.4 Operação comercial

- `customers` 1:N `customer_interactions`.
- `portfolio_items` 1:N `customer_interactions`, opcional, quando a interação nasce da carteira atual.
- `customers` 1:N `follow_ups`.
- `customer_interactions` 1:0..1 `follow_ups`, quando uma interação conclui um follow-up.
- `customers` 1:N `customer_assignments`.

### 5.5 Relatórios e auditoria

- `profiles` 1:N `report_exports`.
- `profiles` 1:N `monthly_closings`.
- `profiles` 1:N `audit_logs`.

## 6. Views e consultas recomendadas

### current_portfolio_items

Retorna os itens da última importação publicada.

Uso:

- Tela Carteira.
- Dashboard.
- Calendário de próxima compra.

### customer_current_status

Une cliente, item atual da carteira, atribuição ativa e última interação do mês.

Uso:

- Status operacional atual.
- Contagem de não trabalhados.
- Filtros de convertido, aguardando retorno e visita.

### dashboard_metrics_monthly

Agrega por mês:

- Total de clientes.
- Carteira por classificação.
- Clientes trabalhados.
- Convertidos.
- Valor recuperado.
- Follow-ups pendentes e vencidos.

### seller_performance_monthly

Agrega por vendedor:

- Contatos.
- Conversões.
- Valor recuperado.
- Visitas encaminhadas.
- Follow-ups vencidos.

### open_follow_ups

Lista follow-ups abertos, com marcação de vencidos.

## 7. Fluxo de importação da planilha

### 7.1 Entrada

1. Admin ou supervisor acessa Importações.
2. Faz upload do XLSX.
3. Sistema cria registro em `portfolio_imports` com status `draft`.
4. Arquivo pode ser salvo no Supabase Storage para auditoria.

### 7.2 Leitura

1. Backend lê a primeira aba da planilha.
2. Procura a linha de cabeçalho entre as primeiras linhas.
3. Cabeçalho esperado:
   - Razão Social.
   - Nome fantasia.
   - E-mail.
   - Telefone.
   - Cidade.
   - Estado.
   - Data do último pedido.
   - Vendedor do último pedido.
   - Valor do último pedido.
   - Dias sem comprar.
   - Ciclo médio de compra.
   - Próxima compra prevista.
   - Situação.
   - Bairro.
   - CEP.
   - Endereço.
4. Sistema ignora linhas de filtro/metadados acima do cabeçalho.

### 7.3 Normalização

1. Normalizar telefone para busca e deduplicação.
2. Separar múltiplos telefones em `customer_contacts`.
3. Normalizar valores monetários para `numeric`.
4. Normalizar datas em `date`.
5. Normalizar cidade, bairro e estado.
6. Extrair data de referência da importação, quando existir no cabeçalho/metadados da planilha.

### 7.4 Validação

1. Validar se existe Razão Social ou Nome fantasia.
2. Validar se existe Telefone.
3. Validar se existe Situação ou dados suficientes para calcular classificação.
4. Validar datas e valores.
5. Salvar cada linha em `portfolio_import_rows` com status e erros.

### 7.5 Deduplicação

Ordem recomendada:

1. Telefone normalizado.
2. Razão social normalizada.
3. Nome fantasia + cidade.
4. E-mail, quando existir.

Resultado possível:

- Cliente novo.
- Cliente existente atualizado.
- Possível duplicado para revisão.
- Linha inválida.

### 7.6 Classificação

Regra:

- 0 a 30 dias: saudável.
- 31 a 60 dias: atenção.
- 61 a 89 dias: risco.
- 90 dias ou mais: inativo antigo.

Fallback:

- Se `Dias sem comprar` estiver vazio, calcular usando `source_period_date - last_order_date`.
- Se não houver data suficiente, usar `Situação` da planilha.

### 7.7 Publicação

1. Usuário revisa preview da importação.
2. Sistema cria ou atualiza `customers`.
3. Sistema cria ou vincula `salespeople`.
4. Sistema cria `portfolio_items`.
5. Sistema muda `portfolio_imports.status` para `published`.
6. Views passam a considerar essa importação como carteira atual.
7. Dashboard e calendário são atualizados.

Importante:

- Importações antigas não devem ser apagadas.
- Publicar nova importação não deve apagar interações anteriores.
- O ciclo operacional mensal deve ser definido por datas e não por reset destrutivo.

## 8. Fluxo de uso da equipe

### 8.1 Admin

1. Cria usuários.
2. Define papéis.
3. Configura vendedores e aliases.
4. Ajusta regras gerais.
5. Dá suporte a importações.

### 8.2 Supervisor comercial

1. Importa a carteira.
2. Revisa erros e duplicados.
3. Publica a carteira.
4. Configura metas do mês.
5. Acompanha dashboard geral.
6. Filtra vendedores, cidades e status.
7. Redistribui clientes se necessário.
8. Acompanha follow-ups vencidos.
9. Exporta relatório mensal.
10. Fecha o mês.

### 8.3 Vendedor interno

1. Acessa Minha Carteira ou Carteira.
2. Filtra clientes em risco, inativos ou com próxima compra.
3. Abre cliente.
4. Contata por telefone ou WhatsApp.
5. Registra status, canal, tipo e observação.
6. Agenda follow-up, se necessário.
7. Converte cliente quando houver venda.
8. Acompanha agenda diária.

### 8.4 Vendedor externo

1. Acessa visitas encaminhadas ou carteira atribuída.
2. Consulta dados do cliente e histórico.
3. Realiza visita.
4. Registra resultado.
5. Agenda nova ação ou marca como convertido, quando permitido.

## 9. Permissões por tipo de usuário

### 9.1 Admin

Pode:

- Gerenciar usuários.
- Gerenciar papéis.
- Gerenciar configurações.
- Importar e publicar carteiras.
- Ver toda a carteira.
- Editar qualquer interação, quando houver fluxo de correção.
- Exportar relatórios.
- Ver auditoria.

### 9.2 Supervisor comercial

Pode:

- Ver toda a carteira.
- Importar carteira.
- Validar e publicar importação.
- Mapear vendedores.
- Criar e ajustar metas.
- Atribuir clientes.
- Ver performance por vendedor.
- Criar follow-ups para a equipe.
- Exportar relatórios.
- Fechar mês.

Não deve:

- Alterar papéis de admin.
- Excluir histórico sem auditoria.

### 9.3 Vendedor interno

Pode:

- Ver clientes atribuídos a ele ou liberados para a equipe interna.
- Registrar interações próprias.
- Criar follow-ups próprios.
- Marcar cliente como contatado, aguardando retorno ou convertido.
- Encaminhar visita.
- Exportar apenas dados permitidos, se o MVP liberar exportação para vendedor.

Não deve:

- Publicar importação.
- Ver relatórios completos de todos os vendedores, salvo liberação explícita.
- Alterar metas gerais.
- Gerenciar usuários.

### 9.4 Vendedor externo

Pode:

- Ver clientes atribuídos a ele ou com visita encaminhada.
- Registrar resultado de visita.
- Criar observação e follow-up de visita.
- Consultar histórico necessário do cliente.

Não deve:

- Ver carteira completa.
- Importar planilhas.
- Exportar base completa.
- Alterar metas gerais.
- Gerenciar usuários.

### 9.5 Usuário inativo

Não pode acessar nenhuma área interna.

## 10. Riscos técnicos

### 10.1 Variação da planilha

A planilha atual tem cabeçalho na linha 9 e metadados acima. Futuras exportações podem mudar nomes, ordem ou formato das colunas.

Mitigação:

- Criar mapeamento flexível de colunas.
- Mostrar preview antes de publicar.
- Salvar linhas inválidas com erro claro.

### 10.2 Datas e números em formato brasileiro

Datas e valores podem chegar como texto, número ou formato misto.

Mitigação:

- Centralizar parser de datas e moeda.
- Validar amostras antes de publicar.
- Guardar dado bruto em `raw_row`.

### 10.3 Deduplicação imperfeita

Clientes podem aparecer com nome diferente, telefone múltiplo ou cidade ausente.

Mitigação:

- Deduplicação por camadas.
- Tela de revisão de possíveis duplicados.
- `customer_contacts` para múltiplos telefones.

### 10.4 Mapeamento de vendedores

`Vendedor do último pedido` não é necessariamente o responsável atual.

Mitigação:

- Criar `salespeople` e `salesperson_aliases`.
- Permitir atribuição manual de carteira.
- Não depender apenas do nome da planilha para permissão.

### 10.5 RLS complexo

Permissões por papel e por carteira atribuída podem gerar políticas difíceis de manter.

Mitigação:

- Começar com políticas simples.
- Criar views de acesso.
- Testar RLS por papel antes da homologação.

### 10.6 Performance de dashboard

Métricas agregadas podem ficar lentas com histórico acumulado.

Mitigação:

- Índices por data, vendedor, status e importação.
- Views específicas de dashboard.
- Paginação obrigatória nas tabelas.

### 10.7 Importação em ambiente serverless

Arquivos grandes podem bater limite de tempo/memória em funções.

Mitigação:

- MVP suporta a escala atual da carteira.
- Para bases maiores, mover importação para job assíncrono ou Supabase Edge Function.
- Salvar progresso e erros por importação.

### 10.8 Dados sensíveis e exportações

Telefone, endereço, e-mail e histórico comercial exigem cuidado.

Mitigação:

- RLS.
- Log de exportação.
- Perfis mínimos.
- Storage privado.

### 10.9 Timezone

Follow-ups, metas e fechamento mensal precisam respeitar America/Sao_Paulo.

Mitigação:

- Guardar timestamps em UTC.
- Exibir e calcular períodos no timezone da operação.
- Padronizar fechamento mensal por data local.

### 10.10 Escopo visual

O protótipo tem visual forte, escuro e gamificado, mas a direção final é Mercos.

Mitigação:

- Criar design system claro desde o início.
- Reaproveitar fluxos, não CSS.
- Validar telas com usuários antes de avançar em módulos extras.

## 11. O que deve entrar no MVP

Entrar no MVP:

- Login interno.
- Perfis: admin, supervisor, vendedor interno, vendedor externo.
- Layout claro com menu lateral.
- Importação da planilha XLSX atual.
- Preview e validação da importação.
- Cadastro de clientes a partir da importação.
- Classificação automática.
- Mapeamento básico de vendedores.
- Tela de carteira com filtros, busca, ordenação e paginação.
- Detalhe do cliente.
- Registro de contato.
- Status operacional.
- Histórico de interações.
- Follow-up manual.
- Calendário ou agenda de follow-ups.
- Próxima compra prevista vinda da planilha.
- Dashboard com indicadores essenciais.
- Metas mensais simples.
- Relatório mensal.
- Exportação Excel.
- Auditoria básica de importação e exportação.
- RLS básico por papel.

## 12. O que deve ficar fora do MVP

Ficar fora do MVP:

- WhatsApp automático ou integração oficial com WhatsApp Business.
- Envio automático de mensagens.
- Notificações automáticas por e-mail, SMS ou WhatsApp.
- IA para previsão de recompra ou risco.
- Gamificação completa com prêmios e missões complexas.
- App mobile nativo.
- Multiempresa.
- Marketplace.
- Integração bidirecional com CRM.
- Curva ABC avançada.
- Análise por produto ou categoria.
- Comissões.
- Permissões extremamente granulares.
- Workflow de aprovação complexo.
- BI avançado.

## 13. Sequência técnica recomendada

1. Criar projeto Next.js em `frontend`.
2. Configurar Supabase em `backend/supabase`.
3. Criar schema inicial, enums, tabelas e RLS.
4. Implementar autenticação e layout interno.
5. Implementar importação com preview.
6. Publicar carteira atual no banco.
7. Criar tela Carteira.
8. Criar detalhe do cliente e interações.
9. Criar follow-ups e calendário.
10. Criar dashboard.
11. Criar relatórios e exportação.
12. Homologar com a equipe.

## 14. Decisões finais

- Arquitetura: Next.js + Supabase.
- Banco: PostgreSQL com RLS.
- Origem inicial de dados: planilha XLSX versionada por importação.
- Persistência: Supabase, nunca `localStorage`.
- UI: clara, corporativa e orientada a produtividade.
- MVP: operação de carteira, reativação, follow-up, dashboard e relatórios.
- Futuro: automações, IA, WhatsApp, gamificação e BI avançado.

