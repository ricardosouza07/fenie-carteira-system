# Troubleshooting Local

> Para o modelo com um unico PC servidor, consulte tambem
> `docs\SERVIDOR_LOCAL.md`.

## Objetivo

Resolver problemas comuns ao rodar o sistema local em Windows com Docker e Supabase local.

## Diagnostico inicial

Na raiz do projeto:

```text
CHECK_FENIE.bat
```

Ou manualmente:

```powershell
npm run doctor
```

Leia os itens marcados como `[ERRO]` e siga a secao correspondente abaixo.

## Docker nao abre

Sintomas:

- Docker Desktop fica carregando.
- `docker info` falha.
- Supabase nao inicia.

Solucoes:

1. Abra o Docker Desktop manualmente.
2. Aguarde o status ficar ativo.
3. Reinicie o Windows.
4. Confirme que WSL 2 esta instalado.
5. Rode:

```powershell
wsl --status
```

6. Se necessario, atualize WSL:

```powershell
wsl --update
```

Depois tente:

```text
START_FENIE.bat
```

Ou manualmente:

```powershell
npm run supabase:start
```

## Supabase start trava

Sintomas:

- `npm run supabase:start` fica parado.
- Download de imagens Docker demora.
- Containers nao sobem.

Solucoes:

1. Confirme internet na primeira execucao.
2. Abra Docker Desktop e veja se ha erro.
3. Rode:

```powershell
npm run supabase:stop
npm run supabase:start
```

4. Veja status:

```powershell
npm run supabase:status
```

5. Se continuar travado, reinicie o Docker Desktop.

## Supabase CLI informa supabase-go ausente

Sintoma:

```text
Could not find the supabase-go binary
```

Causa comum:

- `tools/supabase-cli/supabase.exe` foi copiado sem o `supabase-go.exe`.

O projeto tenta usar a CLI global instalada via npm quando o binario local esta incompleto. Valide com:

```text
CHECK_FENIE.bat
```

Se o CHECK nao encontrar a CLI, instale:

```powershell
npm install -g supabase
```

## Porta ocupada

Sintomas:

- Frontend nao inicia na porta 3000.
- Supabase informa conflito em 54321, 54322, 54323 ou 54324.

O `START_FENIE.bat` detecta quando o Next.js usa uma porta alternativa e abre o navegador na porta correta.

Verificar porta:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

Trocar porta do frontend:

```powershell
npm --prefix frontend run dev -- --hostname 0.0.0.0 --port 3010
```

Para portas do Supabase, pare o processo conflitante ou altere `backend/supabase/config.toml` com cuidado.

## Erro no login

Possiveis causas:

- Supabase local nao esta rodando.
- `.env.local` aponta para URL errada.
- anon key ou service_role key estao com placeholder.
- Seed nao foi aplicado.
- Auth redirect nao permite a URL atual.

Passos:

```text
CHECK_FENIE.bat
```

Ou manualmente:

```powershell
npm run supabase:status
npm run doctor
```

Confira `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key-real>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key-real>"
```

Se estiver em rede local, use o IP da maquina principal em vez de `127.0.0.1`:

```env
NEXT_PUBLIC_SUPABASE_URL="http://IP-DA-MAQUINA:54321"
```

Se os usuarios do seed nao existem:

```powershell
npm run supabase:reset
```

## Banco vazio

Sintomas:

- Carteira vazia.
- Dashboard sem dados.
- Importacoes nao aparecem.

Possiveis causas:

- Banco foi resetado.
- Ainda nao houve importacao publicada.
- App esta apontando para outro Supabase.

Passos:

1. Abrir Supabase Studio:

```text
http://127.0.0.1:54323
```

2. Verificar tabelas:

```text
portfolio_imports
customers
portfolio_items
```

3. Conferir `.env.local`.
4. Publicar uma importacao pela tela `/importacoes`.

## Importacao nao aparece

Possiveis causas:

- Importacao ficou como rascunho/validada, mas nao publicada.
- Erro na gravacao com Supabase.
- Usuario sem permissao para importar.
- Browser ainda esta com estado antigo.

Passos:

1. Atualize a pagina.
2. Veja a lista em `/importacoes`.
3. Confira se o status esta `published`.
4. Abra Supabase Studio e verifique `portfolio_imports`.
5. Rode:

```powershell
npm run doctor
```

## .env.local errado

Sintomas:

- Login falha.
- Dados nao salvam.
- App entra em modo mock/local sem querer.

Recrie:

```powershell
Remove-Item frontend\.env.local
Copy-Item frontend\.env.example frontend\.env.local
npm run supabase:status
notepad frontend\.env.local
```

Preencha novamente as chaves reais exibidas pelo status.

## node_modules corrompido

Sintomas:

- Build nao encontra modulo.
- `npm install` falha.
- Next.js nao inicia.

Reinstalar dependencias:

```powershell
Remove-Item frontend\node_modules -Recurse -Force
Remove-Item frontend\package-lock.json -Force
npm run install:frontend
```

Se o projeto estiver em pasta sincronizada, pause a sincronizacao durante a instalacao.

Evite rodar o sistema dentro de Google Drive ou OneDrive. Use:

```text
C:\Projetos\fenie-carteira-system
```

Node, npm e Next.js podem travar em pastas sincronizadas.

## Atalho nao abre

Sintomas:

- Duplo clique no atalho nao inicia o sistema.
- A janela abre e fecha rapidamente.

Passos:

1. Abra a pasta:

```text
C:\Projetos\fenie-carteira-system
```

2. Dê duplo clique em:

```text
CHECK_FENIE.bat
```

3. Se o projeto estiver em outro caminho, copie para `C:\Projetos\fenie-carteira-system`.
4. Recrie o atalho:

```text
INSTALL_SHORTCUT.bat
```

## START_FENIE fica aguardando Docker

Sintomas:

- A mensagem "Verificando Docker..." fica por muito tempo.
- Docker Desktop nao termina de iniciar.

Passos:

1. Abra Docker Desktop manualmente.
2. Aguarde ficar ativo.
3. Rode:

```text
CHECK_FENIE.bat
```

4. Se Docker continuar indisponivel, reinicie o Windows.

## Janela de logs foi fechada

Se a janela do `START_FENIE.bat` for fechada, o frontend pode continuar rodando em segundo plano.

Para encerrar corretamente:

```text
STOP_FENIE.bat
```

## Frontend abre, mas outro computador nao acessa

Verifique:

1. Os computadores estao na mesma rede.
2. O frontend foi iniciado com:

```powershell
npm run dev:local
```

3. O acesso esta usando:

```text
http://IP-DA-MAQUINA:3000/login
```

4. Firewall Windows liberou Node.js/porta 3000.
5. `frontend/.env.local` usa:

```env
NEXT_PUBLIC_SUPABASE_URL="http://IP-DA-MAQUINA:54321"
```

6. Firewall tambem liberou a porta `54321`.

Na arquitetura atual, as portas de rede necessarias sao:

```text
3000  frontend
54321 Supabase Auth e API usados pelo navegador
```

Nao libere `54322`, `54323` ou `54324` para os computadores da equipe.

Se o IP do servidor mudou, a URL salva nos favoritos e o arquivo
`frontend\.env.local` podem estar desatualizados. Reserve o IP no roteador antes
de iniciar o uso operacional.

## Supabase Studio nao abre

Com Supabase rodando, tente:

```text
http://127.0.0.1:54323
```

Se nao abrir:

```powershell
npm run supabase:status
npm run supabase:stop
npm run supabase:start
```

## Quando pedir ajuda tecnica

Anote:

- erro exibido;
- comando executado;
- horario;
- print da tela;
- resultado de `npm run doctor`;
- se esta em modo somente PC ou rede local.
