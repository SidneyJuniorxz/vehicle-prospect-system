# Setup de Agentes e MCP (Projeto)

Este projeto foi padronizado para operar com coleta, pos-processamento e dashboard em ambiente local.

## 1) Comandos principais

- Instalar dependencias: `pnpm install`
- Rodar sistema: `pnpm dev`
- Diagnosticar ambiente (porta, DB, dev): `pnpm tsx scripts/diagnose-dev.ts`
- Rodar pos-processamento manual:
  - `BATCH_SIZE=2 TIMEOUT_MS=90000 POSTPROCESS_PRIORITY=normal pnpm tsx scripts/postprocess-contacts.ts`

## 2) Prioridade do pos-processamento

Valores aceitos em `POSTPROCESS_PRIORITY`:

- `high`: prioriza anuncios mais recentes
- `normal`: prioriza faltas criticas (sem preco e sem contato)
- `low`: processa dos mais antigos para os mais novos

## 3) MCP sugerido para desenvolvimento

Arquivo exemplo: `.mcp.servers.example.json`.

Servidores sugeridos:

- `filesystem`: leitura/escrita local do projeto
- `postgres`: consulta e validacao do banco
- `playwright`: debug de scraping e interface em navegador real

## 4) Fluxo recomendado para evolucao

1. Rodar `pnpm tsx scripts/diagnose-dev.ts`.
2. Abrir dashboard e validar card de completude.
3. Executar busca real curta (1-2 links) quando houver alteracao no scraper.
4. Confirmar evolucao de `% preco` e `% contato` no card de completude.
5. Somente depois subir batch maior.
