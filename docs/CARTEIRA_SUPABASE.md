# Carteira conectada ao Supabase

## Objetivo

A tela `/carteira` passa a tentar carregar a carteira operacional a partir da última importação publicada no Supabase. O `localStorage` e os dados mockados continuam como fallback temporário para manter o MVP utilizável quando o banco não estiver configurado ou ainda não houver importação publicada.

## Tabelas usadas

- `portfolio_imports`: identifica a última importação com `status = 'publicada'`.
- `portfolio_items`: lista os clientes da carteira da importação atual, com classificação, status de trabalho, datas e vínculo com vendedor.
- `customers`: dados comerciais do cliente.
- `customer_contacts`: telefone principal, WhatsApp ou outros contatos do cliente.
- `salespeople`: nome do vendedor vinculado ao item da carteira.
- `customer_interactions`: última interação do mês, usada para status atual e última ação.
- `follow_ups`: follow-up aberto mais próximo, usado como contexto de ação quando não há interação recente.

## Query principal

O serviço `loadCarteiraFromSupabase` faz o fluxo em etapas:

1. Busca a última linha de `portfolio_imports` publicada, ordenando por `published_at` e `created_at`.
2. Busca os `portfolio_items` dessa importação com `is_current = true`.
3. Coleta os IDs de clientes e vendedores vinculados.
4. Busca `customers`, `customer_contacts`, `salespeople`, interações do mês e follow-ups abertos.
5. Normaliza o resultado para o mesmo formato já usado pela tela `CarteiraClient`.

Com isso, filtros, ordenação, paginação, quick filters, ações por linha e drawer de contato continuam usando a estrutura existente.

## Fallback

A ordem de carregamento é:

1. Supabase configurado e com importação publicada: usa dados reais do banco.
2. Supabase não configurado: mantém base publicada em `localStorage`.
3. Supabase configurado sem importação publicada: mantém base publicada em `localStorage`.
4. Sem base publicada local: usa dados mockados do MVP.

A tela mostra um aviso discreto para os estados:

- carregando carteira publicada;
- carteira carregada do Supabase;
- Supabase não configurado;
- nenhuma importação publicada;
- erro ao carregar o banco.

## Detalhe do cliente

A rota `/clientes/[id]` ja consulta o Supabase quando ha sessao autenticada e usa o snapshot local apenas como fallback temporario.

## Limitações atuais

- Registrar contato salva no Supabase quando ha sessao autenticada e cliente real; o modo local segue como fallback.
- Dashboard, Agenda, Relatorios e Calendario ja possuem leitura real com fallback mock/local.
- A resolução de contato principal é simples e prioriza `customers.phone_primary`, depois contatos do tipo telefone ou WhatsApp.

## Próximos passos

- Evoluir atualizacoes operacionais para RPCs transacionais com validacao de colunas.
- Trocar os fallbacks locais por estados vazios controlados quando o MVP exigir operacao somente autenticada.
