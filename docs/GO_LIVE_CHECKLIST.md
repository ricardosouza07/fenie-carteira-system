# Go-live checklist

## Objetivo

Checklist para colocar o sistema interno da Fenie em producao com controle minimo de seguranca, estabilidade, backup e rollback.

## 1. Ambiente

- [ ] Projeto Supabase remoto criado.
- [ ] Projeto Vercel criado.
- [ ] Dominio interno definido.
- [ ] DNS configurado.
- [ ] HTTPS ativo.
- [ ] Supabase Auth Site URL aponta para o dominio de producao.
- [ ] Redirect URLs do Supabase revisadas.
- [ ] Preview deployments apontam para ambiente seguro ou estao bloqueados para operacao real.

## 2. Variaveis de producao

Na Vercel:

- [ ] `NEXT_PUBLIC_APP_NAME`.
- [ ] `NEXT_PUBLIC_APP_ENV=production`.
- [ ] `NEXT_PUBLIC_SUPABASE_URL`.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] `SUPABASE_SERVICE_ROLE_KEY`.

Validacoes:

- [ ] Chaves de producao nao sao iguais as locais.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` nao aparece no browser.
- [ ] `.env.local` e `.env.production.local` nao foram commitados.
- [ ] `.env.production.example` nao contem segredos reais.

## 3. Banco e RLS

- [ ] Migrations aplicadas no Supabase remoto.
- [ ] RLS ativo nas tabelas publicas.
- [ ] `public.is_internal_system_user()` validada.
- [ ] `public.can_access_customer()` validada.
- [ ] Profiles ativos apenas para equipe interna.
- [ ] Vendedores externos cadastrados somente em `salespeople`.
- [ ] Usuario externo sem Auth ativo.
- [ ] Importacoes restritas a admin/supervisor.

## 4. Usuarios iniciais

Criar no Supabase Auth:

- [ ] Admin principal.
- [ ] Supervisor comercial.
- [ ] Operadores internos do piloto.

Inserir em `public.profiles`:

- [ ] `admin`.
- [ ] `supervisor`.
- [ ] `operador_interno`.

Validar:

- [ ] Admin loga.
- [ ] Supervisor loga.
- [ ] Operador interno loga.
- [ ] Usuario sem profile ativo nao loga.

## 5. Importacao inicial

- [ ] Planilha real revisada.
- [ ] Backup da planilha original salvo.
- [ ] Colunas obrigatorias presentes.
- [ ] Upload realizado.
- [ ] Colunas reconhecidas conferidas.
- [ ] Linhas invalidas analisadas.
- [ ] Duplicados revisados.
- [ ] Preview conferido.
- [ ] Publicacao realizada por admin/supervisor.

Depois da publicacao:

- [ ] Carteira mostra clientes reais.
- [ ] Filtro por vendedor funciona.
- [ ] Filtro por cidade funciona.
- [ ] Filtro por status funciona.
- [ ] Filtro por classificacao funciona.
- [ ] Cliente detalhe abre.
- [ ] Registrar contato persiste.

## 6. Segurança

- [ ] `service_role` restrita a Server Actions administrativas.
- [ ] `anon key` usada somente como chave publica.
- [ ] RLS revisado apos migrations.
- [ ] Middleware/proxy revisado.
- [ ] Rotas administrativas bloqueadas para operador interno.
- [ ] Vendedores externos sem acesso ao login.
- [ ] Senhas temporarias trocadas no primeiro uso, se aplicavel.
- [ ] Acesso ao painel Supabase limitado a administradores.
- [ ] Acesso ao projeto Vercel limitado a administradores.

## 7. Backup minimo

Antes do go-live:

- [ ] Exportar planilha de carteira original.
- [ ] Salvar planilha importada.
- [ ] Salvar evidencias da validacao da importacao.
- [ ] Confirmar backup automatico do Supabase ou rotina manual.

Antes de importacoes grandes:

- [ ] Salvar planilha anterior.
- [ ] Registrar responsavel.
- [ ] Registrar data/hora.
- [ ] Fazer backup/dump quando houver risco operacional.

## 8. Rollback minimo

Aplicacao:

- [ ] Ultimo deployment estavel identificado na Vercel.
- [ ] Responsavel por rollback definido.
- [ ] Procedimento de rollback na Vercel testado ou conhecido.

Dados:

- [ ] Planilha anterior disponivel para republicacao.
- [ ] Restauracao de backup Supabase definida para caso grave.
- [ ] Criterio para pausar operacao definido.

## 9. Monitoramento

Durante os primeiros dias, acompanhar:

- [ ] Erros de login.
- [ ] Usuario sem profile.
- [ ] Erros de importacao.
- [ ] Colunas nao reconhecidas.
- [ ] Falhas de persistencia ao registrar contato.
- [ ] Erros de permissao/RLS.
- [ ] Queries lentas no Supabase.
- [ ] Queda no carregamento da Carteira.
- [ ] Dashboard sem dados apos publicacao.
- [ ] Uso indevido de fallback local/mock em producao.

Fontes:

- Logs da Vercel.
- Logs do Supabase.
- Feedback da equipe piloto.
- Tabela de importacoes.

## 10. Criterios de go-live

O sistema pode entrar em producao quando:

- [ ] Login real funciona para todos os perfis internos.
- [ ] Sidebar e rotas respeitam permissoes.
- [ ] Carteira real carregando do Supabase.
- [ ] Registro de contato persiste no banco.
- [ ] Importacao real testada com sucesso.
- [ ] Admin/supervisor conseguem operar importacoes.
- [ ] Operador interno consegue trabalhar a carteira.
- [ ] Backup minimo definido.
- [ ] Responsavel de suporte definido.

## 11. Criterios de parada

Pausar o go-live se ocorrer:

- Login indisponivel para mais de um perfil.
- Carteira real nao carrega.
- Registro de contato nao persiste.
- Importacao publica dados errados em massa.
- RLS bloqueia equipe interna indevidamente.
- `service_role` exposta.
- Dados reais aparecem em ambiente errado.
