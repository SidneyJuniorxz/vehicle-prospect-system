# AGENTS.md

## Projeto
Vehicle Prospect System (Node/TypeScript, tRPC, Drizzle, PostgreSQL, scraping com Playwright).

## Objetivo operacional
- Coletar anuncios reais (OLX/Webmotors)
- Aumentar completude de preco + contato ate 95%
- Exibir evolucao no dashboard em tempo real

## Setup rapido
1. `pnpm install`
2. `pnpm check`
3. `pnpm tsx scripts/diagnose-dev.ts`
4. `pnpm dev`

## Docker Linux
- `docker compose up -d --build`
- App em `http://localhost:3000`

## Comandos criticos
- Diagnostico: `pnpm tsx scripts/diagnose-dev.ts`
- Pos-processo manual:
  - `BATCH_SIZE=2 TIMEOUT_MS=90000 POSTPROCESS_PRIORITY=normal pnpm tsx scripts/postprocess-contacts.ts`

## Convencoes de evolucao
- Sempre validar com dados reais (sem mock)
- Se completude <95%, manter pos-processamento ativo
- Prioridade do pos-processo:
  - `high`: mais recente primeiro
  - `normal`: faltas criticas primeiro
  - `low`: backlog historico primeiro

## Arquivos-chave
- `client/src/pages/Dashboard.tsx`
- `server/routers/dashboardRouter.ts`
- `scripts/postprocess-contacts.ts`
- `scripts/diagnose-dev.ts`
- `server/scrapers/sources/olxScraper.ts`
- `server/scrapers/sources/webmotorsScraper.ts`
