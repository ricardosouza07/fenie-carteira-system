# Servidor Local da Central de Carteira Fenie

## Objetivo

O sistema deve ser instalado em apenas um computador principal da Fenie.

Esse computador funciona como servidor interno e executa:

- frontend Next.js;
- Supabase local;
- banco PostgreSQL do Supabase;
- Docker Desktop;
- backups da base operacional.

Os demais computadores da equipe nao instalam Node.js, Docker, Supabase ou banco.
Eles acessam o sistema pelo navegador usando o IP do PC servidor.

## Arquitetura

```text
PC servidor Fenie
  - Frontend: http://IP-DO-SERVIDOR:3000
  - Supabase API/Auth: http://IP-DO-SERVIDOR:54321
  - PostgreSQL: somente no servidor
  - Supabase Studio: somente no servidor

Computadores da equipe
  - Navegador
  - Mesmo Wi-Fi ou rede cabeada
  - Nenhuma instalacao local do sistema
```

Todos os usuarios trabalham no mesmo banco. Nao crie uma instalacao ou banco
separado em cada computador.

## Requisitos do PC servidor

- Windows 10 ou Windows 11 atualizado;
- Node.js LTS;
- Docker Desktop com WSL 2;
- Supabase CLI, global ou incluida em `tools\supabase-cli`;
- pelo menos 8 GB de RAM, com 16 GB recomendado;
- espaco livre para Docker, banco e backups;
- conexao cabeada recomendada;
- IP reservado no roteador ou IP fixo;
- suspensao automatica desativada durante o expediente.

O projeto deve ficar em:

```text
C:\Projetos\fenie-carteira-system
```

Nao execute o servidor dentro de Google Drive, OneDrive ou outra pasta
sincronizada. Node.js, Next.js, Docker, uploads e `node_modules` podem ficar
instaveis nessas pastas.

## Instalacao inicial

1. Instale Node.js LTS.
2. Instale e abra Docker Desktop.
3. Copie o projeto para:

```text
C:\Projetos\fenie-carteira-system
```

4. Dê duplo clique em:

```text
INSTALAR_SERVIDOR_LOCAL.bat
```

5. Digite `INSTALAR` para confirmar.

O instalador:

- valida Node.js e npm;
- valida e inicia Docker Desktop;
- instala as dependencias do frontend;
- detecta o IPv4 da rede local;
- configura redirects do Supabase Auth;
- inicia Supabase local;
- aplica migrations e seed;
- cria `frontend\.env.local`;
- gera o build de producao do Next.js;
- cria o atalho `Central de Carteira Fenie`.

Na primeira instalacao, o instalador executa `supabase db reset` para aplicar
migrations e seed. Se detectar uma instalacao existente, ele pergunta se deve
preservar o banco. Digite `RESETAR` somente quando quiser apagar os dados
operacionais e recriar a base.

## Iniciar o servidor no dia a dia

Dê duplo clique em:

```text
INICIAR_SERVIDOR_FENIE.bat
```

O atalho antigo `START_FENIE.bat` continua funcionando e inicia o mesmo modo
servidor.

O inicializador:

- valida ou abre Docker Desktop;
- inicia Supabase local;
- inicia o build de producao do Next.js em `0.0.0.0:3000`;
- abre o sistema no navegador do servidor;
- exibe a URL local e a URL para a equipe;
- mantem uma janela com os logs do frontend.

Exemplo:

```text
Neste computador: http://localhost:3000/login
Na rede local:    http://192.168.15.33:3000/login
```

O PC servidor deve permanecer ligado, conectado a rede e sem entrar em
suspensao enquanto a equipe estiver usando o sistema.

## Acesso da equipe

Nos outros computadores:

1. Conecte o computador a mesma rede Wi-Fi ou cabeada do servidor.
2. Abra Chrome ou Edge.
3. Acesse a URL exibida pelo inicializador:

```text
http://IP-DO-SERVIDOR:3000/login
```

Exemplo:

```text
http://192.168.15.33:3000/login
```

Recomenda-se salvar essa URL nos favoritos.

## IP do servidor

O ideal e reservar o IPv4 do PC servidor no roteador. Assim a equipe usa sempre
o mesmo endereco.

Para conferir o IP:

```powershell
ipconfig
```

Se o IP mudar, execute novamente:

```text
INSTALAR_SERVIDOR_LOCAL.bat
```

Isso atualiza `.env.local` e os redirects locais. O instalador reseta o banco
apenas quando `RESETAR` for digitado. Em uma instalacao em uso, escolha
preservar o banco. Mesmo assim, faca backup antes. Como alternativa, um
responsavel tecnico pode atualizar manualmente:

- `frontend\.env.local`;
- `backend\supabase\config.toml`.

Por esse motivo, reservar o IP antes do inicio do piloto e a opcao recomendada.

## Firewall Windows

Defina a rede do Windows como `Privada`.

Abra PowerShell como Administrador no PC servidor e libere o frontend:

```powershell
New-NetFirewallRule -DisplayName "Fenie Frontend 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Private
```

### Porta 54321

Na arquitetura atual, o navegador usa Supabase Auth e a API Supabase
diretamente. Por isso, para os demais computadores, a porta `54321` tambem e
necessaria:

```powershell
New-NetFirewallRule -DisplayName "Fenie Supabase API 54321" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 54321 -Profile Private
```

Restrinja as regras ao perfil `Private` e, se possivel, a sub-rede interna da
Fenie.

Nao libere para a rede:

- `54322`: PostgreSQL;
- `54323`: Supabase Studio;
- `54324`: e-mails locais de desenvolvimento.

O objetivo futuro e expor apenas o frontend. Isso exigira mover toda comunicacao
do navegador com o Supabase para rotas server-side antes de fechar a porta
`54321`.

## Validacao apos instalar

No PC servidor:

```text
CHECK_FENIE.bat
```

Depois valide:

1. login no servidor por `http://localhost:3000/login`;
2. login em outro computador por `http://IP-DO-SERVIDOR:3000/login`;
3. abertura da Carteira;
4. abertura do detalhe de cliente;
5. registro de contato;
6. importacao de uma planilha de teste;
7. persistencia dos dados apos atualizar a pagina.

## Parar o ambiente

Use:

```text
STOP_FENIE.bat
```

O script encerra o frontend e os containers locais do Supabase.

Antes de desligar definitivamente o servidor, recomenda-se criar backup:

```powershell
npm run backup:local
```

Consulte `docs\BACKUP_RESTORE.md`.

## Rotina recomendada

Inicio do expediente:

1. ligar o PC servidor;
2. aguardar a rede conectar;
3. executar `INICIAR_SERVIDOR_FENIE.bat`;
4. confirmar as duas URLs exibidas;
5. manter a janela de logs aberta.

Fim do expediente:

1. garantir que nao ha importacao em andamento;
2. executar o backup conforme a rotina definida;
3. executar `STOP_FENIE.bat`;
4. desligar o computador somente depois da parada.

## Seguranca minima

- nao compartilhe `SUPABASE_SERVICE_ROLE_KEY`;
- nao envie o arquivo `frontend\.env.local`;
- mantenha o Firewall no perfil privado;
- nao exponha as portas do servidor diretamente na internet;
- mantenha usuarios individuais no sistema;
- desative contas que nao fazem mais parte da equipe;
- proteja a conta Windows do PC servidor com senha;
- restrinja acesso ao Supabase Studio ao responsavel tecnico.

## Desenvolvimento em outro computador

Para preparar um computador separado, manter uma base isolada e devolver
alteracoes com seguranca, consulte:

```text
docs\CONTINUAR_DESENVOLVIMENTO_OUTRO_PC.md
```

## Futuro: migracao para Supabase remoto + Vercel

O runbook executavel da migracao esta em:

```text
docs\MIGRACAO_SAAS_INTERNO.md
```

Quando a Fenie decidir mover o sistema para SaaS:

1. criar um projeto Supabase remoto na regiao adequada;
2. aplicar as migrations no banco remoto;
3. migrar clientes, interacoes, follow-ups, pontos e usuarios;
4. configurar variaveis de producao na Vercel;
5. publicar o frontend Next.js;
6. configurar dominio HTTPS;
7. validar RLS, Auth, importacoes e backups remotos;
8. executar um periodo de operacao paralela;
9. congelar a base local e realizar a migracao final;
10. manter o backup local apenas como historico controlado.

As regras de negocio e o modelo de dados atuais foram mantidos para facilitar
essa migracao. A mudanca principal sera de infraestrutura, URLs e operacao.
