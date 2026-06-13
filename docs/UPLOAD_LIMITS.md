# Limites de Upload XLSX

## Objetivo

Permitir importacao de planilhas grandes da carteira Fenie no ambiente local, evitando o erro:

```text
Body exceeded 1 MB limit
```

## Limite atual

O limite operacional do MVP e:

```text
10 MB por arquivo XLSX/XLS
```

Esse limite vale para:

- selecao do arquivo na tela de Importacoes;
- payload de publicacao enviado ao backend local;
- Server Actions usadas como suporte.

## Onde esta configurado

### Next.js Server Actions

Arquivo:

```text
frontend/next.config.ts
```

Configuracao:

```ts
experimental: {
  serverActions: {
    bodySizeLimit: "10mb",
  },
}
```

O Next.js usa limite padrao de 1 MB para Server Actions. Por isso, mesmo quando o XLSX era lido no navegador, a publicacao da importacao podia falhar ao enviar muitas linhas normalizadas para o servidor.

### Limite compartilhado da importacao

Arquivo:

```text
frontend/src/features/importacoes/upload-limits.ts
```

Valores:

```ts
IMPORT_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024
IMPORT_UPLOAD_LIMIT_LABEL = "10 MB"
```

### Route Handler de publicacao

Arquivo:

```text
frontend/src/app/api/importacoes/publicar/route.ts
```

A publicacao real usa:

```text
POST /api/importacoes/publicar
```

Esse endpoint evita depender do limite padrao das Server Actions para planilhas grandes.

## Fluxo atual

1. Usuario seleciona XLSX em `/importacoes`.
2. O navegador valida o tamanho do arquivo.
3. O parser XLSX le a primeira aba no client.
4. A tela mostra validacao e preview.
5. Ao publicar, o frontend envia o resultado normalizado para `/api/importacoes/publicar`.
6. A rota grava importacao, linhas, clientes, contatos, vendedores e carteira no Supabase local.

## Feedback visual

Durante a leitura:

```text
Processando planilha...
```

Durante a publicacao:

```text
Publicando no banco...
```

Se o arquivo ou payload passar do limite:

```text
Arquivo acima do limite de 10 MB...
```

## Ambiente local

Para uso local em Windows, mantenha o projeto fora de Google Drive/OneDrive:

```text
C:\Projetos\fenie-carteira-system
```

Pastas sincronizadas podem travar `node_modules`, `.next`, builds e processamento de arquivos grandes.

## Como aumentar no futuro

Se a carteira real ultrapassar 10 MB com frequencia:

1. Aumentar `IMPORT_UPLOAD_LIMIT_BYTES` e `IMPORT_UPLOAD_LIMIT_LABEL`.
2. Atualizar `serverActions.bodySizeLimit` no `next.config.ts`.
3. Testar importacao, preview e publicacao com a maior planilha real.
4. Avaliar processamento em streaming ou upload direto para Storage se os arquivos passarem de 20-30 MB.

## Validacao recomendada

```powershell
npm run typecheck
npm run lint
npm run build
```

Teste funcional:

1. Abrir `/importacoes`.
2. Selecionar a planilha real da carteira.
3. Confirmar que aparece `Processando planilha...`.
4. Conferir validacao de colunas.
5. Abrir preview.
6. Publicar.
7. Conferir a importacao publicada e a Carteira atualizada.
