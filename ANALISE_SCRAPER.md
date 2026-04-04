# Análise de Status dos Scrapers (OLX / Webmotors)
Atualizado em 2026-04-04

## Fontes ativas
- **OLX**: habilitada (mobile UA, viewport 412x915, suporte a storageState para sessão).
- **Webmotors**: habilitada (mobile UA, viewport 412x915).
- **Mercado Livre, iCarros, SóCarrão**: desabilitadas por padrão (baixa confiabilidade de contato/preço).

## Completude atual (após pós-processos recentes)
- Contato e preço sendo enriquecidos via `scripts/postprocess-contacts.ts`.
- Batches executados: vários lotes (batch=1 e batch=2) com sucesso para IDs 1366–1353.
- Card de completude no Dashboard mostra percentuais reais (preço/contato) e meta 95%.

## Fluxo recomendado
1) **Coleta rápida** (sem deep) para listar anúncios (OLX/Webmotors) com filtros.
2) **Pós-processamento** headless:
   - Script: `scripts/postprocess-contacts.ts`
   - Parâmetros típicos: `BATCH_SIZE=2 TIMEOUT_MS=90000`
   - Continua em lote até atingir ≥95% (toggle no Dashboard dispara automaticamente).
3) **Dashboard**: mostra totais, novos 24h, completude (preço/contato) e permite monitorar progresso.

## Tempos médios observados
- Coleta rápida (50 anúncios OLX): ~25–35 segundos headless.
- Pós-processamento batch=2 (timeout 90s por anúncio): ~3–4 minutos por execução (2 anúncios). Batch=1: ~1–2 minutos por execução.

## Login OLX
- Script `scripts/olxLogin.ts` salva sessão em `.wwebjs_auth/olx_state.json` (ou `OLX_STORAGE`).
- Scraper OLX carrega `storageState` e, se cair em login, aciona `onAuthNeeded` para você logar manualmente (headful) e salva a sessão.

## Pain points / próximos ajustes
- Webmotors deep scrape ainda não validado em lote (singleAd funciona; precisa rodar postprocess com URLs Webmotors reais).
- Headful/PWDEBUG travando; manter automação headless até estabilizar.
- Incluir batch/timeout configurável no toggle de pós-processo e gauge visual (donut).

## Comandos úteis
- Coleta (exemplo):  
  `SOURCES=olx,webmotors STATE=SP BRAND=Toyota MODEL=Corolla MIN_YEAR=2018 MAX_YEAR=2026 MAX_KM=120000 HEADFUL=false DEEP=false MAX_ADS=50 pnpm tsx scripts/sampleCollect.ts`
- Pós-processo:  
  `BATCH_SIZE=2 TIMEOUT_MS=90000 pnpm tsx scripts/postprocess-contacts.ts`
- Login OLX:  
  `OLX_EMAIL=... OLX_PASSWORD=... pnpm tsx scripts/olxLogin.ts`
