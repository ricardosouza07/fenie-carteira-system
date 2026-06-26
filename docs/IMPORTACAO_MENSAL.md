# Importacao mensal da carteira Mercos

## Objetivo

A importacao mensal substitui a carteira operacional atual pela ultima planilha publicada do Mercos, sem apagar o historico interno do CRM.

Na pratica:

- A planilha nova atualiza dados comerciais vindos do Mercos.
- O cliente existente continua sendo o mesmo registro no banco sempre que houver cruzamento seguro.
- Interacoes, follow-ups, pontos, conversoes e dados financeiros permanecem vinculados ao cliente.
- A tela Carteira mostra somente clientes da ultima importacao publicada.
- Clientes que nao vierem na ultima planilha deixam de aparecer na Carteira, mas continuam no banco como historico.

## Cruzamento de clientes

Ao publicar uma planilha, cada linha valida e cruzada com clientes ja existentes nesta ordem:

1. Telefone normalizado em `customer_contacts.value_normalized` ou `customers.phone_normalized`.
2. CNPJ/CPF em `customers.document_normalized`.
3. Razao social normalizada em `customers.legal_name_normalized`.
4. Nome fantasia normalizado + cidade normalizada em `customers.trade_name_normalized` e `customers.city_normalized`.

Se nenhuma chave encontrar um cliente existente, o sistema cria um novo cliente.

## Dados comerciais atualizados

Quando o cliente ja existe, a importacao pode atualizar os campos comerciais abaixo:

- Razao social e nome fantasia.
- CNPJ/CPF, inscricao estadual, e-mail e telefones comerciais.
- Cidade, estado, bairro, CEP e endereco.
- Vendedor do ultimo pedido.
- Numero do ultimo pedido.
- Data do ultimo pedido.
- Valor do ultimo pedido.
- Dias sem comprar.
- Ciclo medio de compra.
- Proxima compra prevista.
- Situacao original da planilha Mercos.
- Data de cadastro, origem, acesso B2B, segmento, tags e proxima tarefa.

Esses dados representam a fotografia mais recente do Mercos.

## Dados internos preservados

A importacao mensal nunca deve sobrescrever:

- `customer_interactions`
- `follow_ups`
- `point_events`
- conversoes registradas
- `customers.work_status`
- `customers.last_action_label`
- `customers.last_action_at`
- `customers.financial_status`
- `customers.financial_note`
- historico de clientes e importacoes anteriores

Para clientes existentes, o novo `portfolio_item` da carteira herda o `work_status` preservado do cliente. Assim, um cliente convertido ou aguardando retorno continua com o status operacional correto depois da nova importacao.

## Carteira atual

Na publicacao:

1. O sistema cria um registro em `portfolio_imports`.
2. Processa as linhas validas e cruza/cria clientes.
3. Salva `portfolio_import_rows` com o `customer_id` identificado para auditoria.
4. Encerra os itens atuais anteriores com `portfolio_items.is_current = false`.
5. Cria novos `portfolio_items` somente para os clientes da planilha publicada.
6. Marca a importacao como `publicada`.

A Carteira consulta a ultima `portfolio_imports.status = 'publicada'` e carrega apenas `portfolio_items` dessa importacao com `is_current = true`.

## Clientes ausentes na nova planilha

Clientes que estavam em uma importacao anterior, mas nao vieram na nova planilha:

- nao aparecem na Carteira atual;
- continuam em `customers`;
- mantem contatos, interacoes, follow-ups, pontos e dados financeiros;
- podem voltar para a Carteira se aparecerem em uma importacao futura.

## Fallback local

Quando o Supabase nao estiver configurado, o fallback em `localStorage` tambem preserva:

- status operacional;
- ultima acao;
- interacoes locais;
- situacao financeira;
- observacao financeira.

O fallback local substitui a lista publicada pela ultima importacao local, simulando a mesma regra da carteira mensal.

## Validacao funcional recomendada

1. Importar e publicar a planilha A.
2. Abrir um cliente importado e registrar contato/conversao.
3. Importar e publicar a planilha B contendo o mesmo cliente com dados comerciais atualizados.
4. Confirmar que o cliente foi cruzado, e nao duplicado.
5. Confirmar que ultimo pedido, vendedor, dias sem comprar e proxima compra foram atualizados.
6. Confirmar que interacoes, follow-ups, pontos, status operacional e situacao financeira foram preservados.
7. Confirmar que um cliente ausente na planilha B nao aparece na Carteira atual.
8. Confirmar que esse cliente ausente ainda existe no banco para historico.

## Arquivos principais

- `frontend/src/features/importacoes/parser.ts`
- `frontend/src/features/importacoes/supabase-service.ts`
- `frontend/src/features/importacoes/storage.ts`
- `frontend/src/features/carteira/supabase-service.ts`
- `backend/supabase/migrations/202606250002_mercos_original_import_fields.sql`

## Validacao tecnica

Rodar no diretorio `frontend`:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```
