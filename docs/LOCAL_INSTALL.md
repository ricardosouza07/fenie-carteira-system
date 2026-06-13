# Instalacao Local Portatil

> Modelo atual da Fenie: instalar em apenas um PC servidor. Os computadores da
> equipe acessam pelo navegador e nao devem possuir bancos separados. Para a
> instalacao recomendada, siga `docs\SERVIDOR_LOCAL.md` e execute
> `INSTALAR_SERVIDOR_LOCAL.bat`.

## Objetivo

Este documento permanece como referencia tecnica. Para a operacao oficial,
rode o sistema no computador servidor da Fenie usando:

- Frontend Next.js local.
- Supabase local.
- Docker Desktop.
- Um unico banco local no PC servidor.

Este modo nao depende de Vercel nem de Supabase remoto.

## Visao geral

O computador escolhido vira a maquina principal do sistema local. Ele roda:

- App web em `http://127.0.0.1:3000`.
- Supabase API em `http://127.0.0.1:54321`.
- Banco Postgres local em `127.0.0.1:54322`.
- Supabase Studio em `http://127.0.0.1:54323`.

Para acesso por outros computadores da mesma rede, veja a secao "Modo rede local".

## Como abrir o sistema com duplo clique

Depois que a instalacao estiver pronta, o uso diario pode ser feito sem PowerShell:

1. Va ate:

```text
C:\Projetos\fenie-carteira-system
```

2. Dê duplo clique em:

```text
START_FENIE.bat
```

O inicializador faz automaticamente:

- verifica Docker;
- tenta abrir Docker Desktop se necessario;
- aguarda Docker ficar pronto;
- inicia Supabase local;
- inicia o frontend;
- detecta a porta usada pelo Next.js;
- abre o navegador em `/login`;
- mantem a janela aberta com logs.

Para criar um atalho na area de trabalho, dê duplo clique em:

```text
INSTALL_SHORTCUT.bat
```

Ele cria o atalho:

```text
Central de Carteira Fenié
```

Para parar o ambiente local, use:

```text
STOP_FENIE.bat
```

Para verificar o ambiente, use:

```text
CHECK_FENIE.bat
```

Para resetar o banco local com confirmacao, use:

```text
RESET_FENIE.bat
```

## 1. Instalar Node.js

1. Baixe o Node.js LTS em `https://nodejs.org`.
2. Instale mantendo a opcao de adicionar ao PATH.
3. Feche e abra o PowerShell.
4. Valide:

```powershell
node --version
npm --version
```

Se os comandos nao responderem, reinicie o computador ou reinstale o Node.js marcando a opcao de PATH.

## 2. Instalar Docker Desktop

1. Baixe o Docker Desktop em `https://www.docker.com/products/docker-desktop/`.
2. Instale usando WSL 2 quando solicitado.
3. Reinicie o Windows se o instalador pedir.
4. Abra o Docker Desktop e aguarde o status ficar ativo.
5. Valide:

```powershell
docker info
```

Se o Docker nao abrir, consulte `docs/TROUBLESHOOTING_LOCAL.md`.

## 3. Instalar ou usar Supabase CLI

O projeto ja possui um binario local em:

```text
tools/supabase-cli/supabase.exe
```

Os scripts do projeto usam esse arquivo primeiro. Se ele nao existir na copia recebida, instale a Supabase CLI globalmente e confirme:

```powershell
supabase --version
```

Se o binario local estiver incompleto, os scripts tentam usar a CLI global instalada via npm. Em caso de duvida, rode:

```text
CHECK_FENIE.bat
```

## 4. Copiar ou clonar o projeto

Coloque a pasta do projeto neste caminho local:

```text
C:\Projetos\fenie-carteira-system
```

Evite Google Drive, OneDrive e outras pastas sincronizadas para rodar o sistema. Node, npm, Next.js, `node_modules`, builds e uploads XLSX podem travar ou ficar lentos em pastas sincronizadas.

Recomendacao da Fenie:

```text
C:\Projetos
```

Abra o PowerShell na raiz do projeto:

```powershell
cd "C:\Projetos\fenie-carteira-system"
```

## 5. Instalar dependencias do frontend

Na raiz do projeto:

```powershell
npm run install:frontend
```

Alternativa manual:

```powershell
cd frontend
npm install
cd ..
```

## 6. Iniciar Supabase local

Com o Docker Desktop aberto:

```powershell
npm run supabase:start
```

Depois aplique migrations e seed local:

```powershell
npm run supabase:reset
```

Esse comando recria o banco local e aplica:

- migrations em `backend/supabase/migrations`
- seed em `backend/supabase/seed.sql`

## 7. Configurar frontend/.env.local

Copie o exemplo:

```powershell
Copy-Item frontend\.env.example frontend\.env.local
```

Rode:

```powershell
npm run supabase:status
```

Copie do status:

- API URL.
- anon key.
- service_role key.

Edite:

```powershell
notepad frontend\.env.local
```

Exemplo para uso somente neste computador:

```env
NEXT_PUBLIC_APP_NAME="Central de Carteira Fenie PRO"
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key-do-status>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key-do-status>"
```

## 8. Rodar o doctor

Antes de abrir o sistema:

```powershell
npm run doctor
```

Ou, por duplo clique:

```text
CHECK_FENIE.bat
```

O doctor valida:

- Node.js.
- npm.
- Docker rodando.
- Supabase CLI.
- `frontend/.env.local`.
- portas locais.
- resposta da API Supabase local.

## 9. Iniciar frontend

Na raiz:

```powershell
npm run dev:local
```

Acesse:

```text
http://127.0.0.1:3000/login
```

No uso diario, prefira `START_FENIE.bat`, que inicia Supabase, frontend e navegador automaticamente.

## 10. Usuarios locais do seed

Para teste local, o seed cria:

```text
admin@fenie.local / Admin@123456
supervisor@fenie.local / Supervisor@123456
laryssa.dias@fenie.local / Operador@123456
```

Esses usuarios sao apenas para ambiente local. Em uso real interno, altere ou recrie usuarios conforme a politica da Fenie.

## 11. Modo rede local

Use este modo quando outros computadores da mesma rede precisarem acessar a maquina principal.

### Descobrir IP da maquina principal

No computador que roda o sistema:

```powershell
ipconfig
```

Procure o IPv4 da rede atual, por exemplo:

```text
192.168.0.45
```

### Ajustar frontend/.env.local

No computador principal, troque a URL publica do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL="http://192.168.0.45:54321"
```

Isso e necessario porque o navegador dos outros computadores precisa acessar a API Supabase pelo IP da maquina principal.

### Ajustar Auth local

Edite `backend/supabase/config.toml` temporariamente para incluir o IP:

```toml
[auth]
site_url = "http://192.168.0.45:3000"
additional_redirect_urls = ["http://127.0.0.1:3000", "http://192.168.0.45:3000"]
```

Depois reinicie o Supabase:

```powershell
npm run supabase:stop
npm run supabase:start
```

Se precisar recriar o banco apos mudanca grande de config:

```powershell
npm run supabase:reset
```

### Iniciar frontend aceitando conexoes externas

O script padrao ja usa `--hostname 0.0.0.0`:

```powershell
npm run dev:local
```

Outros computadores devem acessar:

```text
http://IP-DA-MAQUINA:3000/login
```

Exemplo:

```text
http://192.168.0.45:3000/login
```

### Firewall Windows

Libere no Windows Defender Firewall:

- Node.js na porta `3000`.
- Supabase Auth/API na porta `54321` para acesso dos navegadores da equipe.

Nao libere `54322`, `54323` ou `54324` para a rede da equipe.

Mantenha todos os computadores na mesma rede Wi-Fi ou cabo.

## 12. Encerrar o sistema

No uso diario, dê duplo clique em:

```text
STOP_FENIE.bat
```

Para parar apenas o frontend, pressione `Ctrl+C` no PowerShell onde ele esta rodando.

Para parar Supabase:

```powershell
npm run supabase:stop
```

## 13. Validacao rapida

Depois de instalar:

```powershell
npm run typecheck
npm run lint
npm run build
```

Se tudo passar, a instalacao local esta pronta.
