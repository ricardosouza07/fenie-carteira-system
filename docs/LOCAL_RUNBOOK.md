# Runbook Local

> Operacao recomendada: um unico PC servidor. Consulte
> `docs\SERVIDOR_LOCAL.md`. Os demais computadores acessam pelo navegador e nao
> executam estes comandos.

## Objetivo

Comandos de rotina para operar o sistema local em computadores Windows da Fenie.

Todos os comandos abaixo devem ser executados na raiz do projeto.

## Abrir o sistema com duplo clique

No uso diario, abra a pasta:

```text
C:\Projetos\fenie-carteira-system
```

Dê duplo clique em:

```text
INICIAR_SERVIDOR_FENIE.bat
```

O arquivo abaixo permanece como atalho compativel e chama o mesmo servidor:

```text
START_FENIE.bat
```

O script mostra mensagens simples:

- Iniciando Central de Carteira Fenié...
- Verificando Docker...
- Iniciando banco local...
- Iniciando sistema...
- Abrindo navegador...
- Sistema pronto.

No modo servidor, a porta `3000` e fixa para que o endereco salvo nos
computadores da equipe nao mude. Se ela estiver ocupada, o inicializador mostra
um erro e pede para liberar a porta.

## Criar atalho na area de trabalho

Dê duplo clique em:

```text
INSTALL_SHORTCUT.bat
```

O atalho criado chama:

```text
Central de Carteira Fenié
```

Ele aponta para `START_FENIE.bat`.

## Iniciar sistema no dia a dia

Opcao recomendada:

```text
INICIAR_SERVIDOR_FENIE.bat
```

Opcao manual:

1. Abrir Docker Desktop.
2. Aguardar o Docker ficar ativo.
3. Abrir PowerShell na raiz do projeto.
4. Iniciar Supabase:

```powershell
npm run supabase:start
```

5. Conferir status:

```powershell
npm run supabase:status
```

6. Iniciar frontend:

```powershell
npm run dev:local
```

7. Acessar:

```text
http://127.0.0.1:3000/login
```

Em rede local:

```text
http://IP-DA-MAQUINA:3000/login
```

## Parar sistema

Opcao recomendada:

```text
STOP_FENIE.bat
```

Opcao manual:

No terminal do frontend:

```powershell
Ctrl+C
```

Depois:

```powershell
npm run supabase:stop
```

## Ver status Supabase

```powershell
npm run supabase:status
```

Use esse comando para conferir:

- API URL.
- DB URL.
- Studio URL.
- anon key.
- service_role key.

## Resetar banco local

Use apenas quando quiser apagar os dados locais e recriar com migrations e seed.

Opcao recomendada com confirmacao:

```text
RESET_FENIE.bat
```

Opcao manual:

```powershell
npm run supabase:reset
```

Antes de resetar uma base em uso, rode:

```powershell
npm run backup:local
```

## Trocar porta do frontend

Se a porta `3000` estiver ocupada:

```powershell
npm --prefix frontend run dev -- --hostname 0.0.0.0 --port 3010
```

Acesse:

```text
http://127.0.0.1:3010/login
```

Se usar rede local:

```text
http://IP-DA-MAQUINA:3010/login
```

Tambem ajuste `backend/supabase/config.toml` se o login redirecionar para a porta antiga:

```toml
[auth]
site_url = "http://127.0.0.1:3010"
additional_redirect_urls = ["http://127.0.0.1:3010"]
```

Depois reinicie Supabase:

```powershell
npm run supabase:stop
npm run supabase:start
```

## Resolver porta ocupada

Verificar quem usa uma porta:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

Encontrar processo:

```powershell
Get-Process -Id <PID>
```

Encerrar processo, se tiver certeza:

```powershell
Stop-Process -Id <PID>
```

Portas comuns:

```text
3000  frontend
54321 Supabase API
54322 Postgres local
54323 Supabase Studio
54324 Inbucket
```

## Abrir Supabase Studio

Com Supabase rodando:

```text
http://127.0.0.1:54323
```

O Studio serve para verificar tabelas, Auth e dados locais.

## Atualizar dependencias

Quando receber uma nova copia do projeto ou apos limpeza:

```powershell
npm run install:frontend
```

## Verificar ambiente

Opcao por duplo clique:

```text
CHECK_FENIE.bat
```

Opcao manual:

```powershell
npm run doctor
```

Use depois de instalar, depois de trocar de computador ou quando algo nao abrir.

## Ordem recomendada apos ligar o computador

```text
START_FENIE.bat
```

Ordem manual equivalente:

```powershell
npm run supabase:start
npm run doctor
npm run dev:local
```

## Ordem recomendada antes de desligar

```text
STOP_FENIE.bat
```

Com backup manual antes de parar:

```powershell
npm run backup:local
npm run supabase:stop
```
