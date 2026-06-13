# Continuar o Desenvolvimento em Outro PC

## Objetivo

Este guia explica como preparar outro computador Windows para continuar o
desenvolvimento da Central de Carteira Fenie sem afetar o PC servidor usado pela
equipe.

O novo computador deve ter:

- uma copia do codigo-fonte;
- dependencias proprias;
- Docker Desktop proprio;
- Supabase local proprio;
- banco de desenvolvimento isolado;
- variaveis de ambiente locais;
- opcionalmente, uma copia controlada dos dados do servidor.

## Regra principal

O computador de desenvolvimento nao deve usar o banco do PC servidor.

No novo PC, nunca configure:

```env
NEXT_PUBLIC_SUPABASE_URL="http://IP-DO-SERVIDOR-FENIE:54321"
```

Use o Supabase que estiver rodando no proprio computador de desenvolvimento.
Isso evita que testes, resets, migrations e importacoes alterem os dados reais
da equipe.

## Visao geral

```text
PC servidor da Fenie
  - continua atendendo a equipe
  - possui o banco operacional
  - nao deve receber testes diretamente

Novo PC de desenvolvimento
  - recebe o codigo-fonte
  - possui banco local isolado
  - executa o frontend em localhost
  - valida as alteracoes antes de devolve-las ao servidor
```

## O que transferir

Transfira:

- `frontend\src`;
- `frontend\package.json`;
- `frontend\package-lock.json`;
- configuracoes do Next.js, TypeScript, Tailwind e ESLint;
- `backend\supabase\config.toml`;
- `backend\supabase\migrations`;
- `backend\supabase\seed.sql`;
- `tools\local`;
- scripts `.bat` da raiz;
- `docs`;
- `package.json` da raiz;
- arquivos `.env.example`.

Nao transfira como parte do codigo:

- `frontend\node_modules`;
- `frontend\.next`;
- `.local-runtime`;
- arquivos de log;
- `frontend\.env.local`;
- chaves reais;
- backups com dados reais em repositorio Git;
- volumes ou pastas internas do Docker.

As dependencias e o build devem ser recriados no novo computador.

## Opcao recomendada: Git privado

O melhor fluxo e manter o codigo em um repositorio Git privado.

Antes de enviar:

1. confirme que `.env.local`, backups, `node_modules` e `.next` estao ignorados;
2. confirme que `tools\local` e os scripts `.bat` estao versionados;
3. nao envie planilhas reais ou backups SQL;
4. faca commit apenas de codigo, migrations e documentacao;
5. envie a branch para o repositorio privado.

No novo computador:

```powershell
New-Item -ItemType Directory -Path C:\Projetos -Force
cd C:\Projetos
git clone <URL-DO-REPOSITORIO-PRIVADO> fenie-carteira-system
cd fenie-carteira-system
```

Se o projeto ainda nao estiver em um repositorio privado, crie um antes de
iniciar desenvolvimento frequente em dois computadores.

### Observacao sobre `tools`

O projeto precisa incluir os arquivos de `tools\local`. Se a configuracao Git
ignorar toda a pasta `tools`, ajuste o `.gitignore` para ignorar somente
binarios grandes ou locais, como:

```gitignore
tools/supabase-cli/
```

Os scripts PowerShell de `tools\local` devem permanecer versionados.

## Opcao sem Git: copia por pasta ou HD externo

No PC de origem, abra PowerShell e use:

```powershell
$origem = "C:\Projetos\fenie-carteira-system"
$destino = "D:\Transferencia\fenie-carteira-system"

robocopy $origem $destino /E `
  /XD "$origem\frontend\node_modules" `
      "$origem\frontend\.next" `
      "$origem\.local-runtime" `
      "$origem\backups" `
      "$origem\.git" `
  /XF ".env.local" "*.log"
```

Troque `D:\Transferencia` pela unidade do HD externo ou pasta de transferencia.

No novo PC, copie o resultado para:

```text
C:\Projetos\fenie-carteira-system
```

Nao desenvolva diretamente dentro de Google Drive, OneDrive, pendrive ou pasta
de rede. Node.js e Next.js podem travar ou ficar muito lentos nesses locais.

## Requisitos do novo PC

Instale:

1. Windows 10 ou Windows 11 atualizado;
2. Node.js LTS;
3. Docker Desktop com WSL 2;
4. Git, se usar repositorio;
5. VS Code ou outro editor;
6. Supabase CLI, caso os binarios locais nao estejam disponiveis.

Valide:

```powershell
node --version
npm --version
docker info
git --version
supabase --version
```

O comando `git` e opcional quando a transferencia for feita manualmente.

## Instalacao automatica no novo PC

Coloque o projeto em:

```text
C:\Projetos\fenie-carteira-system
```

Abra a pasta e execute:

```text
INSTALAR_SERVIDOR_LOCAL.bat
```

Na primeira instalacao:

1. digite `INSTALAR`;
2. aguarde Docker e Supabase iniciarem;
3. aguarde a instalacao das dependencias;
4. aguarde migrations e seed;
5. aguarde o build terminar.

Embora o nome mencione servidor, o instalador tambem prepara corretamente uma
base local isolada no computador de desenvolvimento.

Nao libere portas no Firewall para a equipe acessar esse computador. O ambiente
de desenvolvimento deve permanecer privado.

## Instalacao manual

Use esta opcao se quiser controlar cada etapa.

### 1. Instalar dependencias

```powershell
cd C:\Projetos\fenie-carteira-system
npm run install:frontend
```

### 2. Iniciar Supabase

Abra Docker Desktop e aguarde ficar pronto:

```powershell
npm run supabase:start
```

### 3. Criar banco limpo

Atencao: este comando apaga o banco local do novo PC.

```powershell
npm run supabase:reset
```

Ele aplica:

- migrations de `backend\supabase\migrations`;
- seed de `backend\supabase\seed.sql`;
- usuarios locais de desenvolvimento.

### 4. Configurar `.env.local`

Crie:

```powershell
Copy-Item frontend\.env.example frontend\.env.local
```

Confira as chaves:

```powershell
npm run supabase:status
```

O arquivo deve apontar para o Supabase do proprio PC:

```env
NEXT_PUBLIC_APP_NAME="Central de Carteira Fenie PRO"
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key-local>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key-local>"
```

Nunca envie esse arquivo ao Git.

### 5. Verificar ambiente

```powershell
npm run doctor
```

## Usuarios de desenvolvimento

Um banco criado pelo seed possui:

```text
admin@fenie.local / Admin@123456
supervisor@fenie.local / Supervisor@123456
laryssa.dias@fenie.local / Operador@123456
```

Essas credenciais sao apenas locais. Nao devem ser usadas como senhas reais de
producao.

## Iniciar o desenvolvimento

### Banco local

```powershell
npm run supabase:start
```

### Frontend com hot reload

Para acesso somente no novo PC:

```powershell
npm run dev:local:pc
```

Acesse:

```text
http://localhost:3000/login
```

Para testar em celular ou outro computador da rede:

```powershell
npm run dev:local
```

Use o IP do computador de desenvolvimento apenas durante o teste.

## Encerrar o ambiente de desenvolvimento

1. pressione `Ctrl+C` no terminal do frontend;
2. pare Supabase:

```powershell
npm run supabase:stop
```

Nao use `STOP_FENIE.bat` se houver outra instancia do projeto rodando no mesmo
computador que nao deva ser encerrada.

## Usar dados de teste

A opcao mais segura e:

1. usar seed;
2. importar uma planilha anonimizada;
3. criar interacoes e follow-ups de teste.

Evite usar nomes, telefones, e-mails e enderecos reais quando eles nao forem
necessarios para validar a funcionalidade.

## Levar uma copia dos dados do servidor

Faca isso somente quando um teste realmente exigir a base operacional.

### No PC servidor

Com Supabase rodando:

```powershell
cd C:\Projetos\fenie-carteira-system
npm run backup:local
```

O arquivo sera criado em:

```text
backups\local\fenie-local-YYYYMMDD-HHMMSS.sql
```

Copie apenas o arquivo SQL necessario usando armazenamento corporativo seguro
ou HD criptografado.

O backup contem dados pessoais, usuarios, clientes, interacoes e historico.
Nao envie por canal publico e nao coloque no Git.

### No novo PC

1. conclua a instalacao local;
2. inicie Supabase:

```powershell
npm run supabase:start
```

3. coloque o backup, por exemplo, em:

```text
C:\Projetos\fenie-carteira-system\backups\local
```

4. restaure:

```powershell
npm run restore:local -- -FilePath backups\local\fenie-local-YYYYMMDD-HHMMSS.sql
```

5. reinicie o frontend;
6. valide login, carteira, importacoes e dashboard;
7. exclua copias temporarias desnecessarias.

Essa restauracao afeta somente o banco do computador de desenvolvimento.

## Estrutura principal do projeto

```text
frontend/
  src/app/                  rotas Next.js
  src/components/           componentes compartilhados
  src/features/             modulos funcionais
  src/lib/supabase/         clientes e helpers Supabase

backend/supabase/
  migrations/               schema, indices, enums e RLS
  seed.sql                  dados iniciais
  config.toml               configuracao Supabase local

tools/local/                scripts de instalacao e operacao
docs/                       documentacao do produto e infraestrutura
```

Documentos recomendados antes de alterar o sistema:

1. `docs\PRD_COMPLETO.md`;
2. `docs\ARQUITETURA_SISTEMA.md`;
3. `docs\RLS_E_PERMISSOES.md`;
4. `docs\AUTH_SUPABASE.md`;
5. `docs\SERVIDOR_LOCAL.md`;
6. documentacao Supabase do modulo que sera alterado.

## Regras importantes do banco

- nao altere uma migration que ja foi aplicada no servidor;
- crie uma nova migration para cada mudanca de schema;
- use nomes ordenaveis por data e sequencia;
- teste `supabase db reset` somente no PC de desenvolvimento;
- valide RLS com os tres perfis internos;
- atualize `seed.sql` apenas quando o estado inicial precisar mudar;
- nunca execute reset no PC servidor sem backup e autorizacao.

Exemplo de nova migration:

```text
backend\supabase\migrations\202606090001_descricao_da_mudanca.sql
```

## Fluxo diario recomendado

Antes de trabalhar:

```powershell
cd C:\Projetos\fenie-carteira-system
npm run supabase:start
npm run dev:local:pc
```

Durante o desenvolvimento:

- mantenha mudancas pequenas e focadas;
- teste com admin, supervisor e operador interno quando houver permissoes;
- confira estados de loading, erro e vazio;
- teste com base grande quando alterar tabelas ou consultas;
- nao dependa de mock quando Supabase estiver conectado.

Ao finalizar:

```powershell
npm run typecheck
npm run lint
npm run build
```

Todos devem terminar sem erro.

## Checklist funcional antes de devolver uma alteracao

- login funciona;
- sidebar respeita o perfil;
- Carteira carrega a importacao publicada;
- detalhe do cliente abre;
- registro de contato persiste;
- follow-up persiste;
- Dashboard nao cai em mock indevidamente;
- Agenda, Relatorios e Calendario abrem;
- importacao XLSX continua funcionando;
- caracteres em portugues aparecem corretamente;
- nenhuma chave ou backup foi incluido no codigo;
- TypeScript, ESLint e build passaram.

## Devolver as alteracoes ao PC servidor

### Com Git

No PC de desenvolvimento:

```powershell
git status
git add <arquivos-alterados>
git commit -m "descricao objetiva da alteracao"
git push
```

No PC servidor, em horario de manutencao:

1. avise a equipe;
2. gere backup:

```powershell
npm run backup:local
```

3. pare o sistema:

```text
STOP_FENIE.bat
```

4. atualize o codigo com Git;
5. instale dependencias se `package-lock.json` mudou:

```powershell
npm run install:frontend
```

6. aplique apenas as novas migrations pelo procedimento tecnico definido;
7. gere o build:

```powershell
npm run build
```

8. inicie:

```text
INICIAR_SERVIDOR_FENIE.bat
```

9. execute o checklist funcional.

Nao execute `npm run supabase:reset` no servidor para aplicar uma atualizacao.
Reset apaga dados operacionais.

### Sem Git

Transfira apenas os arquivos modificados e documente:

- caminho de cada arquivo;
- motivo da alteracao;
- migration nova, se houver;
- comandos de instalacao;
- testes realizados;
- procedimento de rollback.

Antes de substituir arquivos no servidor, crie uma copia da versao atual e um
backup do banco.

## Rollback minimo

Se a atualizacao falhar:

1. pare o sistema;
2. restaure a versao anterior do codigo;
3. restaure o backup do banco somente se a migration alterou dados ou schema de
   forma incompativel;
4. gere novamente o build;
5. inicie o servidor;
6. valide login e carteira.

Nao improvise rollback de migration diretamente no banco operacional sem uma
copia de seguranca.

## Seguranca

- mantenha o repositorio privado;
- nao versione `.env.local`;
- nao versione backups SQL;
- nao versione planilhas reais;
- nao exponha o Supabase local na internet;
- nao reutilize senhas reais no ambiente de desenvolvimento;
- proteja copias da base com dados pessoais;
- apague backups temporarios quando o teste terminar.

## Informacoes para entregar a outro desenvolvedor ou ao Codex

Ao continuar o trabalho em outro PC, informe:

- caminho do projeto: `C:\Projetos\fenie-carteira-system`;
- objetivo da alteracao;
- tela ou modulo afetado;
- se Supabase local esta rodando;
- se esta usando seed ou backup restaurado;
- erro observado e passos para reproduzir;
- validacoes esperadas;
- arquivos que nao devem ser alterados;
- estado atual do Git, quando aplicavel.

Peça sempre que a implementacao termine com:

```text
tsc --noEmit
eslint
next build --webpack
```

No projeto, os comandos equivalentes sao:

```powershell
npm run typecheck
npm run lint
npm run build
```

## Checklist rapido de transferencia

No PC atual:

- [ ] codigo atualizado;
- [ ] `.env.local` excluido da transferencia;
- [ ] `node_modules` e `.next` excluidos;
- [ ] backup criado, se necessario;
- [ ] backup armazenado separadamente e com seguranca;
- [ ] scripts de `tools\local` incluidos;
- [ ] migrations e seed incluidos.

No novo PC:

- [ ] projeto em `C:\Projetos`;
- [ ] Node.js instalado;
- [ ] Docker Desktop instalado e ativo;
- [ ] dependencias instaladas;
- [ ] Supabase local iniciado;
- [ ] banco criado ou backup restaurado;
- [ ] `.env.local` aponta para o proprio PC;
- [ ] login local validado;
- [ ] `npm run doctor` aprovado;
- [ ] TypeScript, ESLint e build aprovados.

## Resultado esperado

Ao final, o novo computador deve conseguir:

- abrir `http://localhost:3000/login`;
- autenticar com usuario local;
- carregar dados do Supabase local;
- executar e testar alteracoes sem afetar a equipe;
- gerar migrations e builds;
- entregar uma atualizacao validada para o PC servidor.
