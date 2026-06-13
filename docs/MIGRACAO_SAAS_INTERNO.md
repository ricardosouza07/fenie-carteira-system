# Migracao para SaaS Interno Online

## Objetivo

Migrar a Central de Carteira Fenie do PC servidor local para uma arquitetura
online centralizada:

- frontend Next.js na Vercel;
- banco PostgreSQL e Auth no Supabase remoto;
- login individual para a equipe interna;
- acesso por HTTPS de qualquer local autorizado;
- dados centralizados;
- backup e rollback definidos.

Este plano nao altera regras de negocio, telas, permissoes ou estrutura
funcional. A mudanca e de infraestrutura e operacao.

## Arquitetura final

```text
Usuarios internos
       |
       | HTTPS
       v
Vercel / Next.js
       |
       | HTTPS + JWT Supabase
       v
Supabase remoto
  - Auth
  - PostgreSQL
  - RLS
  - API
  - backups
```

O PC servidor local deixa de ser necessario para a operacao diaria. Ele deve
ser mantido temporariamente como origem de dados e rollback controlado ate a
aprovacao definitiva do SaaS.

## Principios de seguranca

1. Nao migrar senhas ficticias do ambiente local.
2. Criar usuarios reais no Supabase remoto.
3. Nao executar `backend/supabase/seed.sql` diretamente em producao.
4. Aplicar schema somente por migrations.
5. Migrar dados publicos com remapeamento dos UUIDs de profiles.
6. Nunca commitar connection strings, senhas ou service role.
7. Nao apontar Preview Deployments para o banco de producao.
8. Fazer checkpoint antes de cada etapa irreversivel.
9. Manter o servidor local congelado ate o aceite final.

## Por que o seed local nao vai para producao

O arquivo:

```text
backend\supabase\seed.sql
```

e exclusivo do desenvolvimento local. Ele cria:

- usuarios ficticios;
- senhas conhecidas;
- e-mails `.local`;
- UUIDs fixos de teste.

No SaaS, o bootstrap seguro de producao sera:

1. migrations;
2. criacao de usuarios reais;
3. criacao dos profiles reais;
4. importacao dos dados atuais;
5. campanha, vendedores e configuracoes vindos da base local.

Portanto, para esta migracao, o pacote de dados substitui o seed operacional.
O seed local continua sendo usado apenas em desenvolvimento e QA isolado.

## Ferramentas preparadas

| Comando | Funcao |
| --- | --- |
| `npm run saas:export` | Exporta dados locais e contagens. |
| `npm run saas:migrations -- -ProjectRef <ref>` | Vincula o projeto e aplica migrations. |
| `npm run saas:users -- -UsersFile <arquivo>` | Cria usuarios e profiles reais. |
| `npm run saas:import -- -PackageDirectory <pasta> -UserMapFile <mapa>` | Remapeia UUIDs e importa dados. |
| `npm run saas:backup-remote` | Cria backup logico do Supabase remoto. |
| `npm run saas:validate -- ...` | Compara contagens, login e endpoints. |

Arquivos:

```text
tools\saas\apply-remote-migrations.ps1
tools\saas\backup-remote-saas.ps1
tools\saas\create-remote-users.ps1
tools\saas\export-local-saas.ps1
tools\saas\import-remote-saas.ps1
tools\saas\validate-saas.ps1
tools\saas\remote-users.example.json
```

Os pacotes e relatórios ficam em `backups\` e nao devem ser enviados ao Git.

## Fase 0: preparacao

### Contas e responsabilidades

Defina:

- proprietario da organizacao Supabase;
- segundo proprietario de contingencia;
- proprietario do time Vercel;
- responsavel pelo dominio e DNS;
- responsavel pela migracao;
- responsavel pelo aceite funcional;
- janela de indisponibilidade.

Ative MFA nas contas administrativas de Supabase, Vercel, GitHub e provedor de
DNS.

### Repositorio

Use repositorio Git privado da Fenie.

Antes do deploy:

```powershell
npm run typecheck
npm run lint
npm run build
```

Confirme que nao existem no Git:

- `.env.local`;
- backups SQL;
- planilhas reais;
- service role;
- connection strings;
- arquivos `*.local.json`.

## Fase 1: criar o Supabase remoto

1. Acesse o Dashboard do Supabase.
2. Crie uma organizacao controlada pela Fenie.
3. Adicione pelo menos dois proprietarios.
4. Crie o projeto `fenie-carteira-prod`.
5. Escolha a regiao mais proxima da operacao.
6. Defina e armazene a senha do banco em cofre de senhas.
7. Registre:
   - project ref;
   - Project URL;
   - anon/publishable key;
   - service role/secret key;
   - connection string Session pooler;
   - senha do banco.

Use a connection string exibida em **Connect**. A documentacao atual do
Supabase recomenda o Session pooler como opcao padrao quando a conexao direta
IPv6 nao for adequada.

Nao coloque esses valores em documentos ou commits.

## Fase 2: seguranca inicial do Supabase

Antes de inserir dados:

- habilite SSL Enforcement;
- avalie Network Restrictions para conexoes administrativas;
- ative MFA na organizacao;
- limite membros do projeto;
- confirme que RLS sera aplicada pelas migrations;
- desative cadastro publico se a equipe nao cria contas sozinha;
- configure e-mail/senha;
- configure SMTP proprio antes de usar convites ou recuperacao de senha;
- defina Site URL provisoria com a URL de producao da Vercel;
- depois troque para o dominio definitivo;
- permita somente redirects conhecidos.

Sugestao inicial:

```text
Site URL:
https://carteira.fenie.com.br

Redirect URLs:
https://carteira.fenie.com.br/**
http://localhost:3000/**
```

Nao autorize wildcard geral de Preview contra o banco de producao.

## Fase 3: aplicar migrations

### Validacao local

Em um computador de desenvolvimento:

```powershell
npm run supabase:reset
npm run typecheck
npm run lint
npm run build
```

### Login da CLI

```powershell
cd C:\Projetos\fenie-carteira-system\backend\supabase
supabase login
```

### Aplicacao automatizada

Na raiz:

```powershell
npm run saas:migrations -- -ProjectRef <PROJECT-REF>
```

O script:

- solicita a senha do banco;
- executa `supabase link`;
- executa `supabase db push --include-all`;
- lista migrations locais e remotas.

Migrations esperadas:

```text
202605260001_init_schema.sql
202605260002_interaction_operational_fields.sql
202605310001_fine_grained_rls.sql
202605310002_add_operador_interno_role.sql
202605310003_internal_only_permissions.sql
```

Regra: depois do go-live, nunca altere migrations aplicadas. Toda mudanca deve
ser uma nova migration.

## Fase 4: exportar a base local

### Antes da janela final

Execute uma exportacao de ensaio:

```powershell
cd C:\Projetos\fenie-carteira-system
npm run saas:export
```

O pacote sera criado em:

```text
backups\saas-migration\fenie-saas-YYYYMMDD-HHMMSS
```

Conteudo:

```text
manifest.json
local-profiles.json
public-data.sql
```

O dump:

- inclui dados do schema `public`;
- exclui `public.profiles`;
- exclui Auth e senhas;
- preserva clientes, carteira, importacoes e historico;
- registra contagens e SHA256.

Guarde esse pacote em armazenamento corporativo seguro.

### Congelamento final

Na janela de migracao:

1. avise a equipe;
2. interrompa novas interacoes e importacoes;
3. execute:

```text
STOP_FENIE.bat
```

4. inicie somente Supabase, se necessario:

```powershell
npm run supabase:start
```

5. gere o backup local tradicional:

```powershell
npm run backup:local
```

6. gere o pacote SaaS final:

```powershell
npm run saas:export
```

7. registre horario, pasta e SHA256;
8. nao reabra o sistema local para operacao.

## Fase 5: criar usuarios reais

### Preparar arquivo local

Copie:

```powershell
Copy-Item `
  tools\saas\remote-users.example.json `
  tools\saas\remote-users.local.json
```

Edite `remote-users.local.json`:

- e-mail corporativo real;
- nome real;
- role correta;
- senha temporaria forte;
- salespersonId, quando aplicavel.

Roles permitidas:

```text
admin
supervisor
operador_interno
```

Vendedores externos continuam somente em `salespeople` e nao recebem login.

O arquivo local contem senhas e esta ignorado pelo Git.

### Configurar segredos apenas na sessao

```powershell
$env:FENIE_SUPABASE_URL = "https://<project-ref>.supabase.co"
$env:FENIE_SUPABASE_SERVICE_ROLE_KEY = Read-Host "Service role"
```

Feche o PowerShell ao terminar para remover as variaveis da sessao.

### Criar usuarios

```powershell
npm run saas:users -- `
  -UsersFile tools\saas\remote-users.local.json `
  -OutputMap backups\saas-migration\remote-user-map.json
```

O script:

- cria ou reutiliza o usuario Auth pelo e-mail;
- confirma o e-mail;
- cria o profile real;
- nao vincula salesperson antes da importacao;
- gera o mapa entre UUID local e UUID remoto;
- salva um mapa sem senhas.

Proteja a service role. A Admin API deve ser chamada apenas em ambiente seguro.

## Fase 6: importar os dados locais

### Connection string

No painel do Supabase, abra **Connect** e copie a Session pooler connection
string.

Defina apenas na sessao:

```powershell
$env:FENIE_REMOTE_DB_URL = Read-Host "Connection string remota"
```

### Preflight

O banco remoto deve possuir:

- migrations aplicadas;
- usuarios e profiles reais;
- nenhuma linha operacional.

Se houver dados de ensaio, recrie o projeto ou limpe-o por procedimento
controlado. Nao use `AllowNonEmptyTarget` sem backup e revisao tecnica.

### Importacao

```powershell
npm run saas:import -- `
  -PackageDirectory backups\saas-migration\fenie-saas-YYYYMMDD-HHMMSS `
  -UserMapFile backups\saas-migration\remote-user-map.json
```

O script:

1. confere o SHA256;
2. exige mapa para todos os profiles locais;
3. interrompe se encontrar dados operacionais remotos;
4. troca UUIDs locais pelos UUIDs reais;
5. importa dentro de transacao;
6. restaura os vinculos de salesperson dos profiles.

Nao execute a importacao duas vezes no mesmo projeto.

## Fase 7: validar banco e Auth antes da Vercel

Prepare um arquivo local de QA. Ele pode ser a copia de
`remote-users.local.json`, contendo apenas os usuarios que serao testados.

Defina:

```powershell
$env:FENIE_SUPABASE_URL = "https://<project-ref>.supabase.co"
$env:FENIE_SUPABASE_ANON_KEY = Read-Host "Anon key"
$env:FENIE_REMOTE_DB_URL = Read-Host "Connection string remota"
```

Execute:

```powershell
npm run saas:validate -- `
  -AppUrl https://<deploy-provisorio>.vercel.app `
  -ManifestPath backups\saas-migration\fenie-saas-YYYYMMDD-HHMMSS\manifest.json `
  -LoginFile tools\saas\remote-users.local.json
```

Se a Vercel ainda nao foi publicada, execute essa validacao depois da Fase 9.

O script valida:

- contagens das tabelas;
- clientes;
- itens atuais da carteira;
- importacoes publicadas;
- interacoes;
- follow-ups;
- pontos;
- login de cada usuario;
- profile e role;
- resposta RLS de clientes;
- endpoints do frontend.

O relatorio fica em:

```text
backups\saas-migration\qa-saas.json
```

## Fase 8: configurar a Vercel

### Projeto

1. Conecte o GitHub privado da Fenie.
2. Importe o repositorio.
3. Configure:

| Campo | Valor |
| --- | --- |
| Framework | Next.js |
| Root Directory | `frontend` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | deixar no padrao do Next.js |

O build atual executa:

```text
next build --webpack
```

### Variaveis

Em **Project Settings > Environment Variables**:

| Variavel | Production | Preview |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` | `Central de Carteira Fenie PRO` | igual |
| `NEXT_PUBLIC_APP_ENV` | `production` | `preview` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase producao | Supabase staging |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon producao | anon staging |
| `SUPABASE_SERVICE_ROLE_KEY` | service role producao | service role staging |

Se nao existir Supabase de staging:

- nao execute operacoes reais em Preview;
- nao forneca service role de producao ao Preview;
- considere limitar Preview somente a revisao visual;
- promova um deployment validado para producao.

Segredos ficam no painel da Vercel, nunca em `.env.production`.

## Fase 9: deploy do frontend

### Git integrado

Fluxo recomendado:

1. push da branch;
2. Preview Deployment;
3. smoke test visual;
4. merge na branch de producao;
5. Production Deployment;
6. validacao;
7. dominio definitivo.

### CLI opcional

```powershell
cd frontend
vercel link
vercel env pull .env.production.local --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

Nao deixe `.env.production.local` no Git.

## Fase 10: dominio ou subdominio

Sugestoes:

```text
carteira.fenie.com.br
crm.fenie.com.br
central.fenie.com.br
```

Procedimento:

1. Vercel > Project > Settings > Domains;
2. adicione o subdominio;
3. copie o registro DNS solicitado;
4. configure o CNAME no provedor DNS;
5. aguarde verificacao e HTTPS;
6. teste o certificado;
7. configure no Supabase:
   - Site URL;
   - Redirect URLs;
8. redeploy se alguma variavel de URL foi alterada.

Para subdominio, a Vercel normalmente solicita CNAME. Use sempre o valor
mostrado no painel, pois ele e a fonte correta para aquele projeto.

## Checklist de seguranca

### Contas administrativas

- [ ] Supabase pertence a organizacao Fenie.
- [ ] Vercel pertence ao time Fenie.
- [ ] GitHub privado.
- [ ] Dois proprietarios de contingencia.
- [ ] MFA obrigatoria.
- [ ] DNS protegido por MFA.

### Supabase

- [ ] SSL Enforcement ativo.
- [ ] Network Restrictions avaliadas.
- [ ] RLS ativa em todas as tabelas publicas.
- [ ] Migrations remotas conferidas.
- [ ] Cadastro publico desativado.
- [ ] SMTP configurado.
- [ ] Site URL usa HTTPS.
- [ ] Redirects limitados.
- [ ] Vendedor externo sem Auth.
- [ ] Profiles ativos somente para equipe.
- [ ] service role fora do browser.

### Vercel

- [ ] Variaveis separadas por ambiente.
- [ ] Preview nao altera producao.
- [ ] service role marcada como segredo.
- [ ] dominio HTTPS.
- [ ] logs sem chaves ou senhas.
- [ ] acesso ao projeto limitado.

### Dados

- [ ] Pacote local com SHA256.
- [ ] Backup local completo.
- [ ] Backup remoto apos importacao.
- [ ] Contagens iguais.
- [ ] Dados pessoais fora do Git.
- [ ] Arquivos temporarios protegidos.

## Backup seguro

### Checkpoint remoto

Depois da importacao e antes do go-live:

```powershell
$env:FENIE_REMOTE_DB_URL = Read-Host "Connection string remota"
npm run saas:backup-remote
```

O script cria:

```text
backups\saas-remote\remote-YYYYMMDD-HHMMSS
  roles.sql
  schema.sql
  data.sql
  manifest.json
```

Mantenha o backup fora do Git e em armazenamento corporativo criptografado.

### Rotina Supabase

- confirme a retencao de backups do plano contratado;
- use backups diarios do Dashboard;
- para RPO menor, avalie Point-in-Time Recovery;
- mantenha dump logico antes de migrations e importacoes grandes;
- teste restore periodicamente em projeto separado.

Planos e disponibilidade de download/PITR mudam. Confirme no Dashboard e na
documentacao vigente antes do go-live.

## Checklist de QA online

### Infraestrutura

- [ ] `/login` abre por HTTPS.
- [ ] certificado valido.
- [ ] sem mixed content.
- [ ] Supabase remoto responde.
- [ ] nenhuma URL `127.0.0.1` aparece no browser.
- [ ] nenhuma mensagem de fallback local/mock.

### Login e permissoes

- [ ] admin entra.
- [ ] supervisor entra.
- [ ] operador interno entra.
- [ ] profile e nome carregam.
- [ ] sidebar respeita role.
- [ ] operador nao acessa administracao.
- [ ] usuario inativo nao entra.
- [ ] vendedor externo nao possui login.
- [ ] logout funciona.
- [ ] sessao permanece apos atualizar.

### Dados

- [ ] clientes = manifest.
- [ ] carteira atual = manifest.
- [ ] ultima importacao publicada confere.
- [ ] vendedores conferem.
- [ ] interacoes conferem.
- [ ] follow-ups conferem.
- [ ] pontos conferem.
- [ ] campanha ativa confere.

### Modulos

- [ ] Carteira carrega dados reais.
- [ ] filtros funcionam.
- [ ] detalhe abre.
- [ ] registrar contato persiste.
- [ ] follow-up e criado.
- [ ] pontos sao gerados.
- [ ] Agenda carrega e reagenda.
- [ ] Dashboard mostra a carteira real.
- [ ] Relatorios usam o periodo correto.
- [ ] Calendario abre o cliente correto.
- [ ] Importacoes lista o historico.
- [ ] upload XLSX funciona.
- [ ] preview funciona.
- [ ] publicacao de importacao funciona.

### Desempenho

- [ ] Carteira grande carrega sem URL excessiva.
- [ ] Dashboard nao cai em mock.
- [ ] consultas nao estouram timeout da Vercel.
- [ ] upload respeita limite configurado.
- [ ] logs nao mostram erros RLS.

### Navegadores

- [ ] Chrome desktop.
- [ ] Edge desktop.
- [ ] notebook em resolucao de trabalho.
- [ ] mobile basico.
- [ ] rede externa a Fenie.

## Teste de importacao online

Antes do go-live, execute em staging:

1. login como admin;
2. abrir Importacoes;
3. baixar planilha modelo;
4. enviar planilha de teste;
5. validar cabecalho;
6. conferir validos, invalidos e duplicados;
7. abrir preview;
8. publicar;
9. conferir Carteira;
10. conferir Dashboard, Agenda, Relatorios e Calendario.

Em producao, a primeira importacao deve ser feita somente depois do checkpoint
remoto e com a planilha real aprovada.

## Plano de cutover

### D-7 a D-2

- criar projetos;
- aplicar migrations;
- configurar Auth;
- ensaiar exportacao e importacao;
- executar QA em staging;
- corrigir problemas;
- treinar responsaveis.

### D-1

- confirmar janela;
- confirmar backup;
- confirmar usuarios;
- confirmar dominio;
- confirmar rollback;
- comunicar equipe.

### Dia D

1. congelar servidor local;
2. backup local;
3. exportacao final;
4. criar/verificar usuarios reais;
5. importar dados;
6. validar contagens;
7. backup remoto;
8. deploy Vercel;
9. configurar dominio;
10. QA online;
11. liberar equipe.

### D+1 a D+7

- monitorar login;
- monitorar importacoes;
- monitorar persistencia;
- monitorar RLS;
- monitorar consultas lentas;
- coletar feedback;
- manter servidor local congelado.

## Plano de rollback

### Criterios para rollback

- login indisponivel para mais de um perfil;
- carteira incompleta;
- contagens divergentes;
- interacoes nao persistem;
- importacao corrompe dados;
- RLS permite acesso indevido;
- service role exposta;
- indisponibilidade prolongada.

### Rollback do frontend

Na Vercel:

1. abra Deployments;
2. selecione o ultimo deployment estavel;
3. use Instant Rollback ou Promote to Production;
4. valide `/login`.

Rollback de frontend nao desfaz mudancas no banco.

### Rollback durante a janela inicial

Se o SaaS ainda nao foi liberado:

1. mantenha Vercel bloqueada;
2. descarte ou recrie o projeto Supabase remoto;
3. preserve evidencias e logs;
4. reabra o servidor local:

```text
INICIAR_SERVIDOR_FENIE.bat
```

5. comunique a equipe;
6. reagende a migracao.

### Rollback depois de liberar usuarios

Depois que houver novas interacoes online, voltar ao banco local causa perda ou
reconciliacao manual.

Procedimento:

1. pausar operacao;
2. registrar horario do incidente;
3. gerar backup remoto;
4. avaliar rollback Vercel sem restaurar banco;
5. se necessario, restaurar backup/PITR do Supabase;
6. reconciliar dados criados apos o checkpoint;
7. somente voltar ao local com decisao executiva e plano de reconciliacao.

O Supabase e stateful. Rollback de dados exige considerar tudo que foi gravado
depois do backup.

## Desativacao do servidor local

Somente depois de pelo menos sete dias de operacao aprovada:

1. gerar backup local final;
2. gerar backup remoto;
3. registrar contagens finais;
4. guardar pacote de migracao;
5. remover o servidor local da rotina da equipe;
6. manter a copia somente para contingencia por prazo definido;
7. remover regras de firewall locais que nao forem mais necessarias;
8. documentar a data oficial de encerramento.

## Limitacoes atuais

- nao existe ambiente Supabase de staging criado automaticamente;
- criacao de usuarios exige service role em uma maquina administrativa;
- QA de telas continua incluindo validacao manual;
- exportacao Excel permanece futura;
- notificacoes automaticas permanecem fora do escopo;
- plano contratado de backup/PITR ainda precisa ser escolhido;
- a migracao nao deve ser executada sem credenciais e janela aprovadas.

## Referencias oficiais

- Supabase CLI e migrations:
  `https://supabase.com/docs/guides/deployment/database-migrations`
- Gerenciamento de ambientes:
  `https://supabase.com/docs/guides/deployment/managing-environments`
- Backup e restore:
  `https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore`
- Backups:
  `https://supabase.com/docs/guides/platform/backups`
- Checklist de producao:
  `https://supabase.com/docs/guides/deployment/going-into-prod`
- Redirect URLs:
  `https://supabase.com/docs/guides/auth/redirect-urls`
- Admin createUser:
  `https://supabase.com/docs/reference/javascript/auth-admin-createuser`
- Vercel Git:
  `https://vercel.com/docs/git`
- Variaveis Vercel:
  `https://vercel.com/docs/environment-variables`
- Dominios Vercel:
  `https://vercel.com/docs/domains/working-with-domains/add-a-domain`
- Rollback Vercel:
  `https://vercel.com/docs/instant-rollback`
