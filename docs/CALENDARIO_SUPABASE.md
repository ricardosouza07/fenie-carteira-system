# Calendario conectado ao Supabase

## Objetivo

A rota `/calendario` passou a carregar eventos reais do Supabase quando a
configuracao estiver disponivel. O fallback local/mock continua ativo para
desenvolvimento, demos e ambientes sem `.env.local`.

## Tabelas usadas

- `portfolio_imports`: identifica a ultima importacao publicada.
- `portfolio_items`: define a carteira atual e as proximas compras previstas.
- `customers`: dados cadastrais e status comercial do cliente.
- `customer_contacts`: telefone principal exibido no evento.
- `salespeople`: vendedor/responsavel exibido no calendario.
- `customer_interactions`: visitas encaminhadas, conversoes e status recentes.
- `follow_ups`: follow-ups abertos, vencidos e concluidos.

## Query principal

O servico `loadCalendarioFromSupabase` faz:

1. Busca a ultima `portfolio_imports` com `status = publicada`.
2. Carrega os `portfolio_items` atuais dessa importacao.
3. Busca clientes, contatos, vendedores, interacoes e follow-ups vinculados.
4. Normaliza os clientes para o tipo `CarteiraClient`.
5. Monta eventos de calendario com:
   - follow-ups abertos, vencidos e concluidos;
   - proximas compras previstas;
   - visitas encaminhadas;
   - conversoes;
   - clientes aguardando retorno sem follow-up aberto.

## Estrutura do evento

Cada evento normalizado contem:

- cliente;
- telefone;
- cidade/bairro;
- vendedor/responsavel;
- tipo do evento;
- status do evento;
- data;
- classificacao do cliente;
- link para `/clientes/[id]`.

## Acoes reais

- **Ver cliente**: navega para `/clientes/[id]`.
- **Registrar contato**: abre o `InteractionDrawer` e usa o fluxo real ja
  conectado em `customer_interactions`, `follow_ups` e `point_events`.
- **Reagendar**: quando o evento tem `followUpId`, atualiza `follow_ups.due_at`
  e recalcula o status como `aberto` ou `vencido`.
- **Concluir**: quando aplicavel, atualiza `follow_ups.status = concluido` e
  preenche `completed_at`.

## Filtros

A interface mantem filtros por:

- vendedor;
- status comercial ou status do follow-up;
- tipo do evento;
- visao mensal ou semanal.

## Fallback

Se o Supabase nao estiver configurado, se nao houver importacao publicada ou se
ocorrer erro na consulta, a tela usa:

1. carteira publicada em `localStorage`, quando existir;
2. dados mockados atuais como ultima alternativa.

As acoes continuam funcionando localmente e exibem aviso de modo local/mock.

## Limitacoes atuais

- Autenticacao real ainda nao esta conectada.
- Notificacoes automaticas ainda nao foram implementadas.
- Reagendamento real cobre follow-ups; proximas compras da carteira continuam
  derivadas da importacao publicada.
- O calendario ainda nao faz assinatura realtime.

## Proximos passos

- Conectar permissoes reais por usuario autenticado.
- Opcionalmente criar eventos manuais independentes de follow-up.
- Adicionar notificacoes e lembretes automaticos.
- Implementar realtime ou refresh controlado apos mutacoes criticas.
