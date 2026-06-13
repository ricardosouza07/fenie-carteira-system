# Supabase Producao

> Para migrar os dados atuais com remapeamento de usuarios e validacao de
> contagens, siga `docs\MIGRACAO_SAAS_INTERNO.md`.

## Objetivo

Criar e configurar o Supabase remoto que sera usado pelo sistema interno da Fenie em producao.

## Criacao do projeto

1. Acesse Supabase.
2. Crie um novo projeto para producao.
3. Escolha uma organizacao controlada pela Fenie.
4. Defina um nome claro, por exemplo `fenie-carteira-prod`.
5. Salve a senha do banco em local seguro.

## Regiao recomendada

Escolha uma regiao proxima do Brasil e da operacao da equipe. Se houver regiao Sao Paulo disponivel no plano contratado, priorize-a. Caso contrario, use a regiao com menor latencia para a equipe interna.

Evite trocar regiao depois do go-live, pois isso normalmente exige recriar ou migrar o projeto.

## Chaves e variaveis

No painel do Supabase, colete:

- Project URL.
- Anon/public key.
- Service role key.

Configure na Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

Regras:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` pode ser usada pelo browser.
- `SUPABASE_SERVICE_ROLE_KEY` e segredo server-side e nao deve aparecer em logs, prints, docs publicas ou codigo.
- Rotacione a `service_role` se ela for exposta acidentalmente.

## Aplicar migrations

Do computador de administracao ou CI seguro:

```bash
cd backend/supabase
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

Antes de aplicar em producao, valide localmente:

```bash
cd backend/supabase
supabase db reset
```

Migrations esperadas:

- `202605260001_init_schema.sql`
- `202605260002_interaction_operational_fields.sql`
- `202605310001_fine_grained_rls.sql`
- `202605310002_add_operador_interno_role.sql`
- `202605310003_internal_only_permissions.sql`

## Aplicar seed

O seed local cria usuarios ficticios. Em producao, nao rode o seed completo sem revisar.

Recomendacao para producao:

1. Aplicar somente migrations.
2. Criar usuarios reais pelo Supabase Auth.
3. Inserir profiles reais em `public.profiles`.
4. Criar a campanha de performance inicial manualmente ou por script revisado.
5. Criar vendedores comerciais em `salespeople`, incluindo vendedores externos sem login.

Se decidir usar seed em producao, remova emails e senhas ficticias antes.

## Configurar Auth

No painel Supabase:

- Ativar e-mail/senha.
- Desativar cadastro publico se nao houver necessidade.
- Site URL: dominio de producao da Vercel.
- Redirect URLs: dominio de producao e previews autorizados.
- Confirmar que e-mail confirmation esta adequado ao processo interno.

O app bloqueia login quando nao existe profile ativo em `public.profiles`.

## Criar usuarios reais

Perfis reais:

- `admin`
- `supervisor`
- `operador_interno`

Exemplo de profile:

```sql
insert into public.profiles (
  id,
  salesperson_id,
  full_name,
  email,
  role,
  active
) values (
  '<auth-user-id>',
  null,
  'Nome do Usuario',
  'usuario@fenie.com.br',
  'operador_interno',
  true
);
```

Para supervisor, `salesperson_id` pode ficar nulo ou apontar para um cadastro interno de equipe.

## Vendedores comerciais

Vendedores externos devem ser cadastrados em `salespeople`, nao em Auth:

```sql
insert into public.salespeople (
  name,
  email,
  role,
  active
) values (
  'Nome do Vendedor Externo',
  'vendedor@fenie.com.br',
  'vendedor_externo',
  true
);
```

Eles serao usados em carteira, visitas e relatorios, mas nao terao login.

## Validar RLS

Antes do go-live:

1. Logar como admin e confirmar acesso completo.
2. Logar como supervisor e confirmar acesso operacional.
3. Logar como operador interno e confirmar acesso a toda a carteira.
4. Confirmar que usuario sem profile ativo nao entra.
5. Confirmar que um vendedor externo nao possui usuario Auth ativo.
6. Confirmar que `public.is_internal_system_user()` retorna verdadeiro apenas para perfis internos.

Consulta util:

```sql
select role, count(*)
from public.profiles
where active = true
group by role
order by role;
```

## Importacao inicial de carteira

1. Fazer backup/exportacao de qualquer base existente.
2. Entrar no sistema como admin ou supervisor.
3. Acessar Importacoes.
4. Baixar planilha modelo.
5. Importar planilha real.
6. Validar colunas, invalidos e duplicados.
7. Publicar.
8. Confirmar que Carteira, Dashboard, Agenda, Relatorios e Calendario refletem a publicacao.

## Backup minimo

Antes da primeira importacao real:

- Exportar a planilha original.
- Guardar o arquivo publicado.
- Registrar data/hora e usuario responsavel.

Backup do banco:

- Usar backups automáticos do Supabase, se disponiveis no plano.
- Manter rotina manual antes de mudancas grandes, como importacao mensal.
- Para dump manual, usar `pg_dump` com a connection string do projeto, em ambiente seguro.

## Rollback minimo

Rollback de app:

- Usar rollback/promote na Vercel.

Rollback de dados:

- Se a importacao publicada estiver incorreta, manter a planilha anterior e republicar uma importacao corrigida.
- Em casos graves, restaurar backup do Supabase.
- Antes de restaurar banco, avisar a equipe e parar operacoes no app.

## Checklist de seguranca

- `SUPABASE_SERVICE_ROLE_KEY` configurada somente na Vercel e nunca exposta no browser.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` aponta para o projeto correto.
- RLS ativo nas tabelas publicas.
- Usuarios externos sem Auth ativo.
- Profiles ativos apenas para equipe interna.
- Auth Site URL e Redirect URLs apontando para dominio correto.
- Importacoes restritas a admin/supervisor.
