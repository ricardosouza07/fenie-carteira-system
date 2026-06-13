# Backup e Restore Local

## Objetivo

Preservar os dados do banco local do Supabase usado pela equipe interna da Fenie.

Backups locais sao especialmente importantes antes de:

- importar nova carteira;
- resetar banco;
- atualizar projeto;
- trocar de computador;
- fazer treinamento com dados reais.

## Onde os backups sao salvos

O script padrao salva em:

```text
backups/local
```

Essa pasta esta ignorada pelo Git. Ela deve ser copiada para um local seguro, como:

- pasta interna da Fenie;
- HD externo;
- Google Drive/OneDrive corporativo;
- servidor de arquivos.

Evite deixar o unico backup no mesmo computador que roda o sistema.

## Fazer backup local

Com Docker e Supabase local rodando:

```powershell
npm run backup:local
```

O arquivo gerado segue o padrao:

```text
backups/local/fenie-local-YYYYMMDD-HHMMSS.sql
```

Exemplo:

```text
backups/local/fenie-local-20260602-181500.sql
```

## Conferir backup

Depois de gerar:

```powershell
Get-ChildItem backups\local
```

Um backup valido normalmente tem tamanho maior que zero e foi criado no horario esperado.

## Restaurar backup local

Atencao: restore pode substituir dados atuais do banco local.

1. Pare o uso pela equipe.
2. Faca um backup do estado atual, se ainda for possivel:

```powershell
npm run backup:local
```

3. Restaure o arquivo desejado:

```powershell
npm run restore:local -- -FilePath backups\local\fenie-local-YYYYMMDD-HHMMSS.sql
```

4. Reinicie o frontend se ele estiver aberto.
5. Valide login, carteira e importacoes.

## Reset completo com seed

Use apenas para voltar ao estado inicial de desenvolvimento/local:

```powershell
npm run supabase:reset
```

Esse comando recria o banco com migrations e seed, apagando dados locais atuais.

## Rotina recomendada

### Diaria

No fim do expediente, se houve uso real:

```powershell
npm run backup:local
```

Copie o arquivo para uma pasta segura.

### Semanal

1. Gerar backup.
2. Copiar para armazenamento externo ou nuvem corporativa.
3. Manter pelo menos quatro backups semanais.
4. Apagar backups antigos apenas depois de confirmar que ha copia externa.

### Antes de importacao

Sempre gerar backup:

```powershell
npm run backup:local
```

Depois importar e publicar a planilha.

Se a importacao estiver errada, restaure o backup anterior ou publique uma nova importacao corrigida, conforme o impacto.

## O que o backup cobre

O backup cobre o banco Postgres local, incluindo:

- usuarios Auth locais;
- profiles;
- clientes;
- contatos;
- importacoes;
- carteira;
- interacoes;
- follow-ups;
- pontuacao;
- campanhas.

O backup nao cobre arquivos externos que nao estejam no banco.

## Teste periodico de restore

Uma vez por mes, em uma maquina de teste:

1. Instale o projeto.
2. Inicie Supabase.
3. Restaure um backup recente.
4. Verifique login, carteira e dashboard.

Isso garante que a rotina de backup realmente funciona.
