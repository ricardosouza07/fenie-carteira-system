# Importação direta da planilha original do Mercos

## Objetivo

Permitir que a equipe importe diretamente a planilha **Carteira detalhada de clientes** baixada do Mercos, em `.xls` ou `.xlsx`, sem padronização manual prévia.

## Arquivo validado

Arquivo de referência local:

`C:\Users\123va\Downloads\Carteira detalhada de clientes (4).xls`

Resultado da validação do parser:

- Aba lida: `Relatório`
- Cabeçalho detectado: linha 6
- Linhas lidas: 1120
- Linhas válidas: 1120
- Linhas inválidas: 0
- Clientes únicos estimados: 1111
- Possíveis duplicidades: 18
- Colunas reconhecidas: 26
- Colunas ignoradas: 0

## Detecção de cabeçalho

O importador ignora linhas iniciais do Mercos como:

- `Carteira detalhada de clientes`
- `Filtros`
- `Segmento`
- `Período`
- `Situações`

Depois procura automaticamente a linha com maior pontuação de colunas comerciais reconhecidas, como `Razão Social`, `Nome fantasia`, `CNPJ/CPF`, `Telefone`, `Cidade` e `Data do último pedido`.

## Colunas Mercos reconhecidas

| Mercos | Campo interno |
| --- | --- |
| Razão Social | `razaoSocial` |
| Nome fantasia | `nomeFantasia` |
| CNPJ/CPF | `documento` |
| Inscrição Estadual | `inscricaoEstadual` |
| E-mail | `email` |
| Telefone | `telefone` |
| Cidade | `cidade` |
| Estado | `estado` |
| Último pedido | `ultimoPedidoNumero` |
| Data do último pedido | `ultimoPedido` |
| Vendedor do último pedido | `vendedor` |
| Valor do último pedido | `valorUltimoPedido` |
| Dias sem comprar | `diasSemComprar` |
| Ciclo médio de compra | `cicloMedioCompraDias` |
| Próxima compra prevista | `proximaCompra` |
| Situação | `situacao` / `mercos_situation` |
| Data de cadastro | `dataCadastro` |
| Origem do cadastro | `origemCadastro` |
| Bairro | `bairro` |
| CEP | `cep` |
| Endereço | `endereco` |
| Acesso B2B | `acessoB2B` |
| Segmento | `segmento` |
| Tags de cliente | `tagsCliente` |
| Próxima tarefa | `proximaTarefa` |
| Data da tarefa | `dataTarefa` |

## Normalizações aplicadas

- Telefones: remove caracteres não numéricos, remove prefixo `55` quando aplicável e reconhece múltiplos telefones separados por vírgula, ponto e vírgula, barra ou pipe.
- CNPJ/CPF: mantém valor original e grava versão somente com dígitos.
- Datas: aceita datas do Excel, ISO e formato brasileiro.
- Valores monetários: converte texto com `R$`, separadores brasileiros e números nativos da planilha.
- Cidade, razão social, nome fantasia e vendedor: gera versões normalizadas para cruzamento e busca.
- Estado: padroniza em caixa alta.

## Cruzamento de clientes

Ao publicar no Supabase, clientes existentes são procurados nesta ordem:

1. Telefone normalizado em `customer_contacts.value_normalized` ou `customers.phone_normalized`
2. CNPJ/CPF em `customers.document_normalized`
3. Razão social normalizada em `customers.legal_name_normalized`
4. Nome fantasia normalizado + cidade normalizada

## Dados preservados entre importações

A publicação mensal atualiza dados comerciais vindos do Mercos, mas não apaga:

- Interações
- Follow-ups
- Pontos
- Conversões registradas
- Situação financeira
- Observação financeira

Em clientes existentes, o importador não sobrescreve `financial_status`, `financial_note`, interações, follow-ups ou eventos de pontos.

## Tabelas usadas

- `portfolio_imports`
- `portfolio_import_rows`
- `customers`
- `customer_contacts`
- `salespeople`
- `salesperson_aliases`
- `portfolio_items`

## Migrations necessárias

Aplicar as migrations novas antes de publicar a planilha Mercos no Supabase:

- `backend/supabase/migrations/202606250001_customer_financial_status.sql`
- `backend/supabase/migrations/202606250002_mercos_original_import_fields.sql`

## Limitações atuais

- O importador lê somente a primeira aba.
- Deduplicação avançada ainda não mescla registros manualmente no preview.
- Telefones adicionais são salvos como contatos normalizados, mas a Carteira exibe o telefone principal.
- A exportação Excel dos relatórios continua mockada.

## Checklist de QA

1. Enviar `.xls` original do Mercos em `/importacoes`.
2. Conferir cabeçalho detectado e colunas reconhecidas.
3. Conferir linhas lidas, válidas, clientes únicos e duplicados.
4. Conferir preview de clientes.
5. Publicar importação.
6. Abrir `/carteira` e confirmar base atualizada.
7. Abrir detalhe de um cliente e conferir documento, número do pedido, tags e dados comerciais.
8. Confirmar que interação/follow-up/pontos/situação financeira permanecem após nova importação.
