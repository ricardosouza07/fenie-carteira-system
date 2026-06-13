# Deploy Vercel

> Para a migracao completa da base local, usuarios, QA e rollback, siga
> `docs\MIGRACAO_SAAS_INTERNO.md`.

## Objetivo

Publicar o frontend do sistema interno da Fenie na Vercel, conectado ao Supabase remoto de producao.

## Estrutura do projeto

O app Next.js fica em:

```text
frontend/
```

Na Vercel, configure:

| Campo | Valor |
| --- | --- |
| Framework preset | Next.js |
| Root Directory | `frontend` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Node.js | Versao padrao LTS da Vercel compativel com Next.js 16 |

O script de build do projeto ja executa:

```bash
next build --webpack
```

## Conectar GitHub

1. Suba o repositorio para o GitHub da Fenie.
2. Acesse Vercel.
3. Crie um novo projeto.
4. Importe o repositorio pelo GitHub.
5. Defina `frontend` como Root Directory.
6. Confirme o framework Next.js.
7. Configure as variaveis de ambiente antes do primeiro deploy de producao.
8. Rode o primeiro deploy.

## Variaveis de ambiente

Configure na Vercel em **Project Settings > Environment Variables**:

| Variavel | Ambiente | Observacao |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` | Production, Preview | Nome exibido no app. |
| `NEXT_PUBLIC_APP_ENV` | Production, Preview | Use `production` em producao e `preview` nos previews. |
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | URL do projeto Supabase correspondente. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Chave anon/publica do Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | Segredo server-side. Nunca expor no browser. |

Use `.env.production.example` como referencia. Nao commitar `.env.local`, `.env.production.local` ou chaves reais.

## Separacao local, preview e producao

Local:

- Usa `frontend/.env.local`.
- Normalmente aponta para Supabase local em `http://127.0.0.1:54321`.

Preview:

- Pode apontar para Supabase de staging, se existir.
- Se nao houver staging, evitar testar importacoes reais em Preview.

Production:

- Deve apontar somente para Supabase remoto de producao.
- Deve ter `SUPABASE_SERVICE_ROLE_KEY` restrita a Production.

## Dominio interno

Recomendacao:

- Usar um subdominio interno, por exemplo `carteira.fenie.com.br` ou `crm.fenie.com.br`.
- Configurar DNS conforme instrucoes da Vercel.
- Ativar HTTPS automatico.
- Validar que o dominio de producao esta listado nas configuracoes de Auth do Supabase.

## Supabase Auth e dominio

No Supabase remoto:

- Site URL: dominio de producao, por exemplo `https://carteira.fenie.com.br`.
- Redirect URLs: incluir o dominio de producao e, se necessario, URLs de Preview autorizadas.

Como o app usa login por e-mail e senha com cookies HTTP-only, o dominio correto e importante para manter sessao e redirecionamentos estaveis.

## Deploy via Git

Fluxo recomendado:

1. Abrir PR.
2. Validar Preview Deployment.
3. Rodar checklist de smoke test.
4. Fazer merge na branch principal.
5. Vercel publica producao automaticamente.

## Deploy manual opcional

Se for usar Vercel CLI:

```bash
cd frontend
vercel pull --yes --environment=production
npm ci
npm run build
vercel deploy --prebuilt --prod
```

## Rollback Vercel

Em caso de falha:

1. Abrir a lista de deployments do projeto na Vercel.
2. Selecionar o ultimo deployment estavel.
3. Usar **Promote to Production** ou rollback pelo painel.

Via CLI:

```bash
vercel rollback
```

## Smoke test apos deploy

1. Abrir `/login`.
2. Entrar como admin.
3. Confirmar acesso ao Dashboard.
4. Confirmar que a sidebar esta correta.
5. Abrir Carteira.
6. Abrir Importacoes.
7. Registrar contato em um cliente de teste.
8. Confirmar que nao aparece aviso de fallback local/mock em producao.

## Pontos de atencao

- `SUPABASE_SERVICE_ROLE_KEY` deve existir somente em ambiente server-side.
- Nunca usar chaves do Supabase local na Vercel.
- Nao ativar deploy de producao antes de aplicar migrations no Supabase remoto.
- Nao rodar importacao real sem backup/exportacao previa da carteira atual.
