# Piloto interno

## Objetivo

Validar o sistema com uma equipe reduzida da Fenie antes de liberar para toda a operacao interna.

## Escopo do piloto

Duracao sugerida:

- 5 a 10 dias uteis.

Equipe sugerida:

- 1 admin.
- 1 supervisor.
- 2 a 4 operadores internos.

Dados:

- Usar uma carteira real controlada.
- Evitar importar bases parciais sem identificacao clara.
- Manter a planilha original salva para comparacao.

## O que testar

### Login e acesso

- Admin acessa rotas administrativas.
- Supervisor acessa operacao e importacoes.
- Operador interno acessa carteira, agenda, calendario, relatorios e cliente.
- Vendedores externos nao possuem login.

### Carteira

- Busca por nome, telefone, cidade e bairro.
- Filtros por vendedor, cidade, status e classificacao.
- Filtros rapidos.
- Ordenacao.
- Paginacao.
- Abertura do detalhe do cliente.

### Registro de contato

- Registrar contato rapido.
- Status: Contatado.
- Status: Aguardando retorno.
- Status: Convertido com valor recuperado.
- Status: Visita encaminhada.
- Criar follow-up.
- Validar toast de pontos.
- Confirmar persistencia no retorno a tela.

### Agenda

- Ver Recompra.
- Ver tarefas de hoje.
- Reagendar follow-up.
- Concluir follow-up.
- Abrir cliente pela agenda.

### Dashboard e relatorios

- Conferir total de clientes.
- Conferir clientes em risco e inativos.
- Conferir trabalhados no periodo.
- Conferir convertidos.
- Conferir performance por vendedor.
- Conferir visitas encaminhadas.

### Calendario

- Visualizar follow-ups.
- Visualizar proximas compras.
- Visualizar visitas.
- Reagendar evento aplicavel.

### Importacoes

- Importar planilha modelo.
- Importar planilha real.
- Validar colunas reconhecidas.
- Validar linhas invalidas.
- Publicar somente com admin/supervisor.

## Coleta de feedback

Registrar feedback em uma planilha ou quadro simples com:

- Data.
- Usuario.
- Tela.
- O que tentou fazer.
- O que aconteceu.
- Impacto: baixo, medio ou alto.
- Sugestao.
- Status: aberto, em analise, corrigido ou descartado.

Categorias:

- Erro tecnico.
- Dificuldade de uso.
- Dado incorreto.
- Lentidao.
- Permissao.
- Melhoria operacional.

## Metricas do piloto

Acompanhar diariamente:

- Usuarios que conseguiram logar.
- Clientes trabalhados.
- Contatos registrados.
- Follow-ups criados.
- Follow-ups concluidos.
- Conversoes registradas.
- Valor recuperado.
- Erros de importacao.
- Erros de permissao.
- Relatos de lentidao.

## Criterios de aprovacao

O piloto e aprovado quando:

- Todos os perfis internos conseguem logar.
- A carteira real carrega de forma consistente.
- Registro de contato persiste no Supabase.
- Follow-ups aparecem na agenda.
- Dashboard e relatorios batem com uma amostra conferida manualmente.
- Nenhum vendedor externo possui acesso/login.
- Nao ha erro critico aberto.
- A equipe piloto entende o fluxo diario.

## Criterios de reprovacao ou pausa

Pausar expansao se:

- Login falha para parte relevante da equipe.
- Dados de carteira aparecem incorretos ou duplicados em massa.
- Registro de contato nao persiste.
- Importacao publica carteira errada.
- Operador interno nao consegue acessar carteira completa.
- Algum vendedor externo consegue logar.
- Tempo de carregamento prejudica rotina diaria.

## Rotina diaria do piloto

Inicio do dia:

1. Supervisor confere Dashboard.
2. Operadores abrem Minha agenda.
3. Operadores trabalham prioridades da Carteira.

Durante o dia:

1. Registrar contato sempre que houver acao comercial.
2. Criar follow-up quando houver retorno.
3. Marcar conversao com valor recuperado quando aplicavel.

Fim do dia:

1. Supervisor revisa Relatorios.
2. Equipe registra feedback.
3. Responsavel tecnico revisa logs de Vercel e Supabase.

## Responsabilidades

Admin:

- Criar usuarios.
- Validar importacoes.
- Resolver acessos.

Supervisor:

- Acompanhar rotina.
- Validar indicadores.
- Consolidar feedback.

Operador interno:

- Trabalhar carteira.
- Registrar contatos.
- Informar erros e dificuldades.

Responsavel tecnico:

- Monitorar logs.
- Corrigir falhas.
- Apoiar rollback se necessario.

## Saida do piloto

Ao final, registrar:

- Data de inicio e fim.
- Participantes.
- Volume de clientes trabalhados.
- Principais erros.
- Correcoes feitas.
- Pendencias.
- Decisao: aprovar go-live, ampliar piloto ou pausar.
